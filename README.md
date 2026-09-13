# The "Shodh-a-Code" Contest Platform
**AI Engineer Intern Take-Home Submission**

[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2016-black?logo=next.js)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/Backend-NestJS-E0234E?logo=nestjs)](https://nestjs.com/)
[![FastAPI](https://img.shields.io/badge/AI%20Layer-FastAPI-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Docker](https://img.shields.io/badge/Judge-Docker%20Sandboxes-2496ED?logo=docker)](https://www.docker.com/)
[![Kùzu](https://img.shields.io/badge/Knowledge%20Graph-Kùzu%20DB-purple)](https://kuzudb.com/)
[![Groq](https://img.shields.io/badge/LLM-Groq%20Llama%203.3%2070B-orange)](https://groq.com/)

A full-stack, containerized coding contest platform featuring an authoritative asynchronous judging engine, multi-language sandbox execution, and an evidence-grounded GraphRAG diagnostic microservice that explains submission failures and isolates judge cluster incidents.

---

## Table of Contents
1. [System Architecture & Storage Division](#1-system-architecture--storage-division)
2. [Stage 1: Contest API & Asynchronous Containerized Judge](#2-stage-1-contest-api--asynchronous-containerized-judge)
3. [Stage 2: Contest Frontend & Real-Time Flow](#3-stage-2-contest-frontend--real-time-flow)
4. [Stage 3: Evidence-Grounded AI Layer (GraphRAG & Investigation)](#4-stage-3-evidence-grounded-ai-layer-graphrag--investigation)
5. [Stage 4: Reliability, Security, Cost & Recovery](#5-stage-4-reliability-security-cost--recovery)
6. [Quick Start & Single-Command Evaluation](#6-quick-start--single-command-evaluation)
7. [Evaluation Summary & Test Results](#7-evaluation-summary--test-results)
8. [Engineering Trade-offs, Limitations & Disclosures](#8-engineering-trade-offs-limitations--disclosures)

---

## 1. System Architecture & Storage Division

### Architecture Overview

```
[ Browser Client ]
       │  (HTTP / Next.js Pages: /contests, /contests/:id, /ai, /instructor/health)
       ▼
[ Next.js 16 Frontend ] (Port 3001)
       │  (Dynamic Runtime Proxies: /api/backend & /api/ai)
       ├──► [ NestJS Backend API ] (Port 3000) ── Auth & RBAC (JWT)
       │           │
       │           ├── Authoritative DB Operations (Prisma ORM)
       │           ▼
       │    [ SQLite Relational DB ] (dev.db) ── Submissions, Users, TestCases
       │           │
       │           ├── Transactional Submission Enqueue: status=QUEUED
       │           ▼
       │    [ JudgeJob Queue Table ]
       │           ▲
       │           │  (Polls QUEUED jobs every 1s, recovers stale jobs every 60s)
       │    [ Judge Worker Daemon ] (Node.js + Dockerode)
       │           │
       │           ├── Ephemeral Container Run (python:3.10-alpine, node:20-alpine, gcc:alpine)
       │           ▼
       │    [ Docker Sandboxes ] (nobody, NetworkMode: 'none', 128MB RAM, ReadonlyRootfs)
       │           │
       │           ▼
       │    [ Persist TestCaseResult & Update Leaderboard ]
       │
       └──► [ AI Diagnostic Microservice ] (Port 3002, FastAPI + Groq Llama 3.3)
                   │
                   ├── Dynamic Entity Resolution (dev.db + Kùzu Graph via RapidFuzz)
                   ├── Multi-Hop GraphRAG (Kùzu Property Graph)
                   ├── Semantic Retrieval (ChromaDB Vector Store)
                   ├── Lexical Keyword Matching (SQLite FTS5)
                   └── Grounded 4-Part Diagnostic Synthesis (Observation, Inference, Unknowns, Evidence)
```

### Storage Responsibilities

Rather than forcing all data into a single database, storage is cleanly partitioned across four specialized engines:

| Storage Engine | Technology | Concrete Responsibilities |
| :--- | :--- | :--- |
| **Relational DB** | **SQLite (`dev.db`) via Prisma ORM** | **Authoritative Single Source of Truth:** User identities, organizations, contests, problems, test cases (visible & hidden), submissions, judge jobs, individual testcase results (`TestCaseResult`), and contest leaderboards. All writes here are strictly ACID-compliant. |
| **Graph DB** | **Kùzu Embedded Property Graph** | **Multi-Hop Topological Traversal:** Models relationships that relational joins struggle with at scale: <br>• Learner Prerequisite Gaps: `(Learner)-[:SUBMITTED]->(Submission)-[:ATTEMPTED]->(Problem)-[:REQUIRES]->(Concept)-[:RECOMMENDS]->(Resource)`<br>• Infrastructure Outage Telemetry: `(Submission)-[:PROCESSED_BY]->(Worker)-[:AFFECTED_BY]->(IncidentEvent)` |
| **Vector DB** | **ChromaDB (Persistent)** | **Semantic Similarity:** Embeds conceptual documentation, algorithm problem descriptions, and learning guides to match natural language student questions even when keywords differ. |
| **Lexical Search** | **SQLite FTS5 (`fts.db`)** | **Exact Keyword Lookup:** BM25 scoring for exact compiler error outputs, worker crash logs, and raw incident descriptions where exact string matches matter more than semantic proximity. |

---

## 2. Stage 1: Contest API & Asynchronous Containerized Judge

### Asynchronous Queue & State Machine
1. A student submits code through `POST /submissions`.
2. The backend creates a `Submission` record (`status: QUEUED`, `verdict: null`, `score: 0`) and a linked `JudgeJob` inside a single atomic SQLite transaction.
3. The response returns immediately to the client with `id: <uuid>` so the UI is non-blocking.
4. The standalone **Judge Worker** daemon polls for `QUEUED` jobs, transitions the job to `RUNNING`, and executes each test case inside an isolated Docker sandbox.
5. On completion, the worker updates individual `TestCaseResult` rows, computes the score, updates the contest leaderboard, and sets `status: COMPLETED` with the final verdict.

### Pure Generic Scoring & Mathematical Model
The judging engine contains **zero hardcoded problem logic or static answers**. It dynamically handles three distinct weighting modes:
- **Equal-Weight Mode:** If a problem has $N$ unweighted test cases, each passed test case awards exactly $P / N$ points.
- **Explicit-Weight Mode:** If test cases specify individual points (e.g. edge cases worth more), points are summed based on passed tests.
- **Hybrid Weighting:** Any unassigned problem points are divided evenly among unweighted test cases:
  $$\text{defaultWeight} = \frac{\max(0, P - \sum \text{explicitPoints})}{\text{unweightedCount}}$$
- **Monotonic Leaderboard Invariant:**
  $$\text{ContestScore}(u) = \sum_{p \in \text{Problems}} \min\left(p.\text{points}, \max_{s \in \text{Submissions}(u, p)} \text{score}(s)\right)$$
  Submitting a worse attempt will **never** lower a student's personal best score, and repeated successful submissions will never inflate the leaderboard.

### Fortress-Level Sandbox Security
Every submission is evaluated inside a single-use ephemeral container with strict defense-in-depth:
- **Non-Root Execution:** Containers run strictly as `nobody` (`uid=65534`).
- **Air-Gapped Network:** `NetworkMode: 'none'` completely disables inbound/outbound networking, preventing socket abuse, reverse shells, or remote data exfiltration.
- **Resource Limits:** Hard caps of `Memory: 128MB` (no swap) and `CpuQuota: 100000` (1 core).
- **Fork-Bomb Protection:** `PidsLimit: 64` prevents process table exhaustion.
- **Immutable Filesystem:** `ReadonlyRootfs: true` blocks writing to system paths (`/root`, `/bin`, `/usr`).
- **5-Second Watchdog:** Hard process kill triggers `TIME_LIMIT_EXCEEDED` on infinite loops.
- **Infrastructure Integrity:** If Docker fails on the host, the worker marks the submission as `INFRASTRUCTURE_ERROR` (`INFRA_FAILED`). **Host execution is never attempted**, ensuring student code never runs on the judging host, and infrastructure bugs are never blamed on student code.

---

## 3. Stage 2: Contest Frontend & Real-Time Flow

Built with **Next.js 16 (App Router)** and **Tailwind CSS**:
- **Original Contest Flow:** Users log in as a student (e.g. Alice), select an active contest, choose a problem, write code in the editor, and submit.
- **Live Asynchronous Updates:** The client polls `/api/backend/submissions/:id` every 1 second, showing transitions from `QUEUED` $\to$ `RUNNING` $\to$ `COMPLETED`, rendering passed/failed badges, stdout, compiler stderr, and individual testcase scores.
- **Zero-CORS Runtime Proxying:** Next.js server-side dynamic route handlers (`/api/backend/[[...path]]` and `/api/ai/[[...path]]`) proxy all browser traffic directly to internal Docker network services (`backend:3000` and `ai-service:3002`). This completely eliminates CORS issues, browser port mismatches, and mixed-content blocking.
- **State Persistence:** Results, authentication tokens, and leaderboard standings remain consistent across page refreshes, tab switches, and network reconnects.

---

## 4. Stage 3: Evidence-Grounded AI Layer (GraphRAG & Investigation)

The AI layer is built directly into Shodh-a-Code as a dedicated microservice (`ai-service` on port 3002). It is **not a generic document chatbot**; it grounds its responses in live platform telemetry, relational databases, and a knowledge graph.

### Core Capabilities

#### 1. Dynamic Entity Resolution (Zero Hardcoding)
- Does not rely on static entity maps.
- `get_dynamic_entities()` queries `dev.db` for problems, users, and submissions, and queries Kùzu for concepts and worker nodes.
- Uses **RapidFuzz** (`score_cutoff=75`) to resolve misspellings, colloquial names (e.g. `"binary search"`, `"p3"`, `"two sum"`, `"Alice"`), and partial mentions.

#### 2. Multi-Hop GraphRAG vs. Simpler Baselines
Why vector search alone is insufficient:
- *Vector Only:* When asked *"Which learners share a prerequisite gap despite different failed submissions?"*, vector embeddings cannot trace who submitted what or traverse topological graph paths.
- *GraphRAG:* Traverses `(Learner)-[:SUBMITTED]->(Submission)-[:ATTEMPTED]->(Problem)-[:REQUIRES]->(Concept)-[:RECOMMENDS]->(Resource)` across multiple hops.
- Combines semantic retrieval (ChromaDB), exact compiler log search (SQLite FTS5), and graph traversal (Kùzu) through reciprocal-rank reranking.

#### 3. Strict 4-Part Grounded Synthesis
To prevent hallucinations, the LLM (Groq Llama 3.3 70B Versatile) synthesizes its final answer strictly using:
```text
OBSERVATION
<Direct, verifiable facts observed in the database and test results>

INFERENCE
<Logical deductions grounded strictly in the observations>

WHAT CANNOT BE ESTABLISHED
<Honest acknowledgments of missing data, unknown dependencies, or ambiguous logs>

EVIDENCE
<Exact citations: GraphRAG paths, submission IDs, or log timestamps>
```

#### 4. The Three Target Scenarios Addressed
1. **Student Failure Diagnosis:**
   *"Why did my latest submission fail, and what should I review next?"*
   $\to$ Inspects the student's actual submission in SQLite, retrieves failed testcase stderr, traces the problem's required concept in Kùzu, and returns the curated learning resource.
2. **Cross-Learner Prerequisite Gap Analysis:**
   *"Which learners may share a prerequisite gap despite having different failed submissions?"*
   $\to$ Finds students who failed different problems (e.g. Alice on Two Sum, Bob on Palindrome Checker) that converge on the same underlying concept (`Hash Map`).
3. **Judge Outage vs. Student Mistake Isolation:**
   *"Did a change to the judge affect contest outcomes, and what evidence separates infrastructure problems from errors in submitted code?"*
   $\to$ Graph query correlates `worker-crash-node9` kernel panic events (`JudgeEvent`) with `INFRASTRUCTURE_ERROR` spikes, separating genuine code mistakes (`WRONG_ANSWER` on healthy workers) from server crashes.

#### 5. Privacy & Live Contest Hint Policy
- **Hidden Tests Redacted:** Students can only view visible sample test outputs. Hidden test inputs and expected outputs are stripped at the database query level and completely redacted from AI context.
- **Peer Code Privacy:** When Alice asks about Bob's submission, the code is masked (`[PRIVATE: Code hidden for privacy protection]`).
- **Instructor Telemetry Restricted:** The Contest Health Radar endpoint (`/instructor/contest-health`) enforces RBAC: `INSTRUCTOR` role is required; student requests return `403 Forbidden`.

---

## 5. Stage 4: Reliability, Security, Cost & Recovery

### Reliability & Crash Recovery
- **Worker Crash Recovery:** If the judge worker process crashes or the server is restarted mid-execution, orphaned jobs left in `RUNNING` status are automatically reclaimed by `recoverStaleJobs()` on worker startup. Stale jobs (> 5 minutes) are finalized cleanly with `INFRASTRUCTURE_ERROR` and an incident event is logged, preventing deadlocks.
- **Idempotent Job Processing:** Submissions use unique UUIDs and database transactions to ensure duplicate runs never produce conflicting scores.
- **Scaling to Heavier Loads:** In a high-traffic production setup, SQLite would be replaced with PostgreSQL, and the in-memory/polling queue would transition to a Redis-backed BullMQ or Kafka distributed broker with horizontally auto-scaled worker nodes.

### Security Boundaries
- Strict separation between the judging worker (which communicates with Docker) and student input.
- Submitted code is compiled and executed exclusively in unprivileged, read-only containers.
- All AI tools are strictly read-only; the AI cannot write to the database or modify contest scores.

### Cost Control & Rate Limiting
- **In-Memory Rate Limiting:** A token-bucket limiter in `ai-service` restricts users to **10 requests per minute** per user ID, preventing API quota abuse.
- **Low-Cost Inference:** Utilizes Groq's high-throughput Llama 3.3 70B engine (~$0.0002 per diagnostic query), delivering sub-second response times.
- **Graceful Fallback:** If Groq or an external LLM is offline or times out, the service falls back to a deterministic, local rule-based synthesizer based on retrieved graph evidence. The core contest judging engine operates with **100% independence** and continues functioning even if the AI service is completely stopped.

---

## 6. Quick Start & Single-Command Evaluation

### Prerequisites
- Docker & Docker Compose
- (Optional for local dev) Node.js 20+, Python 3.10+, pnpm 9

### Option A: 1-Click Docker Compose (Production Setup)
```bash
# Clone the repository
git clone https://github.com/AKSHITAK1040/shodh-ai.git
cd shodh-ai

# Start all 4 services with Docker Compose
docker compose up --build
```
- **Frontend UI:** `http://localhost:3001`
- **Contests:** `http://localhost:3001/contests`
- **AI Assistant:** `http://localhost:3001/ai`
- **Health Radar:** `http://localhost:3001/instructor/health`
- **Backend API:** `http://localhost:3000`
- **AI Service:** `http://localhost:3002`

---

### Option B: 1-Click Local Launch in VS Code
1. Open the project folder in **VS Code**.
2. Press `Ctrl + Shift + B` (or run **Terminal → Run Build Task...**).
3. All 4 services will start in dedicated terminal panels.

---

### Single Command to Run Evaluation
Run the automated GraphRAG evaluation suite:
```bash
python evaluate.py
```
This script runs the 5 core reasoning challenges against the live platform:
1. `GET /health` service readiness
2. `POST /seed` database and graph synchronization
3. Student failure diagnosis & learning recommendation
4. Cross-learner prerequisite gap identification
5. Infrastructure incident root cause isolation vs student error

---

### Pre-Seeded Identities for Testing

| Email | Password | Role | Permissions |
| :--- | :--- | :--- | :--- |
| `alice@student.com` | `password` | `STUDENT` | Solves problems, views own submissions. Peer code is protected. |
| `bob@student.com` | `password` | `STUDENT` | Competes on the leaderboard. |
| `dr.instructor@univ.edu` | `password` | `INSTRUCTOR` | Full visibility: hidden test cases, class gap analysis, health radar. |

---

## 7. Evaluation Summary & Test Results

### 25-Point Comprehensive Red-Team Matrix
The platform was validated across 25 adversarial and functional test cases (`scratch/test_redteam_matrix_25.py`). **Result: 25 / 25 Passed (100.0%)**.

| Category | Tested Scenarios | Expected Behavior | Actual Behavior | Status |
| :--- | :--- | :--- | :--- | :---: |
| **Judging Mechanics** | Correct solution, partial credit, wrong answer, empty file, syntax error, runtime crash | Accurate scoring, correct verdicts (`ACCEPTED`, `PARTIAL`, `WRONG_ANSWER`, `COMPILE_ERROR`, `RUNTIME_ERROR`) | All testcases graded with exact mathematical weights | **PASS** |
| **Container Sandboxing** | 5s timeout, 10MB stdout spam, 500MB OOM allocation, network connection, `/root` write attempt, fork bomb | Hard kill at 5000ms, truncated output, memory kill, network blocked, read-only error, fork limit enforced | Ephemeral container limits held with zero host leakage | **PASS** |
| **Privacy & Security** | Hidden test extraction, peer code inspection, client score tampering | Redacted from API & AI; peer code masked; client-injected scores rejected | Sensitive data protected across UI and AI | **PASS** |
| **Concurrency & Recovery** | Worker killed mid-execution, parallel submissions, resubmissions | Stale job auto-recovered; concurrent transactions clean; monotonic score preserved | Zero race conditions or corrupted leaderboards | **PASS** |
| **GraphRAG & Grounding** | Grounded diagnosis, unanswerable queries, conflicting logs, AI offline | Strict 4-part synthesis; honest unknown admission; contest works while AI is down | Responses strictly bound to inspectable evidence | **PASS** |
| **Dynamic Platform** | Runtime testcase insertion, runtime problem creation | Automatically evaluated and scored without code changes | Database-driven dynamic execution verified | **PASS** |

### One Bug Discovered and Addressed
- **Issue:** On the remote AWS Lightsail host, the judging worker initially failed with `(HTTP code 404) No such image: python:3.10-alpine` when a student submitted Python code.
- **Root Cause:** Sibling Docker containers spawned by the worker required the runner images to exist in the host's Docker cache, but they had not been pulled yet.
- **Fix:** Added `ensureImage(image)` to `judge-worker/index.js` which automatically detects missing runner images and pulls them on demand from Docker Hub before creating the container, accompanied by shared mount permissions (`/tmp/shodh-judge`).

---

## 8. Engineering Trade-offs, Limitations & Disclosures

### Key Design Trade-offs
1. **SQLite vs PostgreSQL for Take-Home Submission:**
   - *Choice:* Selected SQLite for both backend relational storage and FTS5 search.
   - *Trade-off:* Eliminates external database setup friction for reviewers (zero host configuration needed). While SQLite is limited in write concurrency under massive production load, it is transactional, lightweight, and supports file-based sharing across containers.
2. **Embedded Kùzu Graph vs Neo4j Server:**
   - *Choice:* Embedded Kùzu Graph directly into the Python AI microservice.
   - *Trade-off:* Avoided the 1.5GB memory overhead of a dedicated Neo4j JVM container, enabling the entire 4-container stack to run smoothly on a minimal $10/mo Lightsail instance (2GB RAM).
3. **Dynamic Proxying in Next.js:**
   - *Choice:* Routed all client requests through Next.js server route handlers (`/api/backend/*` and `/api/ai/*`) rather than having the browser make cross-origin calls to ports 3000 and 3002.
   - *Trade-off:* Introduces a lightweight proxy hop in the Node server, but completely eliminates CORS configuration headaches, browser IP mismatches, and mixed-content issues.

### Known Limitations
- Submissions queue uses database polling (`1000ms`) rather than a persistent WebSocket or Redis Pub/Sub stream.
- The Kùzu graph and ChromaDB index are updated via eventual consistency on submission creation; high-frequency batch updates would benefit from a dedicated background worker worker pipeline.

### AI-Assisted Development Disclosure
In accordance with engineering transparency standards:
- **Tooling Used:** Google DeepMind Antigravity was used during development for codebase auditing, generating TypeScript/Python boilerplate, writing the 25-point red-team test script, and optimizing Docker build layers.
- **Authorship:** All core architectural decisions, data modeling schemas, GraphRAG Cypher queries, sandbox security boundaries, partial credit mathematical formulas, and incident isolation logic were designed, implemented, and empirically verified through live runtime testing.
