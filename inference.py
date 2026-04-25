"""
Clausr — Inference Script
Follows the official OpenEnv inference.py format exactly.
"""

import os
import time
import json
import requests
import re
from typing import List, Optional, Dict
from openai import OpenAI

# ── Environment variables ─────────────────────────────────────────────────────
# API_BASE_URL and MODEL_NAME have defaults (required by spec)
# HF_TOKEN must NOT have a default (required by spec)
API_BASE_URL = os.getenv("API_BASE_URL", "https://api.openai.com/v1")
MODEL_NAME   = os.getenv("MODEL_NAME",   "gpt-4o-mini")
HF_TOKEN     = os.getenv("HF_TOKEN")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
ENV_BASE_URL = os.getenv("ENV_BASE_URL", "http://localhost:7860")

BENCHMARK = "clausr"

# ── OpenAI client ─────────────────────────────────────────────────────────────
client = OpenAI(
    api_key=OPENAI_API_KEY or HF_TOKEN or "dummy",
    base_url=API_BASE_URL,
)

# ── Required log functions ─────────────────────────────────────────────────────
def log_start(task: str, env: str, model: str) -> None:
    print(f"[START] task={task} env={env} model={model}", flush=True)

def log_step(step: int, action: str, reward: float, done: bool, error: Optional[str]) -> None:
    error_val = error if error else "null"
    done_val  = str(done).lower()
    print(
        f"[STEP] step={step} action={action} reward={reward:.2f} done={done_val} error={error_val}",
        flush=True,
    )

def log_end(success: bool, steps: int, score: float, rewards: List[float]) -> None:
    rewards_str = ",".join(f"{r:.2f}" for r in rewards)
    print(
        f"[END] success={str(success).lower()} steps={steps} score={score:.3f} rewards={rewards_str}",
        flush=True,
    )

# ── System prompt for contradiction detection ─────────────────────────────────
SYSTEM_PROMPT = """You are a contract review specialist. Find all pairs of clauses that directly contradict each other within the same legal contract document.

You must follow the LexMind structural pipeline:
Step 1. Clause Indexing: Group clauses by topic (e.g., Liability, Payment, Termination).
Step 2. Cross-Reference Analysis: Think step-by-step to compare clauses within each topic and across related topics.
Step 3. Final Findings: Return the actual contradiction pairs.

A contradiction exists when:
- Two clauses make incompatible demands on the same obligation (e.g. different time periods for the same duty)
- One clause grants a right that another explicitly removes
- The same duty is assigned to different parties
- Notice periods that logically cannot both be satisfied
- The same term is defined differently in two places

Do NOT flag as contradictions:
- Clauses that apply to different scenarios (e.g. for cause vs for convenience)
- Clauses using notwithstanding language that intentionally overrides another
- Clauses covering complementary geographic or temporal scope

Respond ONLY with valid JSON — no markdown fences, no text outside JSON:
{
  "clause_indexing": {
    "topic_1": ["clause_01", "clause_02"],
    "topic_2": ["clause_03"]
  },
  "cross_reference_analysis": [
    "Analyzing topic_1: clause_01 says X, clause_02 says Y. This is a contradiction."
  ],
  "findings": [
    {
      "clause_a_id": "clause_03",
      "clause_b_id": "clause_07",
      "explanation": "clause_03 specifies 2 years but clause_07 specifies 36 months for the same confidentiality obligation"
    }
  ]
}

If no contradictions found, include empty findings list."""

# ── Run one episode ───────────────────────────────────────────────────────────
def extract_json_findings(raw_text: str) -> List[Dict]:
    print(f"RAW LLM RESPONSE (first 300 chars):\n{raw_text[:300]}\n" + "-"*40, flush=True)
    
    # Try to find JSON block
    match = re.search(r'\{.*\}', raw_text.replace('\n', ' '), re.DOTALL)
    if match:
        json_str = match.group(0)
    else:
        json_str = raw_text
        
    try:
        clean_str = json_str.replace("```json", "").replace("```", "").strip()
        data = json.loads(clean_str)
        findings = data.get("findings", [])
        
        cleaned_findings = []
        for f in findings:
            if isinstance(f, dict):
                clause_a = f.get("clause_a_id") or f.get("clause_a", "")
                clause_b = f.get("clause_b_id") or f.get("clause_b", "")
                explanation = f.get("explanation", "")
                if clause_a and clause_b:
                    cleaned_findings.append({
                        "clause_a_id": str(clause_a),
                        "clause_b_id": str(clause_b),
                        "explanation": str(explanation)
                    })
        return cleaned_findings
    except Exception as e:
        print(f"JSON parsing failed: {e}", flush=True)
        return []

def run_episode(task_id: str) -> float:
    rewards: List[float] = []
    steps_taken = 0
    score = 0.001
    success = False

    log_start(task=task_id, env=BENCHMARK, model=MODEL_NAME)

    try:
        reset_resp = requests.post(
            f"{ENV_BASE_URL}/reset?task_id={task_id}",
            timeout=30
        )
        reset_resp.raise_for_status()
        obs = reset_resp.json()

        clauses = obs.get("clauses", [])
        num_contradictions = obs.get("num_contradictions", 1)
        instructions = obs.get("instructions", "Find all contradictions in this contract.")

        clause_ids = [c["id"] for c in clauses]
        print(f"Loaded {len(clauses)} clauses. IDs: {clause_ids}", flush=True)

        if task_id == "hard":
            print("\n" + "="*50)
            print("CONTRACT DNA RISK FINGERPRINT")
            print("="*50)
            try:
                fp_resp = requests.post(
                    f"{ENV_BASE_URL}/fingerprint",
                    json={"clause_texts": [c["text"] for c in clauses]},
                    timeout=10
                )
                if fp_resp.status_code == 200:
                    fp = fp_resp.json()
                    print(f"Overall Risk: {fp['overall_risk']} ({fp['risk_label']})")
                    print(f"Dominant Risk: {fp['dominant_risk_type']}")
                    print(f"Numeric: {fp['numeric_risk']} | Temporal: {fp['temporal_risk']}")
                    print(f"Party Obligation: {fp['party_obligation_risk']} | Termination: {fp['termination_risk']}")
                    print(f"Conditional: {fp['conditional_risk']}")
            except Exception as e:
                print(f"Fingerprint failed: {e}")
            print("="*50 + "\n")
        
        if "easy" in task_id:
            max_pairs = 3
        elif "medium" in task_id:
            max_pairs = 6
        elif "hard" in task_id:
            max_pairs = 10
        else:
            max_pairs = 10

        all_findings = []

        if len(clauses) <= 15:
            clause_list = "\n".join([f"[{c['id']}] {c.get('title','')}: {c.get('text','')}" for c in clauses])
            user_message = (
                f"{instructions}\n\n"
                f"IMPORTANT: There are exactly {num_contradictions} contradiction(s) in this contract. "
                f"Find all of them.\n\n"
                f"=== STRUCTURED CLAUSE LIST ===\n{clause_list}"
            )
            completion = client.chat.completions.create(
                model=MODEL_NAME,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user",   "content": user_message},
                ],
                max_tokens=2000,
                temperature=0.0,
            )
            raw = (completion.choices[0].message.content or "").strip()
            all_findings.extend(extract_json_findings(raw))
            time.sleep(1)
        else:
            window_size = 12
            step_size = 10
            
            for i in range(0, len(clauses), step_size):
                chunk = clauses[i:i + window_size]
                if not chunk:
                    break
                
                clause_list = "\n".join([f"[{c['id']}] {c.get('title','')}: {c.get('text','')}" for c in chunk])
                user_message = (
                    f"{instructions}\n\n"
                    f"IMPORTANT: You are analyzing a small SUBSET of clauses from a larger contract.\n"
                    f"There is a very high probability that there are ZERO contradictions in this subset.\n"
                    f"If you do not see a direct, undeniable contradiction, return an empty findings array [].\n"
                    f"Do NOT force a contradiction where none exists. False positives are heavily penalized.\n\n"
                    f"=== STRUCTURED CLAUSE LIST ===\n{clause_list}"
                )
                
                try:
                    completion = client.chat.completions.create(
                        model=MODEL_NAME,
                        messages=[
                            {"role": "system", "content": SYSTEM_PROMPT},
                            {"role": "user",   "content": user_message},
                        ],
                        max_tokens=2000,
                        temperature=0.0,
                    )
                    raw = (completion.choices[0].message.content or "").strip()
                    findings = extract_json_findings(raw)
                    all_findings.extend(findings)
                except Exception as e:
                    print(f"Chunk processing error: {e}", flush=True)
                
                time.sleep(1)

        unique_findings = []
        seen_pairs = set()
        for f in all_findings:
            pair = tuple(sorted([f["clause_a_id"], f["clause_b_id"]]))
            if pair not in seen_pairs:
                seen_pairs.add(pair)
                unique_findings.append(f)

        final_findings = unique_findings[:max_pairs]
        print(f"\n[DEBUG] SUBMITTING {len(final_findings)} FINDINGS for {task_id}: {json.dumps(final_findings, indent=2)}\n", flush=True)
        action_str = f"submitted_{len(final_findings)}_findings"
        steps_taken = 1

        step_resp = requests.post(
            f"{ENV_BASE_URL}/step",
            json={"findings": final_findings},
            timeout=30
        )
        step_resp.raise_for_status()
        step_data = step_resp.json()

        score = float(step_data.get("score", 0.001))
        done = step_data.get("done", True)

        score = max(0.001, min(0.999, score))
        reward = score
        success = score > 0.001

        rewards.append(reward)

        log_step(
            step=1,
            action=action_str,
            reward=reward,
            done=done,
            error=None
        )

    except Exception as e:
        error_msg = str(e)
        steps_taken = max(steps_taken, 1)
        rewards = rewards or [0.001]
        log_step(step=steps_taken, action="error", reward=0.001, done=True, error=error_msg)
        score = 0.001
        success = False

    finally:
        log_end(success=success, steps=steps_taken, score=score, rewards=rewards)

    return score


# ── Adversarial Arena — Forger Prompt ────────────────────────────────────────
FORGER_SYSTEM_PROMPT = """You are a contract forger in an adversarial arena. Your goal is to inject a hidden logical contradiction into a clean contract that will evade detection by an auditor.

Requirements:
1. SEMANTICALLY DISTANT: The conflicting clauses must use completely different vocabulary
2. LEXICALLY NON-OVERLAPPING: No shared root words between the conflicting elements
3. CONTEXTUALLY PLAUSIBLE: Each clause must sound like legitimate contract boilerplate
4. LOGICALLY NON-OBVIOUS: The contradiction only emerges when both clauses are enforced simultaneously

Contradiction types: numeric, temporal, conditional, party_obligation, termination

Respond ONLY with valid JSON:
{
  "target_clause_id": "clause_XX",
  "modified_clause_text": "Modified version of the target clause",
  "injected_clause_text": "New clause to add that contradicts the modified clause",
  "inject_after_clause_id": "clause_XX",
  "claimed_contradiction_type": "one of the five types",
  "stealth_rationale": "Why this will evade detection"
}"""


def run_adversarial_episode(task_id: str) -> float:
    rewards: List[float] = []
    steps_taken = 0
    score = 0.001
    success = False

    log_start(task=task_id, env=BENCHMARK, model=MODEL_NAME)

    try:
        reset_resp = requests.post(
            f"{ENV_BASE_URL}/adversarial/reset?task_id={task_id}",
            timeout=30,
        )
        reset_resp.raise_for_status()
        obs = reset_resp.json()

        clauses = obs.get("clauses", [])
        taxonomy = obs.get("obligation_taxonomy", [])
        forbidden = obs.get("forbidden_lexical_patterns", [])

        clause_list = "\n".join([
            f"[{c['id']}] {c.get('title','')}: {c.get('text','')}"
            for c in clauses
        ])

        taxonomy_str = "\n".join([
            f"  {t['clause_id']}: {', '.join(t.get('obligations', []))}"
            for t in taxonomy
        ])

        user_message = (
            f"CONTRACT TITLE: {obs.get('contract_title', '')}\n\n"
            f"=== CLAUSES ===\n{clause_list}\n\n"
            f"=== OBLIGATION TAXONOMY ===\n{taxonomy_str}\n\n"
            f"=== FORBIDDEN LEXICAL PATTERNS ===\n{', '.join(forbidden)}\n\n"
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

        score = float(result.get("forger_score", 0.001))
        score = max(0.001, min(0.999, score))
        reward = score
        success = score > 0.001

        rewards.append(reward)

        log_step(
            step=1,
            action=action_str,
            reward=reward,
            done=result.get("done", True),
            error=None,
        )

    except Exception as e:
        error_msg = str(e)
        steps_taken = max(steps_taken, 1)
        rewards = rewards or [0.001]
        log_step(step=steps_taken, action="error", reward=0.001, done=True, error=error_msg)
        score = 0.001
        success = False

    finally:
        log_end(success=success, steps=steps_taken, score=score, rewards=rewards)

    return score


# ── CurriculumForge — Curriculum Episode ─────────────────────────────────────
def run_curriculum_episode(task_id: str, num_episodes: int = 5) -> float:
    rewards: List[float] = []
    steps_taken = 0
    score = 0.001
    success = False
    mode = "paired" if "paired" in task_id else "standard"

    log_start(task=task_id, env=BENCHMARK, model=MODEL_NAME)

    try:
        reg_resp = requests.post(
            f"{ENV_BASE_URL}/curriculum/register",
            json={"model_name": MODEL_NAME, "algorithm": "absolute_learning_progress"},
            timeout=30,
        )
        reg_resp.raise_for_status()
        run_id = reg_resp.json()["run_id"]

        episode_scores = []
        for ep in range(num_episodes):
            reset_resp = requests.post(
                f"{ENV_BASE_URL}/curriculum/reset?run_id={run_id}&mode={mode}",
                timeout=30,
            )
            reset_resp.raise_for_status()
            obs = reset_resp.json()

            selected_task = obs.get("selected_task", "easy")
            sub_env = obs.get("sub_environment", "detection")
            sub_obs = obs.get("sub_observation", {})

            if sub_env == "detection":
                clauses = sub_obs.get("clauses", [])
                num_contradictions = sub_obs.get("num_contradictions", 1)
                clause_list = "\n".join([
                    f"[{c['id']}] {c.get('title','')}: {c.get('text','')}"
                    for c in clauses
                ])
                user_msg = (
                    f"Find exactly {num_contradictions} contradiction(s).\n\n"
                    f"=== CLAUSES ===\n{clause_list}"
                )
                completion = client.chat.completions.create(
                    model=MODEL_NAME,
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_msg},
                    ],
                    max_tokens=2000, temperature=0.0,
                )
                raw = (completion.choices[0].message.content or "").strip()
                raw = raw.replace("```json", "").replace("```", "").strip()
                try:
                    findings = json.loads(raw).get("findings", [])
                except Exception:
                    findings = []
                action_payload = {"findings": findings}

            elif sub_env == "adversarial":
                clauses = sub_obs.get("clauses", [])
                clause_list = "\n".join([
                    f"[{c['id']}] {c.get('title','')}: {c.get('text','')}"
                    for c in clauses
                ])
                completion = client.chat.completions.create(
                    model=MODEL_NAME,
                    messages=[
                        {"role": "system", "content": FORGER_SYSTEM_PROMPT},
                        {"role": "user", "content": f"=== CLAUSES ===\n{clause_list}\n\n{sub_obs.get('instructions', '')}"},
                    ],
                    max_tokens=2000, temperature=0.3,
                )
                raw = (completion.choices[0].message.content or "").strip()
                raw = raw.replace("```json", "").replace("```", "").strip()
                try:
                    action_payload = json.loads(raw)
                except Exception:
                    action_payload = {
                        "target_clause_id": clauses[0]["id"] if clauses else "clause_01",
                        "modified_clause_text": "All obligations shall be performed within fifteen (15) business days.",
                        "injected_clause_text": "Deliverables require forty-five (45) calendar days from commencement.",
                        "inject_after_clause_id": clauses[-1]["id"] if clauses else "clause_01",
                        "claimed_contradiction_type": "temporal",
                        "stealth_rationale": "Fallback",
                    }
            else:
                action_payload = {"findings": []}

            step_resp = requests.post(
                f"{ENV_BASE_URL}/curriculum/step?run_id={run_id}",
                json=action_payload,
                timeout=30,
            )
            step_resp.raise_for_status()
            result = step_resp.json()

            ep_score = float(result.get("composite_score", 0.001))
            episode_scores.append(ep_score)
            rewards.append(ep_score)
            steps_taken += 1

            log_step(step=ep + 1, action=f"curriculum_{selected_task}", reward=ep_score, done=True, error=None)

        score = sum(episode_scores) / len(episode_scores) if episode_scores else 0.001
        score = max(0.001, min(0.999, score))
        success = score > 0.001

    except Exception as e:
        error_msg = str(e)
        steps_taken = max(steps_taken, 1)
        rewards = rewards or [0.001]
        log_step(step=steps_taken, action="error", reward=0.001, done=True, error=error_msg)
        score = 0.001
        success = False

    finally:
        log_end(success=success, steps=steps_taken, score=score, rewards=rewards)

    return score


# ── ConstitutionForge — Portfolio Episode ──────────────────────────────────────
CONSTITUTION_SYSTEM_PROMPT = """You are a contract review specialist analyzing a portfolio of contracts. Your goal is to find CROSS-CONTRACT contradictions.

A cross-contract contradiction occurs when two different contracts in the portfolio contain clauses that directly conflict with each other (e.g., Jurisdiction Conflict, Confidentiality Scope Conflict, IP Ownership Conflict, Liability Cap Conflict, Termination Notice Conflict).

You must also identify CASCADE CHAINS: where fixing one contradiction creates another contradiction (e.g., finding 0 and finding 1 share a contradictory clause in a way that creates a chain).

Respond ONLY with valid JSON — no markdown fences, no text outside JSON:
{
  "cross_findings": [
    {
      "contract_a_id": "contract_1",
      "clause_a_id": "clause_01",
      "contract_b_id": "contract_2",
      "clause_b_id": "clause_02",
      "contradiction_type": "Jurisdiction Conflict",
      "explanation": "..."
    }
  ],
  "cascade_chains": [
    [0, 1] 
  ]
}
If no contradictions found, include empty findings list.
"""

def run_constitution_episode(task_id: str) -> float:
    rewards: List[float] = []
    steps_taken = 0
    score = 0.001
    success = False

    log_start(task=task_id, env=BENCHMARK, model=MODEL_NAME)

    try:
        reset_resp = requests.post(
            f"{ENV_BASE_URL}/constitution/reset?task_id={task_id}",
            timeout=30
        )
        reset_resp.raise_for_status()
        obs = reset_resp.json()

        contracts = obs.get("contracts", [])
        instructions = obs.get("instructions", "")

        portfolio_str = "=== PORTFOLIO ===\n"
        for c in contracts:
            portfolio_str += f"\nContract ID: {c['contract_id']} (Type: {c['contract_type']})\n"
            for clause in c.get("clauses", []):
                portfolio_str += f"  [{clause['id']}] {clause.get('title', '')}: {clause.get('text', '')}\n"

        user_message = f"{instructions}\n\n{portfolio_str}"

        completion = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": CONSTITUTION_SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            max_tokens=2000,
            temperature=0.0,
        )
        raw = (completion.choices[0].message.content or "").strip()
        raw = raw.replace("```json", "").replace("```", "").strip()

        try:
            action_payload = json.loads(raw)
            if "cross_findings" not in action_payload:
                action_payload = {"cross_findings": [], "cascade_chains": []}
        except Exception:
            action_payload = {"cross_findings": [], "cascade_chains": []}

        steps_taken = 1

        step_resp = requests.post(
            f"{ENV_BASE_URL}/constitution/step?task_id={task_id}",
            json=action_payload,
            timeout=30
        )
        step_resp.raise_for_status()
        step_data = step_resp.json()

        score = float(step_data.get("score", 0.001))
        done = step_data.get("done", True)
        score = max(0.001, min(1.0, score))
        reward = score
        success = score > 0.001
        rewards.append(reward)

        log_step(step=1, action=f"submitted_{len(action_payload.get('cross_findings', []))}_findings", reward=reward, done=done, error=None)

    except Exception as e:
        error_msg = str(e)
        steps_taken = max(steps_taken, 1)
        rewards = rewards or [0.001]
        log_step(step=steps_taken, action="error", reward=0.001, done=True, error=error_msg)
        score = 0.001
        success = False
    finally:
        log_end(success=success, steps=steps_taken, score=score, rewards=rewards)

    return score


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    tasks  = ["medium", "hard", "constitution_easy", "constitution_medium", "constitution_hard"]
    scores = {}

    for task_id in tasks:
        if task_id.startswith("constitution_"):
            score = run_constitution_episode(task_id)
        else:
            score = run_episode(task_id)
        scores[task_id] = score
        print("", flush=True)

    mean_score = sum(scores.values()) / len(scores)

    print("=" * 50, flush=True)
    print("CLAUSR INFERENCE RESULTS", flush=True)
    print("=" * 50, flush=True)
    for task_id, score in scores.items():
        print(f"{task_id.upper():<25} {score:.4f}", flush=True)
    print(f"{'MEAN':<25} {mean_score:.4f}", flush=True)
    print("=" * 50, flush=True)


if __name__ == "__main__":
    main()
