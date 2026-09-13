import urllib.request
import json

user = "rate_limit_tester_user"
responses = []

for i in range(12):
    payload = {
        "question": "What is binary search?",
        "user_id": user,
        "user_role": "INSTRUCTOR"
    }
    req = urllib.request.Request(
        "http://localhost:3002/ask",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            ans = data.get("answer", "")
            is_rate_limited = "RATE_LIMITED" in ans
            responses.append((i + 1, is_rate_limited, ans[:50]))
    except Exception as e:
        responses.append((i + 1, False, str(e)))

print("RATE LIMITING TEST (Limit = 10 req/min):")
for req_num, limited, snippet in responses:
    print(f"Request #{req_num:02d}: Limited={limited} | Response: {snippet}")
