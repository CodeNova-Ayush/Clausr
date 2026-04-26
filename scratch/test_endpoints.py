import requests
import time
import json

BASE_URL = "http://localhost:7860"

def test(name, method, path, expected_keys=None, payload=None, extract_key=None):
    try:
        if method == "GET":
            res = requests.get(BASE_URL + path, timeout=5)
        else:
            res = requests.post(BASE_URL + path, json=payload, timeout=5)
        
        status = res.status_code
        data = res.json() if status == 200 else res.text
        
        passed = True
        if status != 200:
            passed = False
        
        if expected_keys and isinstance(data, dict):
            for k in expected_keys:
                if k not in data:
                    passed = False
                    
        print(f"--- {name} ---")
        print(f"Status: {status}")
        # print(f"Response snippet: {str(data)[:200]}...")
        print(f"PASS: {passed}")
        print()
        
        if extract_key and isinstance(data, dict):
            return data.get(extract_key)
        return data
    except Exception as e:
        print(f"--- {name} ---")
        print(f"ERROR: {e}")
        print(f"PASS: False")
        print()
        return None

print("Waiting for server to start...")
time.sleep(2)

print("STEP 1: Testing Endpoints\\n")

test("GET /health", "GET", "/health", ["status"])

easy_obs = test("POST /reset?task_id=easy", "POST", "/reset?task_id=easy", ["episode_id", "clauses", "num_contradictions", "instructions"])
ep_id = easy_obs.get("episode_id") if isinstance(easy_obs, dict) else None
contract_id = easy_obs.get("contract_id") if isinstance(easy_obs, dict) else None

test("POST /reset?task_id=medium", "POST", "/reset?task_id=medium", ["clauses"])
test("POST /reset?task_id=hard", "POST", "/reset?task_id=hard", ["clauses"])

if ep_id and contract_id:
    payload = {"findings": [{"clause_a_id": "clause_01", "clause_b_id": "clause_02", "explanation": "Test"}]}
    test("POST /step", "POST", f"/step?task_id=easy&contract_id={contract_id}", ["score", "reward", "done", "feedback", "contradictions_found", "contradictions_total", "false_positives"], payload=payload)
else:
    print("Could not test /step because easy_obs failed.")

exec_obs = test("POST /execution/reset?task_id=execution_easy", "POST", "/execution/reset?task_id=execution_easy", ["clauses", "scenarios"])
exec_id = exec_obs.get("contract_id") if isinstance(exec_obs, dict) else None

test("POST /execution/reset?task_id=execution_medium", "POST", "/execution/reset?task_id=execution_medium", ["clauses", "scenarios"])
test("POST /execution/reset?task_id=execution_hard", "POST", "/execution/reset?task_id=execution_hard", ["clauses", "scenarios"])

if exec_id:
    payload = {"traces": [{"scenario_id": "scenario_01", "crashes": True, "crash_pair": {"clause_a_id": "clause_01", "clause_b_id": "clause_02"}}]}
    test("POST /execution/step", "POST", f"/execution/step?task_id=execution_easy&contract_id={exec_id}", ["score"], payload=payload)

lex_obs = test("POST /lexmind/reset?task_id=lexmind_easy", "POST", "/lexmind/reset?task_id=lexmind_easy", ["drafting_sequence"])
lex_id = lex_obs.get("contract_id") if isinstance(lex_obs, dict) else None

test("POST /lexmind/reset?task_id=lexmind_medium", "POST", "/lexmind/reset?task_id=lexmind_medium", ["drafting_sequence"])
test("POST /lexmind/reset?task_id=lexmind_hard", "POST", "/lexmind/reset?task_id=lexmind_hard", ["drafting_sequence"])

if lex_id:
    payload = {"steps": [{"event_id": "event_01", "introduces_contradiction": False}]}
    test("POST /lexmind/step", "POST", f"/lexmind/step?task_id=lexmind_easy&contract_id={lex_id}", ["score"], payload=payload)

test("GET /state", "GET", "/state?task_id=easy", ["episode_id"])

payload = {"episode_id": "test", "clause_texts": ["test clause 1", "test clause 2"]}
test("POST /fingerprint", "POST", "/fingerprint", ["overall_risk", "risk_label"], payload=payload)
