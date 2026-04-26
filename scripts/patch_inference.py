import re

with open("inference.py", "r") as f:
    code = f.read()

# -----------------------------------------------------------------------------
# 1. Dispatch Updates in main()
# -----------------------------------------------------------------------------
main_dispatch = """        if task_id.startswith("timemachine_"):
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

code = re.sub(
    r'        if task_id\.startswith\("timemachine_"\):.*?else:\n            score = run_episode\(task_id\)',
    main_dispatch,
    code,
    flags=re.DOTALL
)

# -----------------------------------------------------------------------------
# 2. Add New Runners
# -----------------------------------------------------------------------------
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

# Insert new runners before run_adversarial_episode
code = code.replace("def run_adversarial_episode(task_id: str) -> float:", new_runners + "\ndef run_adversarial_episode(task_id: str) -> float:")

with open("inference.py", "w") as f:
    f.write(code)
