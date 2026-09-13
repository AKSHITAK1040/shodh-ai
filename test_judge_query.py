import urllib.request
import json

payload = {
    "question": "Did a change to the judge affect contest outcomes, and what evidence separates infrastructure problems from errors in submitted code?",
    "user_id": "u1",
    "user_role": "INSTRUCTOR"
}

req = urllib.request.Request(
    "http://localhost:3002/ask",
    data=json.dumps(payload).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)

with urllib.request.urlopen(req) as resp:
    res = json.loads(resp.read().decode("utf-8"))
    print("=== QUESTION 3: JUDGE INVESTIGATION RESULT ===")
    print("STATUS:", resp.status)
    print("\nFINAL GROUNDED ANSWER:\n", res.get("answer", ""))
    print("\nRETRIEVED EVIDENCE WITH TIMESTAMPS & SCORES:")
    for ev in res.get("evidence", []):
        t_val = ev.get("timestamp")
        s_val = round(ev.get("rerank_score", 0), 2)
        print(f" * Type: {ev.get('type')} | ID: {ev.get('id')} | Score: {s_val} | Timestamp: {t_val}")
        print(f"   Method: {ev.get('method')} | Content: {ev.get('content')}")
    print("\nTRACE STEPS (GROQ TOOL CALLS & AGENT DECISIONS):")
    for t in res.get("trace", []):
        print(" - Step:", t.get("step"), ":", {k: v for k, v in t.items() if k != "step"})
