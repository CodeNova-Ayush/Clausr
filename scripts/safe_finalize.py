import re
import json

with open("inference.py", "r") as f:
    code = f.read()

# 1. Dispatch Updates in main()
old_dispatch = """        if task_id.startswith("timemachine_"):
            score = run_timemachine_episode(task_id)
        elif task_id.startswith("federated_"):
            score = run_federated_episode(task_id)
        elif task_id.startswith("constitution_"):
            score = run_constitution_episode(task_id)
        # Note: adversarial, lexmind, execution, curriculum might need special runners 
        # but if they don't exist in inference.py currently, fallback to run_episode
        else:
            score = run_episode(task_id)"""

new_dispatch = """        if task_id.startswith("timemachine_"):
            score = run_timemachine_episode(task_id)
        elif task_id.startswith("federated_"):
            score = run_federated_episode(task_id)
        elif task_id.startswith("constitution_"):
            score = run_constitution_episode(task_id)
        elif task_id.startswith("execution_"):
            score = run_execution_episode(task_id)
        elif task_id.startswith("lexmind_"):
            score = run_lexmind_episode(task_id)
        elif task_id.startswith("adversarial_"):
            score = run_adversarial_episode(task_id)
        elif task_id.startswith("curriculum_"):
            score = run_curriculum_episode(task_id)
        else:
            score = run_episode(task_id)"""

code = code.replace(old_dispatch, new_dispatch)

# 2. Add New Runners (Execution, LexMind)
new_runners = """
# ── Execution Environment ────────────────────────────────────────────────────
def run_execution_episode(task_id: str) -> float:
    rewards = []
    steps_taken = 0
    score = 0.001
    success = False
    log_start(task=task_id, env=BENCHMARK, model=MODEL_NAME)
    try:
        reset_resp = requests.post(f"{ENV_BASE_URL}/reset?task_id={task_id}", timeout=30)
        reset_resp.raise_for_status()
        obs = reset_resp.json()
        
        system_prompt = \"\"\"You are a contract execution simulator.
Respond with ONLY a JSON object with key scenario_analyses containing an array. Each element must have exactly these keys: scenario_id, crashes as boolean, crash_pair as array of two clause ID strings, crash_description as string. Use exact scenario_id and clause_id values from the observation. No markdown.\"\"\"
        
        user_message = f"=== OBSERVATION ===\\n{json.dumps(obs, indent=2)}\\nAnalyze execution."
        completion = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            max_tokens=2000, temperature=0.0,
        )
        raw = (completion.choices[0].message.content or "").strip()
        raw = raw.replace("```json", "").replace("```", "").strip()
        try:
            parsed = json.loads(raw)
            analyses = parsed if isinstance(parsed, list) else parsed.get("scenario_analyses", [])
            normalized = []
            for a in analyses:
                if not isinstance(a, dict): continue
                crashes_val = a.get("crashes", a.get("is_crash", a.get("has_crash", a.get("crash", False))))
                pair_val = a.get("crash_pair", a.get("clause_pair", a.get("conflicting_clauses", a.get("crashed_clauses", []))))
                normalized.append({
                    "scenario_id": str(a.get("scenario_id", "")),
                    "crashes": bool(crashes_val),
                    "crash_pair": pair_val,
                    "crash_description": str(a.get("crash_description", ""))
                })
        except Exception:
            normalized = []
            
        action_payload = {"scenario_analyses": normalized}
        steps_taken = 1
        step_resp = requests.post(f"{ENV_BASE_URL}/execution/step?task_id={task_id}", json=action_payload, timeout=30)
        step_resp.raise_for_status()
        step_data = step_resp.json()
        score = max(0.001, min(0.999, float(step_data.get("score", 0.001))))
        success = score > 0.001
        rewards.append(score)
        log_step(1, "submit_analyses", score, True, None)
    except Exception as e:
        steps_taken = max(1, steps_taken)
        rewards.append(0.001)
        log_step(steps_taken, "error", 0.001, True, str(e))
    finally:
        log_end(success, steps_taken, score, rewards)
    return score

# ── LexMind Environment ──────────────────────────────────────────────────────
def run_lexmind_episode(task_id: str) -> float:
    rewards = []
    steps_taken = 0
    score = 0.001
    success = False
    log_start(task=task_id, env=BENCHMARK, model=MODEL_NAME)
    try:
        reset_resp = requests.post(f"{ENV_BASE_URL}/reset?task_id={task_id}", timeout=30)
        reset_resp.raise_for_status()
        obs = reset_resp.json()
        
        system_prompt = \"\"\"You are analyzing a sequence of contract drafting events.
Respond with ONLY a JSON object with key predictions containing an array. Each element must have exactly: event_id, introduces_contradiction as boolean, contradicts_clause_id as string or null, contradiction_type as string or null. Use exact event_id values from the drafting sequence. No markdown.\"\"\"
        
        user_message = f"=== OBSERVATION ===\\n{json.dumps(obs, indent=2)}\\nAnalyze drafting sequence."
        completion = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            max_tokens=2000, temperature=0.0,
        )
        raw = (completion.choices[0].message.content or "").strip()
        raw = raw.replace("```json", "").replace("```", "").strip()
        try:
            parsed = json.loads(raw)
            preds = parsed if isinstance(parsed, list) else parsed.get("predictions", [])
            normalized = []
            for p in preds:
                if not isinstance(p, dict): continue
                intro_val = p.get("introduces_contradiction", p.get("has_contradiction", p.get("is_contradiction", p.get("contradicts", False))))
                normalized.append({
                    "event_id": str(p.get("event_id", "")),
                    "introduces_contradiction": bool(intro_val),
                    "contradicts_clause_id": p.get("contradicts_clause_id"),
                    "contradiction_type": p.get("contradiction_type")
                })
        except Exception:
            normalized = []
            
        action_payload = {"predictions": normalized}
        steps_taken = 1
        step_resp = requests.post(f"{ENV_BASE_URL}/lexmind/step?task_id={task_id}", json=action_payload, timeout=30)
        step_resp.raise_for_status()
        step_data = step_resp.json()
        score = max(0.001, min(0.999, float(step_data.get("score", 0.001))))
        success = score > 0.001
        rewards.append(score)
        log_step(1, "submit_predictions", score, True, None)
    except Exception as e:
        steps_taken = max(1, steps_taken)
        rewards.append(0.001)
        log_step(steps_taken, "error", 0.001, True, str(e))
    finally:
        log_end(success, steps_taken, score, rewards)
    return score
"""

# Insert before run_adversarial_episode
code = code.replace("def run_adversarial_episode(task_id: str) -> float:", new_runners + "\\ndef run_adversarial_episode(task_id: str) -> float:")

# 3. Update Adversarial to handle roles
old_adversarial_body = """    try:
        reset_resp = requests.post(
            f"{ENV_BASE_URL}/adversarial/reset?task_id={task_id}",
            timeout=30,
        )
        reset_resp.raise_for_status()
        obs = reset_resp.json()

        clauses = obs.get("clauses", [])
        taxonomy = obs.get("obligation_taxonomy", [])
        forbidden = obs.get("forbidden_lexical_patterns", [])

        clause_list = "\\n".join([
            f"[{c['id']}] {c.get('title','')}: {c.get('text','')}"
            for c in clauses
        ])

        taxonomy_str = "\\n".join([
            f"  {t['clause_id']}: {', '.join(t.get('obligations', []))}"
            for t in taxonomy
        ])

        user_message = (
            f"CONTRACT TITLE: {obs.get('contract_title', '')}\\n\\n"
            f"=== CLAUSES ===\\n{clause_list}\\n\\n"
            f"=== OBLIGATION TAXONOMY ===\\n{taxonomy_str}\\n\\n"
            f"=== FORBIDDEN LEXICAL PATTERNS ===\\n{', '.join(forbidden)}\\n\\n"
            f"{obs.get('instructions', '')}"
        )

        completion = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": FORGER_SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            max_tokens=2000,
            temperature=0.3,
        )

        raw = (completion.choices[0].message.content or "").strip()
        raw = raw.replace("```json", "").replace("```", "").strip()

        try:
            forger_action = json.loads(raw)
        except Exception:
            forger_action = {
                "target_clause_id": clauses[0]["id"] if clauses else "clause_01",
                "modified_clause_text": "All obligations under this agreement shall be performed within fifteen (15) business days.",
                "injected_clause_text": "The contracted deliverables require a minimum processing window of forty-five (45) calendar days from commencement.",
                "inject_after_clause_id": clauses[-1]["id"] if clauses else "clause_01",
                "claimed_contradiction_type": "temporal",
                "stealth_rationale": "Fallback injection",
            }

        action_str = f"forger_inject_{forger_action.get('target_clause_id', 'unknown')}"
        steps_taken = 1

        step_resp = requests.post(
            f"{ENV_BASE_URL}/adversarial/forger_step?task_id={task_id}",
            json=forger_action,
            timeout=30,
        )
        step_resp.raise_for_status()
        result = step_resp.json()

        score = float(result.get("forger_score", 0.001))"""

new_adversarial_body = """    try:
        reset_resp = requests.post(
            f"{ENV_BASE_URL}/adversarial/reset?task_id={task_id}",
            timeout=30,
        )
        reset_resp.raise_for_status()
        obs = reset_resp.json()
        
        role = obs.get("role", "forger") 
        clauses = obs.get("clauses", [])
        clause_list = "\\n".join([f"[{c['id']}] {c.get('title','')}: {c.get('text','')}" for c in clauses])

        if role == "forger":
            system_prompt = \"\"\"Respond with ONLY a JSON object with keys: role as forger, target_clause_id as string, injected_text as string containing valid legal clause text, contradiction_type as one of numeric temporal conditional party_obligation termination. No markdown.\"\"\"
            user_msg = f"=== CLAUSES ===\\n{clause_list}\\n\\n{obs.get('instructions', '')}"
        else:
            system_prompt = \"\"\"Respond with ONLY a JSON object with keys: role as auditor, clause_a_id as string, clause_b_id as string, explanation as string. No markdown.\"\"\"
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
        raw = raw.replace("```json", "").replace("```", "").strip()

        try:
            action_payload = json.loads(raw)
            if role == "auditor":
                raw_findings = action_payload if isinstance(action_payload, list) else action_payload.get("findings", [action_payload])
                findings = [normalize_finding(f) for f in raw_findings if normalize_finding(f)]
                action_payload = {"findings": findings}
        except Exception:
            if role == "forger":
                action_payload = {"role": "forger", "target_clause_id": clauses[0]["id"] if clauses else "clause_01", "injected_text": "All obligations shall be performed within forty-five (45) days.", "contradiction_type": "temporal"}
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
        score = float(result.get("score", result.get("forger_score", result.get("auditor_score", 0.001))))"""

code = code.replace(old_adversarial_body, new_adversarial_body)

# 4. Prompt Updates
code = re.sub(
    r'CONSTITUTION_SYSTEM_PROMPT = """.*?"""',
    'CONSTITUTION_SYSTEM_PROMPT = \"\"\"You have received multiple contracts. Compare every clause in each contract against every clause in every other contract. Look for these conflict types: jurisdiction, IP ownership, liability cap, confidentiality scope, termination notice.\\nRespond with ONLY a JSON object with key cross_findings containing an array. Each element must have exactly: contract_a_id, clause_a_id, contract_b_id, clause_b_id, contradiction_type, explanation. No markdown.\"\"\"',
    code, flags=re.DOTALL
)

code = re.sub(
    r'TIMEMACHINE_SYSTEM_PROMPT = """.*?"""',
    'TIMEMACHINE_SYSTEM_PROMPT = \"\"\"You have received a contract version history. Compare each version to the previous version. Find which version first introduced a contradiction between two clauses that persists in all later versions.\\nRespond with ONLY a JSON object with key attribution containing: introduced_at_version as integer, introduced_by as either Drafter or Counterparty, clause_a_id as string, clause_b_id as string, explanation as string. No markdown.\"\"\"',
    code, flags=re.DOTALL
)

code = re.sub(
    r'REGULATOR_SYSTEM_PROMPT = """.*?"""',
    'REGULATOR_SYSTEM_PROMPT = \"\"\"You are a strict legal regulator. Your goal is to flag ANY potential violation of the compliance frameworks (GDPR, SOX, etc.). \\nCRITICAL: Missing a violation is penalized much more heavily than a false positive. If a clause is even slightly suspicious or ambiguous, FLAG IT. \\nRespond with ONLY a JSON object with key flags containing an array. Each element must have: clause_id, violation_type, explanation. No markdown.\"\"\"',
    code, flags=re.DOTALL
)

with open("inference.py", "w") as f:
    f.write(code)
