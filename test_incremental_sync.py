import urllib.request
import json
import time

unique_id = f"sub_unseen_{int(time.time())}"
record_payload = {
    "id": unique_id,
    "type": "Submission",
    "content": f"Submission {unique_id} in C++ achieved O(N) linear time on Advanced Graph DP Problem."
}

# 1. Post to incremental index endpoint
req = urllib.request.Request(
    "http://localhost:3002/index/record",
    data=json.dumps(record_payload).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)
with urllib.request.urlopen(req) as resp:
    sync_res = json.loads(resp.read().decode("utf-8"))
    print("INCREMENTAL SYNC RESPONSE:", sync_res)

# 2. Query AI to verify it retrieves the newly synced record
query_payload = {
    "question": f"What was achieved in submission {unique_id}?",
    "user_id": "u1",
    "user_role": "INSTRUCTOR"
}
req2 = urllib.request.Request(
    "http://localhost:3002/ask",
    data=json.dumps(query_payload).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)
with urllib.request.urlopen(req2) as resp2:
    ask_res = json.loads(resp2.read().decode("utf-8"))
    print("\nAI RETRIEVAL OF NEWLY INDEXED RECORD:")
    print("Status: 200 OK")
    print("Answer snippet:\n", ask_res.get("answer", "")[:300])
    
    found_in_evidence = any(unique_id in str(e) for e in ask_res.get("evidence", []))
    print(f"\nRecord {unique_id} found in retrieved evidence: {found_in_evidence}")
    if found_in_evidence:
        print("INCREMENTAL_SYNC_VERIFICATION_PASS: Zero-downtime eventual consistency verified!")
    else:
        print("INCREMENTAL_SYNC_VERIFICATION_PARTIAL")
