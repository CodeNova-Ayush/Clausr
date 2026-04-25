"""
Clausr — Inference Script
Follows the official OpenEnv inference.py format exactly.
"""

import os
import time
import json
import requests
from typing import List, Optional
from openai import OpenAI

# ── Environment variables ─────────────────────────────────────────────────────
# API_BASE_URL and MODEL_NAME have defaults (required by spec)
# HF_TOKEN must NOT have a default (required by spec)
API_BASE_URL = os.getenv("API_BASE_URL", "https://api.openai.com/v1")
MODEL_NAME   = os.getenv("MODEL_NAME",   "gpt-4o-mini")
HF_TOKEN     = os.getenv("HF_TOKEN")
ENV_BASE_URL = os.getenv("ENV_BASE_URL", "http://localhost:7860")

BENCHMARK = "clausr"

# ── OpenAI client ─────────────────────────────────────────────────────────────
client = OpenAI(
    api_key=HF_TOKEN or "dummy",
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
def run_episode(task_id: str) -> float:
    rewards: List[float] = []
    steps_taken = 0
    score = 0.001
    success = False

    log_start(task=task_id, env=BENCHMARK, model=MODEL_NAME)

    try:
        # Step 1 — Reset environment
        reset_resp = requests.post(
            f"{ENV_BASE_URL}/reset?task_id={task_id}",
            timeout=30
        )
        reset_resp.raise_for_status()
        obs = reset_resp.json()

        contract_text       = obs.get("contract_text", "")
        clauses             = obs.get("clauses", [])
        num_contradictions  = obs.get("num_contradictions", 1)
        instructions        = obs.get("instructions", "Find all contradictions in this contract.")

        # Step 2 — Build prompt
        clause_list = "\n".join([
            f"[{c['id']}] {c.get('title','')}: {c.get('text','')}"
            for c in clauses
        ])

        user_message = (
            f"{instructions}\n\n"
            f"IMPORTANT: There are exactly {num_contradictions} contradiction(s) in this contract. "
            f"Find all of them.\n\n"
            f"=== STRUCTURED CLAUSE LIST ===\n{clause_list}"
        )

        # Step 3 — Call LLM
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
        raw = raw.replace("```json", "").replace("```", "").strip()

        try:
            result_json = json.loads(raw)
            findings = result_json.get("findings", [])
        except Exception:
            findings = []

        action_str = f"submitted_{len(findings)}_findings"
        steps_taken = 1

        # Step 4 — Submit findings
        step_resp = requests.post(
            f"{ENV_BASE_URL}/step",
            json={"findings": findings},
            timeout=30
        )
        step_resp.raise_for_status()
        step_data = step_resp.json()

        score    = float(step_data.get("score", 0.001))
        feedback = step_data.get("feedback", "")
        done     = step_data.get("done", True)

        score   = max(0.001, min(0.999, score))
        reward  = score
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
        score   = 0.001
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


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    tasks  = ["easy", "medium", "hard"]
    adversarial_tasks = [
        "adversarial_easy", "adversarial_medium",
        "adversarial_hard", "adversarial_selfplay",
    ]
    curriculum_tasks = ["curriculum_standard", "curriculum_paired"]
    scores = {}

    for task_id in tasks:
        score = run_episode(task_id)
        scores[task_id] = score
        print("", flush=True)

    for task_id in adversarial_tasks:
        score = run_adversarial_episode(task_id)
        scores[task_id] = score
        print("", flush=True)

    for task_id in curriculum_tasks:
        score = run_curriculum_episode(task_id, num_episodes=3)
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
