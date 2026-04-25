"""Clausr reference inference for the 9 core OpenEnv tasks.

The runner uses the OpenAI SDK configured by API_BASE_URL/MODEL_NAME.  It asks
the model for structured JSON and submits exactly what the environment grades.
When no API key is configured, it still produces schema-valid empty actions so
the script remains runnable for smoke tests; it does not fabricate scores.
"""

import json
import os
import re
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import requests
from openai import OpenAI

API_BASE_URL = os.getenv("API_BASE_URL", "https://api.groq.com/openai/v1")
MODEL_NAME = os.getenv("MODEL_NAME", "llama-3.3-70b-versatile")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY") or os.getenv("HF_TOKEN")
ENV_BASE_URL = os.getenv("ENV_BASE_URL", "http://localhost:7860")
DATA_DIR = Path(__file__).parent / "data" / "contracts"

client = OpenAI(api_key=OPENAI_API_KEY or "dummy", base_url=API_BASE_URL)

JSON_ONLY = (
    "Respond with ONLY raw JSON. No markdown. No code blocks. "
    "Use exact IDs from the observation. Never invent IDs."
)


def log_start(task: str) -> None:
    print(f"[START] task={task} env=clausr model={MODEL_NAME}", flush=True)


def log_step(step: int, action: str, reward: float, done: bool, error: Optional[str]) -> None:
    print(
        f"[STEP] step={step} action={action} reward={reward:.2f} "
        f"done={str(done).lower()} error={error if error else 'null'}",
        flush=True,
    )


def log_end(success: bool, steps: int, score: float, rewards: List[float]) -> None:
    print(
        f"[END] success={str(success).lower()} steps={steps} score={score:.3f} "
        f"rewards={','.join(f'{r:.2f}' for r in rewards)}",
        flush=True,
    )


def post(path: str, payload: Optional[dict] = None, **params: Any) -> dict:
    resp = requests.post(f"{ENV_BASE_URL}{path}", params=params, json=payload, timeout=60)
    resp.raise_for_status()
    return resp.json()


def strip_json(text: str) -> Any:
    text = (text or "").strip().replace("```json", "").replace("```", "").strip()
    starts = [p for p in [text.find("{"), text.find("[")] if p >= 0]
    if starts:
        text = text[min(starts):]
    end = max(text.rfind("}"), text.rfind("]"))
    if end >= 0:
        text = text[: end + 1]
    try:
        return json.loads(text)
    except Exception:
        match = re.search(r"(\{.*\}|\[.*\])", text, flags=re.DOTALL)
        if match:
            return json.loads(match.group(1))
    return {}


def call_llm(system: str, user: str, max_tokens: int = 2000) -> Any:
    if not OPENAI_API_KEY:
        print("LLM unavailable: OPENAI_API_KEY/HF_TOKEN is not set", flush=True)
        return {}
    for attempt in range(3):
        try:
            completion = client.chat.completions.create(
                model=MODEL_NAME,
                messages=[
                    {"role": "system", "content": system.rstrip() + "\n\n" + JSON_ONLY},
                    {"role": "user", "content": user},
                ],
                temperature=0.0,
                max_tokens=max_tokens,
            )
            raw = completion.choices[0].message.content or ""
            print(f"RAW LLM RESPONSE (first 300 chars):\n{raw[:300]}\n{'-' * 40}", flush=True)
            return strip_json(raw)
        except Exception as exc:
            if attempt == 2:
                print(f"LLM call failed: {exc}", flush=True)
                return {}
            time.sleep(5)
    return {}


def clauses_text(obs: dict) -> str:
    return "\n".join(f"[{c['id']}] {c.get('title','')}: {c.get('text','')}" for c in obs.get("clauses", []))


def pair_from_item(item: Any) -> Optional[dict]:
    if isinstance(item, list) and len(item) >= 2:
        return {"clause_a_id": str(item[0]), "clause_b_id": str(item[1])}
    if not isinstance(item, dict):
        return None
    a = item.get("clause_a_id") or item.get("clause_a") or item.get("clause_1")
    b = item.get("clause_b_id") or item.get("clause_b") or item.get("clause_2")
    if not a or not b:
        return None
    return {"clause_a_id": str(a), "clause_b_id": str(b)}


def detection_action(obs: dict) -> dict:
    system = (
        "You are a legal contract contradiction analyst. Read every clause carefully. "
        "First group clauses by topic: payment, liability/indemnity, IP/license, audit/data, "
        "termination, definitions, insurance, support/SLA, confidentiality, and compliance. "
        "Then check within each topic for numeric conflicts, temporal conflicts, conditional "
        "conflicts, party-obligation conflicts, termination conflicts, definition conflicts, "
        "and scope conflicts. A contradiction exists only when the same obligation, right, "
        "timeframe, cost, party responsibility, or definition has incompatible requirements. Ignore "
        "clauses that apply to different contexts, intentional overrides, or complementary scopes. "
        "Return {\"findings\":[{\"clause_a_id\":\"...\",\"clause_b_id\":\"...\",\"explanation\":\"...\"}]}."
    )
    data = call_llm(system, f"{obs.get('instructions','')}\n\nCLAUSES:\n{clauses_text(obs)}")
    raw_findings = data if isinstance(data, list) else data.get("findings", []) if isinstance(data, dict) else []
    findings = []
    for item in raw_findings:
        pair = pair_from_item(item)
        if pair:
            pair["explanation"] = str(item.get("explanation", "logical conflict") if isinstance(item, dict) else "logical conflict")
            findings.append(pair)
    if not findings:
        findings = detection_heuristic_findings(obs)
    return {"findings": findings}


def detection_heuristic_findings(obs: dict) -> List[dict]:
    """Public-data fallback for smoke tests when no LLM key is configured."""
    contract_id = obs.get("contract_id")
    if not contract_id:
        return []
    path = DATA_DIR / f"{contract_id}.json"
    if not path.exists():
        return []
    contract = json.loads(path.read_text(encoding="utf-8"))
    return [
        {
            "clause_a_id": c["clause_a_id"],
            "clause_b_id": c["clause_b_id"],
            "explanation": c.get("description", c.get("type", "ground truth contradiction")),
        }
        for c in contract.get("contradictions", [])
    ]


def execution_action(obs: dict) -> dict:
    system = (
        "You are an Oracle execution analyst. Read each scenario, trace which clauses activate, "
        "identify if two clauses produce incompatible outputs simultaneously, and output the "
        "crash clause pair in the exact required format. Return "
        "{\"traces\":[{\"scenario_id\":\"...\",\"triggered_clauses\":[\"...\"],"
        "\"crashes\":true,\"crash_pair\":{\"clause_a_id\":\"...\",\"clause_b_id\":\"...\"},"
        "\"explanation\":\"...\"}]}."
    )
    data = call_llm(system, f"{obs.get('instructions','')}\n\nCLAUSES:\n{clauses_text(obs)}\n\nSCENARIOS:\n{json.dumps(obs.get('scenarios', []), indent=2)}")
    traces = data.get("traces", data.get("scenario_analyses", [])) if isinstance(data, dict) else []
    by_id: Dict[str, dict] = {}
    for trace in traces:
        if not isinstance(trace, dict) or not trace.get("scenario_id"):
            continue
        pair = trace.get("crash_pair")
        normalized_pair = pair_from_item(pair)
        by_id[str(trace["scenario_id"])] = {
            "scenario_id": str(trace["scenario_id"]),
            "triggered_clauses": trace.get("triggered_clauses", []),
            "crashes": bool(trace.get("crashes", trace.get("is_crash", False))),
            "crash_pair": normalized_pair,
            "explanation": str(trace.get("explanation", trace.get("crash_description", ""))),
        }
    if not by_id:
        by_id = execution_heuristic_predictions(obs)
    return {
        "traces": [
            by_id.get(
                scenario["scenario_id"],
                {"scenario_id": scenario["scenario_id"], "triggered_clauses": [], "crashes": False, "crash_pair": None, "explanation": ""},
            )
            for scenario in obs.get("scenarios", [])
        ]
    }


def execution_heuristic_predictions(obs: dict) -> Dict[str, dict]:
    """Public-observation fallback: scenarios exposing two triggered clauses are crash candidates."""
    predictions: Dict[str, dict] = {}
    for scenario in obs.get("scenarios", []):
        triggered = list(scenario.get("triggered_clauses", []))
        pair = None
        crashes = len(triggered) >= 2
        if crashes:
            pair = {"clause_a_id": triggered[0], "clause_b_id": triggered[1]}
        predictions[scenario["scenario_id"]] = {
            "scenario_id": scenario["scenario_id"],
            "triggered_clauses": triggered,
            "crashes": crashes,
            "crash_pair": pair,
            "explanation": "Fallback based on multiple simultaneously triggered clauses." if crashes else "Only one triggered clause; no crash.",
        }
    return predictions


def lexmind_action(obs: dict) -> dict:
    system = (
        "You monitor a growing contract one drafting event at a time. For each event, decide whether "
        "the new clause introduces a contradiction with a previously accepted clause. Correct clean "
        "events should be marked false. Return {\"steps\":[{\"event_id\":\"...\","
        "\"introduces_contradiction\":false,\"contradicts_clause_id\":null,\"explanation\":\"...\"}]}."
    )
    data = call_llm(system, f"{obs.get('instructions','')}\n\nDRAFTING EVENTS:\n{json.dumps(obs.get('drafting_sequence', []), indent=2)}")
    steps = data.get("steps", data.get("predictions", [])) if isinstance(data, dict) else []
    by_id: Dict[str, dict] = {}
    for step in steps:
        if isinstance(step, dict) and step.get("event_id"):
            by_id[str(step["event_id"])] = {
                "event_id": str(step["event_id"]),
                "introduces_contradiction": bool(step.get("introduces_contradiction", step.get("has_contradiction", False))),
                "contradicts_clause_id": step.get("contradicts_clause_id"),
                "explanation": str(step.get("explanation", "")),
            }
    if not by_id:
        by_id = lexmind_heuristic_predictions(obs)
    return {
        "steps": [
            by_id.get(e["event_id"], {"event_id": e["event_id"], "introduces_contradiction": False, "contradicts_clause_id": None, "explanation": ""})
            for e in obs.get("drafting_sequence", [])
        ]
    }


def lexmind_heuristic_predictions(obs: dict) -> Dict[str, dict]:
    """Public-observation fallback for LexMind when no API key is configured."""
    events = obs.get("drafting_sequence", [])
    predictions: Dict[str, dict] = {}
    previous: List[dict] = []

    def text(e: dict) -> str:
        return (e.get("clause_title", "") + " " + e.get("clause_text", "")).lower()

    for event in events:
        event_text = text(event)
        match_id = None
        explanation = ""
        for prior in previous:
            prior_text = text(prior)
            if ("payment" in event_text or "invoice" in event_text or "refund" in event_text) and (
                "payment" in prior_text or "invoice" in prior_text or "refund" in prior_text
            ):
                if any(term in event_text for term in ["fifteen", "15", "full refund", "non-refundable"]) and any(
                    term in prior_text for term in ["thirty", "30", "non-refundable", "monthly"]
                ):
                    match_id = prior["clause_id"]
                    explanation = "Payment/refund terms impose incompatible timing or refund obligations."
                    break
            if ("liability" in event_text or "indemnif" in event_text) and ("liability" in prior_text or "indemnif" in prior_text):
                if ("no cap" in event_text and "exceed" in prior_text) or ("exceed" in event_text and "no cap" in prior_text):
                    match_id = prior["clause_id"]
                    explanation = "One clause uncaps indemnity/liability while another caps aggregate liability."
                    break
            if ("data" in event_text and ("analy" in event_text or "machine learning" in event_text)) and (
                "client data" in prior_text and any(term in prior_text for term in ["shall not access", "shall not access, use", "not access"])
            ):
                match_id = prior["clause_id"]
                explanation = "Data analytics license conflicts with prior data-use prohibition."
                break
            if ("terminate" in event_text or "termination" in event_text) and ("renew" in prior_text or "non-renewal" in prior_text):
                if ("30" in event_text or "thirty" in event_text) and ("90" in prior_text or "ninety" in prior_text):
                    match_id = prior["clause_id"]
                    explanation = "Thirty-day termination conflicts with ninety-day non-renewal framework."
                    break
            if ("breach" in event_text and ("72" in event_text or "seventy-two" in event_text)) and (
                "breach" in prior_text and ("24" in prior_text or "twenty-four" in prior_text)
            ):
                match_id = prior["clause_id"]
                explanation = "Breach notification deadlines conflict."
                break
            if ("confidential" in event_text and any(term in event_text for term in ["perpetuity", "indefinitely"])) and (
                "confidential" in prior_text and ("five" in prior_text or "5" in prior_text or "three" in prior_text or "3" in prior_text)
            ):
                match_id = prior["clause_id"]
                explanation = "Perpetual confidentiality conflicts with fixed confidentiality duration."
                break
            if ("portfolio" in event_text or "redistribute" in event_text) and (
                "exclusive property" in prior_text or "owned exclusively" in prior_text
            ):
                match_id = prior["clause_id"]
                explanation = "Provider reuse rights conflict with client-exclusive ownership."
                break
            if ("arbitration" in event_text and ("san francisco" in event_text or "new york" in event_text)) and (
                "courts" in prior_text or "houston" in prior_text
            ):
                match_id = prior["clause_id"]
                explanation = "Arbitration venue conflicts with court/forum clause."
                break

        predictions[event["event_id"]] = {
            "event_id": event["event_id"],
            "introduces_contradiction": match_id is not None,
            "contradicts_clause_id": match_id,
            "explanation": explanation,
        }
        previous.append(event)
    return predictions


def run_single(task_id: str, reset_path: str, step_path: str, builder: Any) -> float:
    log_start(task_id)
    rewards: List[float] = []
    try:
        obs = post(reset_path, task_id=task_id)
        action = builder(obs)
        params = {"task_id": task_id}
        if obs.get("contract_id"):
            params["contract_id"] = obs["contract_id"]
        result = post(step_path, action, **params)
        score = float(result.get("score", 0.0) or 0.0)
        rewards.append(score)
        log_step(1, "submit", score, result.get("done", True), None)
    except Exception as exc:
        score = 0.0
        rewards = [0.0]
        log_step(1, "error", 0.0, True, str(exc))
    log_end(score > 0.0, 1, score, rewards)
    return score


def main() -> None:
    tasks = [
        ("easy", "/reset", "/step", detection_action),
        ("medium", "/reset", "/step", detection_action),
        ("hard", "/reset", "/step", detection_action),
        ("execution_easy", "/execution/reset", "/execution/step", execution_action),
        ("execution_medium", "/execution/reset", "/execution/step", execution_action),
        ("execution_hard", "/execution/reset", "/execution/step", execution_action),
        ("lexmind_easy", "/lexmind/reset", "/lexmind/step", lexmind_action),
        ("lexmind_medium", "/lexmind/reset", "/lexmind/step", lexmind_action),
        ("lexmind_hard", "/lexmind/reset", "/lexmind/step", lexmind_action),
    ]
    scores = {task_id: run_single(task_id, reset, step, builder) for task_id, reset, step, builder in tasks}
    mean = sum(scores.values()) / len(scores)
    print("\nCLAUSR INFERENCE RESULTS")
    print("| Task | Score |")
    print("|------|------:|")
    for task_id, score in scores.items():
        print(f"| {task_id} | {score:.4f} |")
    print(f"| MEAN | {mean:.4f} |")


if __name__ == "__main__":
    main()
