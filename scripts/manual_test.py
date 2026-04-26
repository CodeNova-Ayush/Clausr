import requests

ENV_BASE_URL = "http://localhost:7860"

# Reset easy task
resp = requests.post(f"{ENV_BASE_URL}/reset?task_id=easy")
obs = resp.json()

episode_id = obs["episode_id"]
clauses = obs["clauses"]
clause_ids = [c["id"] for c in clauses]

print(f"Episode ID: {episode_id}")
print(f"First 3 Clause IDs: {clause_ids[:3]}")

# Construct manual payload using first two clauses
payload = {
    "episode_id": episode_id,
    "findings": [
        {
            "clause_a_id": clause_ids[0],
            "clause_b_id": clause_ids[1],
            "explanation": "Manual test finding"
        }
    ]
}

print(f"\nSubmitting to /step: {payload}")

step_resp = requests.post(f"{ENV_BASE_URL}/step", json=payload)
print(f"\nScore Returned: {step_resp.json()}")
