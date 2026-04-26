import requests
import time
import json

BASE_URL = "http://localhost:7860"

def stress_test():
    print("--- Running Stress Tests ---")
    
    # 1. Reset 10 times
    print("1. 10 Resets per task")
    tasks = ["easy", "medium", "hard", "execution_easy", "lexmind_easy"]
    passed_resets = True
    for t in tasks:
        for _ in range(10):
            if "execution" in t:
                path = "/execution/reset"
            elif "lexmind" in t:
                path = "/lexmind/reset"
            else:
                path = "/reset"
                
            res = requests.post(f"{BASE_URL}{path}?task_id={t}")
            if res.status_code != 200:
                passed_resets = False
                print(f"Failed reset for {t}")
                break
    print(f"Resets PASS: {passed_resets}")

    # Reset an easy contract for step tests
    easy = requests.post(f"{BASE_URL}/reset?task_id=easy").json()
    contract_id = easy["contract_id"]
    
    # 2. Empty findings
    print("2. Empty findings step")
    res = requests.post(f"{BASE_URL}/step?task_id=easy&contract_id={contract_id}", json={"findings": []})
    data = res.json()
    passed_empty = (res.status_code == 200 and data.get("score") == 0.0)
    print(f"Empty findings PASS: {passed_empty}")

    # 3. All pairs (combinatorial explosion)
    print("3. All possible pairs step")
    all_pairs = []
    clauses = easy["clauses"]
    for i in range(len(clauses)):
        for j in range(i+1, len(clauses)):
            all_pairs.append({"clause_a_id": clauses[i]["id"], "clause_b_id": clauses[j]["id"], "explanation": "test"})
    res = requests.post(f"{BASE_URL}/step?task_id=easy&contract_id={contract_id}", json={"findings": all_pairs})
    data = res.json()
    passed_all = (res.status_code == 200 and data.get("score") is not None and data.get("score") < 1.0)
    print(f"All pairs PASS: {passed_all}")

    # 4. Correct finding
    print("4. Correct finding step")
    # Need the true ground truth. In easy_001.json it is clause_03 and clause_07
    true_pair = [{"clause_a_id": "clause_03", "clause_b_id": "clause_07", "explanation": "conflict"}]
    res = requests.post(f"{BASE_URL}/step?task_id=easy&contract_id={contract_id}", json={"findings": true_pair})
    data = res.json()
    passed_correct = (res.status_code == 200 and data.get("score", 0.0) >= 0.9) # 0.9 base + 0.1 bonus
    print(f"Correct finding PASS: {passed_correct} (Score: {data.get('score')})")

    # 5. Duplicate episode ID
    print("5. Duplicate episode ID gracefully handled")
    res1 = requests.post(f"{BASE_URL}/step?task_id=easy&contract_id={contract_id}", json={"findings": []})
    res2 = requests.post(f"{BASE_URL}/step?task_id=easy&contract_id={contract_id}", json={"findings": []})
    passed_dup = (res2.status_code == 200)
    print(f"Duplicate episode PASS: {passed_dup}")

    # 6. Invalid task id
    print("6. Invalid task ID")
    res = requests.post(f"{BASE_URL}/reset?task_id=invalid_task_xyz")
    passed_invalid = (res.status_code != 200)
    print(f"Invalid task ID PASS: {passed_invalid}")

print("Waiting for server to start...")
time.sleep(2)
stress_test()
