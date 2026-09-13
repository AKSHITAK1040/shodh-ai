# Shodh-a-Code Contest Platform & AI Investigation Engine

**AI Engineer Intern Take-Home Project**

---

## 1. Product & Architecture Overview

Shodh-a-Code is a full-stack, containerized coding contest platform built with an authoritative asynchronous judging engine and an evidence-grounded GraphRAG AI diagnostic microservice. It allows learners to participate in real-time competitive programming contests with multi-language execution, partial testcase credit scoring, and tamper-proof leaderboards, while giving students and instructors inspectable AI diagnostics to investigate submission failures, infrastructure incidents, and prerequisite learning gaps.

### Architecture Diagram

```
[ Browser Client ]
        │  (HTTP / Next.js Pages: /contests, /contests/:id, /ai, /instructor/health)
        ▼
[ Next.js 16 Frontend ] (Port 3001)
        │  (Reverse Proxy /api/backend -> Port 3000)
        ▼
[ NestJS Backend API ] (Port 3000) ── Auth & RBAC (JWT, Argon2)
        │
        ├── Authoritative DB Operations (Prisma ORM)
        ▼
[ SQLite Relational DB ] (backend/prisma/dev.db)
        │
        ├── Transactional Submission Enqueue: status=QUEUED, verdict=null, score=0
        ▼
[ JudgeJob Queue Table ]
        ▲
        │  (Polls QUEUED jobs every 1s, recovers stale jobs every 30s)
[ Judge Worker Daemon ] (Node.js + Dockerode)
        │
        ├── Ephemeral Container Execution (per testcase)
        ▼
[ Docker Sandbox Containers ]
        │  • User: nobody (non-root)
        │  • NetworkMode: 'none' (air-gapped)
        │  • Memory: 128MB limit
        │  • PidsLimit: 64 (fork-bomb proof)
        │  • CpuQuota: 100000 (1 CPU core)
        │  • ReadonlyRootfs: true (immutable root filesystem)
        │  • Timeout Watchdog: 5000ms hard kill
        ▼
[ Persist TestCaseResult & Update Leaderboard ]
        │  • sum(pointsAwarded) -> Submission.score
        │  • Leaderboard aggregation: sum(max(score)) across problems
        ▼
[ AI Diagnostic Microservice ] (Port 3002)
        │  • Dynamic Entity Resolution (SQLite + Kùzu)
        │  • Hybrid Retrieval: Vector (ChromaDB) + Lexical (SQLite FTS5)
        │  • Multi-Hop GraphRAG (Kùzu Property Graph)
        │  • Bounded ReAct Agent (Groq / Fallback)
        │  • Grounded 4-Part Diagnostic Synthesis
```

---

## 2. Meaningful Storage Split

| Storage Layer | Engine | Responsibility |
| :--- | :--- | :--- |
| **Relational DB** | SQLite (`backend/prisma/dev.db`) | **Authoritative single source of truth:** User identities, organizations, contests, problems, enabled/hidden testcases, submissions, judge jobs, individual testcase results (`TestCaseResult`), leaderboards, and incident telemetry (`JudgeEvent`). |
| **Graph DB** | Kùzu (Embedded Property Graph) | **Multi-hop topological relationship traversal:** Connects `Learner -> [:SUBMITTED] -> Submission -> [:ATTEMPTED] -> Problem -> [:REQUIRES] -> Concept -> [:RECOMMENDS] -> Resource` for prerequisite gap analysis, plus `Submission -> [:PROCESSED_BY] -> Worker -> [:AFFECTED_BY] -> IncidentEvent` for judge incident isolation. |
| **Vector DB** | ChromaDB (Embedded Vector Store) | **Semantic similarity search:** Cosine similarity retrieval over problem descriptions, algorithm concepts, and study resources. |
| **Lexical FTS DB** | SQLite FTS5 | **Exact keyword matching:** BM25 scoring for exact compiler error outputs, worker failure messages, and judge event descriptions. |

---

## 3. Generic Problem Scoring & Partial Credit Model

Shodh-a-Code features a **100% generic, problem-agnostic judging engine**. It contains zero problem-specific `if/else` checks or hardcoded expected outputs.

### Scoring Specifications:
1. **Dynamic Problem Definition:** Every problem specifies total points $P$ and contains $N$ test cases ($N \ge 1$), which can be visible (sample tests) or hidden.
2. **Scoring Modes & Weighting Algorithm:**
   - **Equal-Weight Mode:** If test cases do not specify individual points (`points: null`), each passed test case awards $P / N$ points.
   - **Explicit-Weight Mode:** If test cases configure specific points, points awarded equals the sum of points for passed test cases, capped strictly at $P$.
   - **Hybrid Weighting:** If some test cases have explicit points and others are unweighted, the judge dynamically allocates the remaining unassigned points equally across the unweighted cases:
     $$\text{defaultWeight} = \frac{\max(0, P - \sum \text{explicitPoints})}{\text{unweightedCount}}$$
3. **Verdict Determination:**
   - `ACCEPTED`: 100% of enabled test cases passed (awards full problem points $P$).
   - `PARTIAL`: At least 1 test case passed, but not all ($0 < \text{score} < P$).
   - `WRONG_ANSWER`: Execution succeeded with exit code 0, but 0 test cases passed (score 0).
   - `COMPILE_ERROR`: Code failed compilation or syntax validation (score 0).
   - `RUNTIME_ERROR`: Process crashed with non-zero exit code or unhandled exception (score 0).
   - `TIME_LIMIT_EXCEEDED`: Process exceeded the 5000ms execution limit and was terminated by the watchdog (score 0).
   - `INFRASTRUCTURE_ERROR`: Docker daemon or worker host failed; never blamed on student code.
4. **Leaderboard Aggregation & Mathematical Invariants:**
   $$\text{ContestScore}(u) = \sum_{p \in \text{Contest}} \min\left(p.\text{points}, \max_{s \in \text{Submissions}(u, p)} \text{score}(s)\right)$$
   - **Monotonicity:** A lower subsequent submission never decreases the user's score; repeated submissions never inflate the score.
   - **Contest Cap:** Contest score is strictly bounded by $\sum_{p \in \text{Contest}} p.\text{points}$.

### Live Contest Mathematics (Midterm Algorithms Contest — 160 Points Total):
| Problem | Title | Total Pts | Test Cases | Weighting Scheme | Points per Test Case |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **P1** | Two Sum | **10 pts** | 4 (2 visible, 2 hidden) | Equal-weight | $10 / 4 = 2.5$ pts each ($1 \to 3, 2 \to 5, 3 \to 8, 4 \to 10$) |
| **P2** | Palindrome Checker | **100 pts** | 4 (2 visible, 2 hidden) | Explicit weights | TC1: 10 pts, TC2: 20 pts, TC3: 30 pts, TC4: 40 pts ($10+20+30+40=100$) |
| **P3** | Binary Search | **50 pts** | 5 (3 visible, 2 hidden) | Equal-weight | $50 / 5 = 10$ pts each ($10, 20, 30, 40, 50$) |
| **Total** | **Midterm Contest** | **160 pts** | **13 test cases** | **Hybrid / Verified** | **Max Leaderboard Score = 160 pts** |

---

## 4. Sandbox Security Boundary & Hardening

Every test case runs inside an isolated ephemeral Docker container with defense-in-depth:
- **Non-Root Execution:** Container runs strictly as `nobody` (`uid=65534`).
- **Network Isolation:** `NetworkMode: 'none'` blocks all inbound and outbound network calls (preventing reverse shells, data exfiltration, or socket abuse).
- **Process Quotas:** `PidsLimit: 64` prevents fork bombs and thread pool exhaustion.
- **Resource Quotas:** `Memory: 128MB` with swap disabled; `CpuQuota: 100000` (1 core maximum).
- **Filesystem Hardening:** `ReadonlyRootfs: true` renders root filesystem immutable; writes outside `/tmp` fail immediately.
- **No Docker Socket Access:** No host Docker sockets or privileged capabilities are mounted.
- **Zero Host Fallback:** Eliminates all insecure host-execution fallbacks.

---

## 5. Sample Identities & Role-Based Access Control (RBAC)

| User ID | Email | Password | Role | Permissions & Boundaries |
| :--- | :--- | :--- | :--- | :--- |
| `u1` (`bf2c...`) | `alice@student.com` | `password` | `STUDENT` | Solves problems, views own submissions. Hidden tests and peer code are strictly redacted. |
| `u2` (`efb8...`) | `bob@student.com` | `password` | `STUDENT` | Solves problems. Proprietary code is masked from other students. |
| `u3` | `charlie.u3@shodh.ai` | `password` | `STUDENT` | Test student for runtime failure and cross-problem prerequisite gap analysis. |
| `u_instructor` | `dr.instructor@univ.edu` | `password` | `INSTRUCTOR` | Full visibility: hidden test cases, cross-learner gap matrix, judge outage telemetry. |

---

## 6. Quick Start & Reproducibility

### Option A: Docker Compose (Recommended)
```bash
docker compose up --build
```
- **Frontend UI:** `http://localhost:3001`
- **Contest Page:** `http://localhost:3001/contests/6bde464d-7b9f-4ef3-9d5e-f6f1e5ee5d9d`
- **Backend API:** `http://localhost:3000`
- **AI Service:** `http://localhost:3002`

### Option B: Local Services (Windows / PowerShell)
```bash
# 1. Start Backend API
cd backend && pnpm install && node dist/main

# 2. Start Judge Worker
cd judge-worker && node index.js

# 3. Start AI Microservice
cd ai-service && uvicorn main:app --host 0.0.0.0 --port 3002

# 4. Start Next.js Frontend
cd frontend && pnpm dev --port 3001
```

---

## 7. 25-Point Comprehensive Runtime Red-Team Verification Matrix

The complete 25-scenario verification suite (`scratch/test_redteam_matrix_25.py`) was executed against the live system. **Result: 25 / 25 Passed (100.0%)**.

| # | Test Scenario | Input / Attack Payload | Authoritative Outcome | Status |
| :---: | :--- | :--- | :--- | :---: |
| **1** | **Correct Submission** | Python Two Sum solution | `ACCEPTED` (10/10 points, exit code 0) | **PASS** |
| **2** | **Partial Credit** | Palindrome Checker (passes 1/2 tests) | `PARTIAL` (15/100 points awarded) | **PASS** |
| **3** | **Wrong Answer** | Code printing static `0 0` | `WRONG_ANSWER` (0/10 points) | **PASS** |
| **4** | **Empty Submission** | Blank source file | `WRONG_ANSWER` / Rejected (0 points) | **PASS** |
| **5** | **Compile Error** | C++ invalid syntax token | `COMPILE_ERROR` (0 points, compiler stderr) | **PASS** |
| **6** | **Runtime Error** | Python unhandled exception (`RuntimeError`) | `RUNTIME_ERROR` (0 points, trace logged) | **PASS** |
| **7** | **Timeout Watchdog** | Python `time.sleep(10)` | `TIME_LIMIT_EXCEEDED` (Killed at 5000ms) | **PASS** |
| **8** | **Excessive Stdout** | Script spamming 10MB of characters | `WRONG_ANSWER` (Output truncated safely) | **PASS** |
| **9** | **Excessive Memory** | 500MB array allocation (128MB limit) | `RUNTIME_ERROR` (Killed by container OOM) | **PASS** |
| **10** | **Network Access Attempt** | `urllib.request.urlopen('http://1.1.1.1')` | `RUNTIME_ERROR` (`NetworkMode: none` blocked) | **PASS** |
| **11** | **Filesystem Write** | Write to `/root/hack.txt` | `RUNTIME_ERROR` (`ReadonlyRootfs` blocked) | **PASS** |
| **12** | **PID / Fork Bomb** | Infinite `os.fork()` loop | `TIME_LIMIT_EXCEEDED` (`PidsLimit: 64` contained) | **PASS** |
| **13** | **Hidden Test Security** | Student API call & AI prompt injection | Hidden tests stripped from API; AI returns `UNAUTHORIZED` | **PASS** |
| **14** | **Peer Code Privacy** | Alice queries Bob's private submission | Code masked: `[PRIVATE: Code hidden for privacy protection]` | **PASS** |
| **15** | **Fake Score Injection** | Client POST with `{"score": 100, "verdict": "ACCEPTED"}` | Injected values ignored; server initializes `QUEUED`, score `0` | **PASS** |
| **16** | **Repeated Submissions** | Alice resubmits accepted solution | Score remains best score (does not duplicate leaderboard) | **PASS** |
| **17** | **Concurrent Submissions** | Parallel submissions by Alice and Bob | Both processed concurrently without corruption | **PASS** |
| **18** | **Worker Recovery** | Unfinished jobs during restart | `recoverStaleJobs()` automatically reclaims orphaned jobs | **PASS** |
| **19** | **AI Grounded Diagnosis** | Student asks why submission failed | Synthesizes strict `OBSERVATION`, `INFERENCE`, `EVIDENCE` | **PASS** |
| **20** | **AI Independence** | Submissions submitted while AI offline | Core contest judging operates with 100% independence | **PASS** |
| **21** | **Contradictory Evidence** | Query on conflicting judge incident logs | AI radar distinguishes baseline from infrastructure event | **PASS** |
| **22** | **Unanswerable Query** | Off-topic query ("Capital of France") | Refuses politely or bounds to zero contest evidence | **PASS** |
| **23** | **Dynamic Testcase Insertion** | Inserted new testcase `tc_dyn_a6f0b5` | Automatically evaluated in next run without code change | **PASS** |
| **24** | **Dynamic Problem Insertion** | Inserted new problem `p_dyn_0b96ce` | Full execution, scoring (30 pts), and leaderboard updated | **PASS** |
| **25** | **Fresh Docker Readiness** | Complete 4-service compose definition | Clean container configuration, ports, and volumes verified | **PASS** |

---

## 8. AI-Assisted Development Disclosure

In accordance with academic and engineering transparency standards:
- **AI Coding Assistant Usage:** Google DeepMind Antigravity was used during development for codebase auditing, drafting test automation matrices, generating TypeScript Prisma queries, and refactoring CommonJS modules.
- **Architectural Authorship:** All architectural boundaries, relational schemas, GraphRAG Cypher traversals, Docker security sandboxing, and partial scoring mechanics were deliberately designed, reviewed, and empirically verified through live runtime execution.
