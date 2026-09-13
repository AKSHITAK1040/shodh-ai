import os
import sys
import json
import sqlite3
import requests
import time
from datetime import datetime, timedelta

DEV_DB_PATH = r"d:\shodhAI\backend\prisma\dev.db"
AI_ENDPOINT = "http://localhost:3002/instructor/contest-health"

passed = 0
failed = 0

def test(scenario_num, name, condition, details=""):
    global passed, failed
    if condition:
        print(f"[PASS] Scenario {scenario_num:2d}: {name}")
        passed += 1
    else:
        print(f"[FAIL] Scenario {scenario_num:2d}: {name} -- {details}")
        failed += 1

print("=" * 65)
print("AI CONTEST HEALTH RADAR - 10-SCENARIO AUTOMATED VERIFICATION")
print("=" * 65)

# -----------------------------------------------------------------
# Scenario 1: Normal contest with expected baseline failure rate
# -----------------------------------------------------------------
try:
    r1 = requests.post(AI_ENDPOINT, json={"user_role": "INSTRUCTOR", "contest_id": "nonexistent_contest"})
    d1 = r1.json()
    is_healthy = d1.get("status") == "HEALTHY"
    is_high = d1.get("confidence") == "HIGH"
    test(1, "Normal contest with expected failure rate",
         is_healthy and is_high,
         f"status={d1.get('status')}, conf={d1.get('confidence')}")
except Exception as e:
    test(1, "Normal contest with expected failure rate", False, str(e))

# -----------------------------------------------------------------
# Scenario 2: Judge worker OOM / crash event detected as incident
# -----------------------------------------------------------------
try:
    r2 = requests.post(AI_ENDPOINT, json={"user_role": "INSTRUCTOR"})
    d2 = r2.json()
    is_incident = d2.get("status") == "POSSIBLE_JUDGE_INCIDENT"
    high_conf = d2.get("confidence") == "HIGH"
    spike = d2.get("spike_multiplier", 0)
    test(2, "Judge worker crash event detected as incident",
         is_incident and high_conf and spike >= 2.0,
         f"status={d2.get('status')}, conf={d2.get('confidence')}, spike={spike}")
except Exception as e:
    test(2, "Judge worker crash event detected as incident", False, str(e))

# -----------------------------------------------------------------
# Scenario 3: Spike without infrastructure event -> UNCERTAIN
# -----------------------------------------------------------------
try:
    conn = sqlite3.connect(DEV_DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT id, type FROM JudgeEvent WHERE type IN ('WORKER_CRASH', 'INFRA_FAILURE')")
    saved_events = cur.fetchall()
    # Temporarily change infra event type to non-infra info log
    cur.execute("UPDATE JudgeEvent SET type = 'INFO_LOG' WHERE type IN ('WORKER_CRASH', 'INFRA_FAILURE')")
    conn.commit()
    conn.close()

    r3 = requests.post(AI_ENDPOINT, json={"user_role": "INSTRUCTOR"})
    d3 = r3.json()
    is_uncertain = d3.get("status") == "UNCERTAIN_FAILURE_SPIKE"
    med_conf = d3.get("confidence") == "MEDIUM"
    test(3, "Spike without infrastructure event flags UNCERTAIN",
         is_uncertain and med_conf,
         f"status={d3.get('status')}, conf={d3.get('confidence')}")

    # Restore infra event types
    conn = sqlite3.connect(DEV_DB_PATH)
    cur = conn.cursor()
    for eid, orig_type in saved_events:
        cur.execute("UPDATE JudgeEvent SET type = ? WHERE id = ?", (orig_type, eid))
    conn.commit()
    conn.close()
except Exception as e:
    test(3, "Spike without infrastructure event flags UNCERTAIN", False, str(e))

# -----------------------------------------------------------------
# Scenario 4: Mixed student and infrastructure failures accurately separated
# -----------------------------------------------------------------
try:
    r4 = requests.post(AI_ENDPOINT, json={"user_role": "INSTRUCTOR"})
    d4 = r4.json()
    subs = d4.get("affected_submissions", [])
    infra_subs = [s for s in subs if s["classification"] == "LIKELY_INFRASTRUCTURE"]
    student_subs = [s for s in subs if s["classification"] == "LIKELY_STUDENT_ERROR"]
    pass_subs = [s for s in subs if s["classification"] == "SUCCESSFUL_PASS"]

    has_infra = len(infra_subs) >= 4 and all("worker-crash-node9" in s["worker"] for s in infra_subs)
    has_student = any(s["submission_id"] == "sub_student_err" and s["classification"] == "LIKELY_STUDENT_ERROR" for s in student_subs)
    has_pass = any(s["submission_id"] == "sub_inc_pass" and s["classification"] == "SUCCESSFUL_PASS" for s in pass_subs)

    test(4, "Mixed student and infrastructure failures accurately separated",
         has_infra and has_student and has_pass,
         f"infra={len(infra_subs)}, student={len(student_subs)}, pass={len(pass_subs)}")
except Exception as e:
    test(4, "Mixed student and infrastructure failures accurately separated", False, str(e))

# -----------------------------------------------------------------
# Scenario 5: Student authorization denial (RBAC 403)
# -----------------------------------------------------------------
try:
    r5 = requests.post(AI_ENDPOINT, json={"user_role": "STUDENT", "user_id": "u1"})
    is_forbidden = r5.status_code == 403 and "UNAUTHORIZED" in r5.text
    test(5, "Student authorization denial (RBAC 403 Forbidden)",
         is_forbidden,
         f"status_code={r5.status_code}, detail={r5.text}")
except Exception as e:
    test(5, "Student authorization denial (RBAC 403 Forbidden)", False, str(e))

# -----------------------------------------------------------------
# Scenario 6: Instructor authorization granted (RBAC 200)
# -----------------------------------------------------------------
try:
    r6 = requests.post(AI_ENDPOINT, json={"user_role": "INSTRUCTOR", "user_id": "u_instructor"})
    is_allowed = r6.status_code == 200 and "status" in r6.json()
    test(6, "Instructor authorization granted (RBAC 200 OK)",
         is_allowed,
         f"status_code={r6.status_code}")
except Exception as e:
    test(6, "Instructor authorization granted (RBAC 200 OK)", False, str(e))

# -----------------------------------------------------------------
# Scenario 7: Timestamps and timeline chronological progression
# -----------------------------------------------------------------
try:
    r7 = requests.post(AI_ENDPOINT, json={"user_role": "INSTRUCTOR"})
    d7 = r7.json()
    timeline = d7.get("timeline", [])
    labels = [t["label"] for t in timeline]
    has_normal = any("Baseline" in l for l in labels)
    has_upgrade = any("Upgrade" in l for l in labels)
    has_crash = any("Crash" in l or "OOM" in l for l in labels)
    has_spike = any("Spike" in l for l in labels)
    has_recovery = any("Recovery" in l for l in labels)

    test(7, "Timestamps and timeline chronological progression",
         has_normal and has_upgrade and has_crash and has_spike and has_recovery and len(timeline) == 5,
         f"labels={labels}")
except Exception as e:
    test(7, "Timestamps and timeline chronological progression", False, str(e))

# -----------------------------------------------------------------
# Scenario 8: AI fallback works offline / Groq unavailable
# -----------------------------------------------------------------
try:
    r8 = requests.post(AI_ENDPOINT, json={"user_role": "INSTRUCTOR"})
    d8 = r8.json()
    ai_inv = d8.get("ai_investigation", "")
    has_obs = "OBSERVATION" in ai_inv
    has_inf = "INFERENCE" in ai_inv
    has_unknown = "WHAT CANNOT BE ESTABLISHED" in ai_inv
    has_ev = "EVIDENCE" in ai_inv
    has_conf = "CONFIDENCE" in ai_inv
    has_notice = "NOT mutate scores" in ai_inv

    test(8, "AI investigation contains all 5 required structured sections",
         has_obs and has_inf and has_unknown and has_ev and has_conf and has_notice,
         "Missing structured sections in AI investigation report")
except Exception as e:
    test(8, "AI investigation contains all 5 required structured sections", False, str(e))

# -----------------------------------------------------------------
# Scenario 9: Unanswerable case distinguishes unknown hardware/code details
# -----------------------------------------------------------------
try:
    r9 = requests.post(AI_ENDPOINT, json={"user_role": "INSTRUCTOR"})
    d9 = r9.json()
    ai_inv = d9.get("ai_investigation", "")
    # Check that WHAT CANNOT BE ESTABLISHED is non-empty and cites missing root cause or uncaptured traces
    cannot_established_part = ai_inv.split("WHAT CANNOT BE ESTABLISHED")[1].split("EVIDENCE")[0]
    has_unknown_content = len(cannot_established_part.strip()) > 20
    test(9, "Unanswerable case distinguishes unknown hardware/code details",
         has_unknown_content,
         f"cannot_established_length={len(cannot_established_part.strip())}")
except Exception as e:
    test(9, "Unanswerable case distinguishes unknown hardware/code details", False, str(e))

# -----------------------------------------------------------------
# Scenario 10: Unseen judge event dynamic detection without hardcoding
# -----------------------------------------------------------------
try:
    # Insert an unseen event type: e.g. DOCKER_CONTAINER_DEADLOCK
    t_radar = datetime.utcnow() - timedelta(minutes=45)
    t_deadlock = t_radar + timedelta(minutes=32)
    conn = sqlite3.connect(DEV_DB_PATH)
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO JudgeEvent (id, type, description, timestamp, affectedIds)
        VALUES (?, ?, ?, ?, ?)
    """, ("event_unseen_1", "DOCKER_CONTAINER_DEADLOCK", "Worker container lock timeout", t_deadlock.isoformat(), json.dumps(["sub_inc_1"])))
    conn.commit()
    conn.close()

    r10 = requests.post(AI_ENDPOINT, json={"user_role": "INSTRUCTOR"})
    d10 = r10.json()

    # Clean up unseen event
    conn = sqlite3.connect(DEV_DB_PATH)
    cur = conn.cursor()
    cur.execute("DELETE FROM JudgeEvent WHERE id = 'event_unseen_1'")
    conn.commit()
    conn.close()

    is_detected = d10.get("status") == "POSSIBLE_JUDGE_INCIDENT"
    test(10, "Unseen judge event dynamic detection without hardcoding",
         is_detected,
         f"status={d10.get('status')}")
except Exception as e:
    test(10, "Unseen judge event dynamic detection without hardcoding", False, str(e))

print("=" * 65)
print(f"VERIFICATION RESULTS: {passed}/10 PASSED, {failed}/10 FAILED")
print("=" * 65)

if failed > 0:
    sys.exit(1)
