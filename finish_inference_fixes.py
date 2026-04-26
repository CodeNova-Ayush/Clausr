import re
import json

with open("inference.py", "r") as f:
    code = f.read()

# 1. Update Adversarial to handle roles
# We need to detect role from obs. If role is 'auditor', use auditor prompt.
adversarial_patch = """
    try:
        reset_resp = requests.post(
            f"{ENV_BASE_URL}/adversarial/reset?task_id={task_id}",
            timeout=30,
        )
        reset_resp.raise_for_status()
        obs = reset_resp.json()
        
        role = obs.get("role", "forger") # Default to forger if not specified
        
        clauses = obs.get("clauses", [])
        clause_list = "\\n".join([f"[{c['id']}] {c.get('title','')}: {c.get('text','')}" for c in clauses])

        if role == "forger":
            system_prompt = \"\"\"You are a contract forger.
Respond with ONLY a JSON object with keys: role as forger, target_clause_id as string, injected_text as string containing valid legal clause text, contradiction_type as one of numeric temporal conditional party_obligation termination. No markdown.\"\"\"
            user_msg = f"=== CLAUSES ===\\n{clause_list}\\n\\n{obs.get('instructions', '')}"
        else:
            system_prompt = \"\"\"You are a contract auditor.
Respond with ONLY a JSON object with keys: role as auditor, clause_a_id as string, clause_b_id as string, explanation as string. No markdown.\"\"\"
            user_msg = f"=== CLAUSES ===\\n{clause_list}\\n\\nFind the contradiction."

        completion = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_msg},
            ],
            max_tokens=2000,
            temperature=0.3 if role == "forger" else 0.0,
        )

        raw = (completion.choices[0].message.content or "").strip()
        if "easy" in task_id:
            print("RAW LLM RESPONSE: " + raw, flush=True)
        raw = raw.replace("```json", "").replace("```", "").strip()

        try:
            action_payload = json.loads(raw)
            if role == "auditor":
                # Normalize findings if it's an auditor
                if isinstance(action_payload, list):
                    raw_findings = action_payload
                else:
                    raw_findings = action_payload.get("findings", [action_payload])
                findings = [normalize_finding(f) for f in raw_findings if normalize_finding(f)]
                action_payload = {"findings": findings}
        except Exception:
            if role == "forger":
                action_payload = {
                    "target_clause_id": clauses[0]["id"] if clauses else "clause_01",
                    "injected_text": "All obligations shall be performed within forty-five (45) business days.",
                    "contradiction_type": "temporal",
                }
            else:
                action_payload = {"findings": []}

        if role == "forger":
            step_url = f"{ENV_BASE_URL}/adversarial/forger_step?task_id={task_id}"
            action_str = f"forger_inject_{action_payload.get('target_clause_id', 'unknown')}"
        else:
            step_url = f"{ENV_BASE_URL}/adversarial/auditor_step?task_id={task_id}"
            action_str = "auditor_submit_findings"

        steps_taken = 1
        step_resp = requests.post(step_url, json=action_payload, timeout=30)
        step_resp.raise_for_status()
        result = step_resp.json()

        score = float(result.get("score", result.get("forger_score", result.get("auditor_score", 0.001))))
"""

# Replace the body of run_adversarial_episode
code = re.sub(
    r'    try:\n        reset_resp = requests\.post\(.*?score = float\(result\.get\("forger_score", 0\.001\)\)',
    adversarial_patch,
    code,
    flags=re.DOTALL
)

# 2. Update Constitution prompt
constitution_prompt = 'You have received multiple contracts. Compare every clause in each contract against every clause in every other contract. Look for these conflict types: jurisdiction, IP ownership, liability cap, confidentiality scope, termination notice.\\nRespond with ONLY a JSON object with key cross_findings containing an array. Each element must have exactly: contract_a_id, clause_a_id, contract_b_id, clause_b_id, contradiction_type, explanation. No markdown.'
code = re.sub(
    r'CONSTITUTION_SYSTEM_PROMPT = """.*?"""',
    f'CONSTITUTION_SYSTEM_PROMPT = """{constitution_prompt}"""',
    code,
    flags=re.DOTALL
)

# 3. Update TimeMachine prompt
timemachine_prompt = 'You have received a contract version history. Compare each version to the previous version. Find which version first introduced a contradiction between two clauses that persists in all later versions.\\nRespond with ONLY a JSON object with key attribution containing: introduced_at_version as integer, introduced_by as either Drafter or Counterparty, clause_a_id as string, clause_b_id as string, explanation as string. No markdown.'
code = re.sub(
    r'TIMEMACHINE_SYSTEM_PROMPT = """.*?"""',
    f'TIMEMACHINE_SYSTEM_PROMPT = """{timemachine_prompt}"""',
    code,
    flags=re.DOTALL
)

# 4. Update Federated Regulator prompt (Aggressive)
federated_regulator_prompt = 'You are a strict legal regulator. Your goal is to flag ANY potential violation of the compliance frameworks (GDPR, SOX, etc.). \\nCRITICAL: Missing a violation is penalized much more heavily than a false positive. If a clause is even slightly suspicious or ambiguous, FLAG IT. \\nRespond with ONLY a JSON object with key flags containing an array. Each element must have: clause_id, violation_type, explanation. No markdown.'
code = re.sub(
    r'REGULATOR_SYSTEM_PROMPT = """.*?"""',
    f'REGULATOR_SYSTEM_PROMPT = """{federated_regulator_prompt}"""',
    code,
    flags=re.DOTALL
)

with open("inference.py", "w") as f:
    f.write(code)
