"""
Clausr — Optimized Inference Script
Follows the official OpenEnv [START]/[STEP]/[END] format exactly.
Designed for maximum score across easy, medium, and hard tasks.
"""

import os
import json
import time
import requests
from typing import List, Optional
from openai import OpenAI

# ── Environment variables (spec-compliant) ────────────────────────────────────
API_BASE_URL = os.getenv("API_BASE_URL", "https://api.openai.com/v1")
MODEL_NAME   = os.getenv("MODEL_NAME",   "gpt-4o-mini")
HF_TOKEN     = os.getenv("HF_TOKEN")          # NO default — required by spec
ENV_BASE_URL = os.getenv("ENV_BASE_URL", "http://localhost:7860")
BENCHMARK    = "clausr"

client = OpenAI(
    api_key=HF_TOKEN or "dummy",
    base_url=API_BASE_URL,
)

# ── Official log functions ────────────────────────────────────────────────────
def log_start(task: str, env: str, model: str) -> None:
    print(f"[START] task={task} env={env} model={model}", flush=True)

def log_step(step: int, action: str, reward: float, done: bool, error: Optional[str]) -> None:
    print(
        f"[STEP] step={step} action={action} reward={reward:.2f} "
        f"done={str(done).lower()} error={error if error else 'null'}",
        flush=True,
    )

def log_end(success: bool, steps: int, score: float, rewards: List[float]) -> None:
    print(
        f"[END] success={str(success).lower()} steps={steps} "
        f"score={score:.3f} rewards={','.join(f'{r:.2f}' for r in rewards)}",
        flush=True,
    )

# ── System prompt — expert-level contradiction detection ─────────────────────
SYSTEM_PROMPT = """You are a world-class contract attorney specializing in identifying internal contradictions within legal documents. Your analysis is methodical, precise, and exhaustive.

A REAL contradiction requires ALL of these to be true:
1. Both clauses address the SAME subject matter, obligation, right, or defined term
2. The clauses make INCOMPATIBLE demands — both cannot be simultaneously satisfied
3. There is no override language (notwithstanding, subject to, except as provided) making one clause intentionally supersede the other
4. The clauses are not addressing different parties, different time periods, or different geographic territories that would make them complementary

The FIVE contradiction types you must detect:
TYPE 1 — Numeric/Temporal: Same obligation, different numbers (e.g. "2 years" vs "36 months" for the same confidentiality duty)
TYPE 2 — Scope Conflict: One clause explicitly grants a right, another explicitly removes the same right (e.g. license permits sublicensing, another clause prohibits it)
TYPE 3 — Party Obligation: The exact same duty is assigned to different parties (e.g. Supplier shall maintain backups vs Client shall maintain backups)
TYPE 4 — Termination/Renewal: Notice periods that make it mathematically impossible to exercise a right (e.g. 30-day termination notice vs 90-day cancellation window for auto-renewal)
TYPE 5 — Definition Conflict: The same defined term is given different meanings in different clauses (e.g. Business Day = Mon-Fri in one place, includes Saturdays in another)

DO NOT flag these — they are NOT contradictions:
- Different notice periods for different scenarios (termination for cause vs for convenience)
- "Notwithstanding clause X" — this is an intentional legal override, not a conflict
- One clause applying inside a Territory, another applying outside — they are complementary
- A clause that adds conditions to another without contradicting it
- Different obligations applying to different time periods that do not overlap

STRATEGY FOR FINDING ALL CONTRADICTIONS:
1. First, extract every numeric value (numbers, time periods, dollar amounts) and check if the same obligation has different numbers elsewhere
2. Then scan for every right that is granted — check if it is also restricted elsewhere
3. Then check every obligation (shall, must, responsible for) — verify the same duty is not assigned to different parties
4. Then check all termination and renewal provisions — calculate if notice windows overlap impossibly
5. Finally check all defined terms — verify each term has exactly one consistent definition

You will be told the EXACT number of contradictions to find. Find ALL of them. Missing one costs you points. Each false positive also costs you points.

Respond ONLY with valid JSON. No markdown fences. No text before or after the JSON:
{
  "findings": [
    {
      "clause_a_id": "clause_03",
      "clause_b_id": "clause_07",
      "explanation": "clause_03 sets the confidentiality period at 2 years from disclosure but clause_07 sets it at 36 months from termination — same obligation, incompatible durations"
    }
  ]
}

If zero contradictions: {"findings": []}"""


def call_llm_with_retry(messages: list, max_retries: int = 3) -> str:
    """Call LLM with retry logic for robustness."""
    for attempt in range(max_retries):
        try:
            completion = client.chat.completions.create(
                model=MODEL_NAME,
                messages=messages,
                max_tokens=3000,
                temperature=0.0,
            )
            return (completion.choices[0].message.content or "").strip()
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            time.sleep(2 ** attempt)
    return ""


def parse_findings(raw: str) -> list:
    """Parse LLM output into findings list, handling common formatting issues."""
    raw = raw.replace("```json", "").replace("```", "").strip()

    # Find the first { in case model adds preamble text
    start = raw.find("{")
    if start > 0:
        raw = raw[start:]

    # Find matching closing brace
    depth = 0
    end = len(raw)
    for i, ch in enumerate(raw):
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                end = i + 1
                break
    raw = raw[:end]

    try:
        data = json.loads(raw)
        findings = data.get("findings", [])
        valid = []
        for f in findings:
            if "clause_a_id" in f and "clause_b_id" in f:
                valid.append({
                    "clause_a_id": str(f["clause_a_id"]).strip(),
                    "clause_b_id": str(f["clause_b_id"]).strip(),
                    "explanation": str(f.get("explanation", "contradiction detected")).strip()
                })
        return valid
    except Exception:
        return []


def build_prompt(obs: dict) -> str:
    """Build the most effective possible prompt for contradiction detection."""
    contract_text      = obs.get("contract_text", "")
    clauses            = obs.get("clauses", [])
    num_contradictions = obs.get("num_contradictions", 1)
    instructions       = obs.get("instructions", "Find all contradictions.")

    clause_lines = []
    for c in clauses:
        cid   = c.get("id", "")
        title = c.get("title", "")
        text  = c.get("text", "")
        clause_lines.append(f"[{cid}] {title}\n  {text}")
    clause_block = "\n\n".join(clause_lines)

    prompt = f"""{instructions}

CRITICAL: This contract contains EXACTLY {num_contradictions} contradiction(s).
You must find ALL {num_contradictions} of them. No more, no fewer.
Each missed contradiction reduces your score. Each false positive also reduces your score.

Work through the contract systematically using the 5-step strategy:
Step 1: Find all numeric/temporal conflicts (numbers, time periods, amounts)
Step 2: Find all scope conflicts (rights granted vs rights removed)
Step 3: Find all party obligation conflicts (same duty, different parties)
Step 4: Find all termination/renewal conflicts (overlapping notice windows)
Step 5: Find all definition conflicts (same term, different meanings)

=== FULL CONTRACT TEXT ===
{contract_text}

=== STRUCTURED CLAUSE LIST (use these exact IDs in your findings) ===
{clause_block}

Remember: Find exactly {num_contradictions} contradiction(s). Output JSON only."""

    return prompt


def run_episode(task_id: str) -> float:
    """Run one complete episode and return the score."""
    rewards: List[float] = []
    steps_taken = 0
    score   = 0.0
    success = False

    log_start(task=task_id, env=BENCHMARK, model=MODEL_NAME)

    try:
        # Reset
        reset_resp = requests.post(
            f"{ENV_BASE_URL}/reset?task_id={task_id}",
            timeout=30
        )
        reset_resp.raise_for_status()
        obs = reset_resp.json()

        num_contradictions = obs.get("num_contradictions", 1)

        # First LLM call
        user_prompt = build_prompt(obs)
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": user_prompt},
        ]

        raw      = call_llm_with_retry(messages)
        findings = parse_findings(raw)

        # Self-correction pass — if finding count is wrong, ask model to revise
        if len(findings) != num_contradictions and num_contradictions > 0:
            if len(findings) > num_contradictions:
                review_msg = (
                    f"You found {len(findings)} contradictions but there are EXACTLY {num_contradictions}. "
                    f"You have {len(findings) - num_contradictions} false positive(s). "
                    f"Review each finding and remove any that involve: different contexts (for cause vs convenience), "
                    f"notwithstanding/override language, or complementary geographic/temporal scope. "
                    f"Output corrected JSON with exactly {num_contradictions} finding(s)."
                )
            else:
                review_msg = (
                    f"You found {len(findings)} contradictions but there are EXACTLY {num_contradictions}. "
                    f"You are missing {num_contradictions - len(findings)} contradiction(s). "
                    f"Re-examine every clause pair carefully. Focus especially on: "
                    f"numbers appearing in multiple clauses for the same obligation, "
                    f"rights that are both granted and restricted, "
                    f"the same duty assigned to different parties, "
                    f"and defined terms used inconsistently. "
                    f"Output corrected JSON with exactly {num_contradictions} finding(s)."
                )

            messages_v2 = messages + [
                {"role": "assistant", "content": raw},
                {"role": "user",      "content": review_msg},
            ]
            raw2      = call_llm_with_retry(messages_v2)
            findings2 = parse_findings(raw2)

            # Use whichever result is closer to the target count
            diff1 = abs(len(findings)  - num_contradictions)
            diff2 = abs(len(findings2) - num_contradictions)
            if diff2 <= diff1:
                findings = findings2

        action_str  = f"submitted_{len(findings)}_findings"
        steps_taken = 1

        # Submit to grader
        step_resp = requests.post(
            f"{ENV_BASE_URL}/step",
            json={"findings": findings},
            timeout=30
        )
        step_resp.raise_for_status()
        step_data = step_resp.json()

        score   = float(step_data.get("score", 0.0))
        done    = bool(step_data.get("done",   True))
        score   = max(0.0, min(1.0, score))
        reward  = score
        success = score > 0.5
        rewards.append(reward)

        log_step(step=1, action=action_str, reward=reward, done=done, error=None)

    except Exception as e:
        error_msg   = str(e)[:120]
        steps_taken = max(steps_taken, 1)
        if not rewards:
            rewards = [0.0]
        score   = 0.0
        success = False
        log_step(step=steps_taken, action="error", reward=0.0, done=True, error=error_msg)

    finally:
        log_end(success=success, steps=steps_taken, score=score, rewards=rewards)

    return score


def main():
    tasks  = ["easy", "medium", "hard"]
    scores = {}

    for task_id in tasks:
        score = run_episode(task_id)
        scores[task_id] = score
        print("", flush=True)

    mean_score = sum(scores.values()) / len(scores)

    print("=" * 50, flush=True)
    print("CLAUSR — INFERENCE RESULTS", flush=True)
    print("=" * 50, flush=True)
    for task_id, s in scores.items():
        bar = "█" * int(s * 20) + "░" * (20 - int(s * 20))
        print(f"{task_id.upper():<10} {s:.4f}  {bar}", flush=True)
    print(f"{'MEAN':<10} {mean_score:.4f}", flush=True)
    print("=" * 50, flush=True)


if __name__ == "__main__":
    main()
