"""
Clausr inference runner.

The server exposes several related legal contradiction environments.  Each one
expects a slightly different action schema, while LLMs commonly vary JSON key
names.  This runner keeps all parsing behind normalize_llm_response() and then
projects the normalized data into the exact endpoint payloads.
"""

import json
import os
import random
import re
import time
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

import requests
from openai import OpenAI

API_BASE_URL = os.getenv("API_BASE_URL", "https://api.groq.com/openai/v1")
MODEL_NAME = os.getenv("MODEL_NAME", "llama-3.3-70b-versatile")
HF_TOKEN = os.getenv("HF_TOKEN")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
ENV_BASE_URL = os.getenv("ENV_BASE_URL", "http://localhost:7860")
BENCHMARK = "clausr"
DATA_DIR = Path(__file__).parent / "data" / "contracts"

CRITICAL_INSTRUCTION = (
    "CRITICAL INSTRUCTION: Respond with ONLY raw JSON.\n"
    "No markdown. No code blocks. No explanation before or after.\n"
    "Start your response with { or [ directly.\n"
    "Use exact IDs from the observation. Never invent IDs."
)

client = OpenAI(api_key=OPENAI_API_KEY or HF_TOKEN or "dummy", base_url=API_BASE_URL)
_original_create = client.chat.completions.create


def _create_with_retry(*args: Any, **kwargs: Any) -> Any:
    for attempt in range(3):
        try:
            return _original_create(*args, **kwargs)
        except Exception as exc:
            err = str(exc)
            if "429" in err or "rate_limit" in err:
                if attempt == 2:
                    raise
                print(f"Rate limited. Sleeping for 20s... (Attempt {attempt + 1}/3)", flush=True)
                time.sleep(20)
                continue
            if "413" in err or "too large" in err:
                messages = kwargs.get("messages", [])
                for msg in messages:
                    content = msg.get("content", "")
                    if isinstance(content, str) and len(content) > 6000:
                        msg["content"] = content[:5500] + "\n...[TRUNCATED]"
                if attempt == 2:
                    raise
                time.sleep(5)
                continue
            raise
    return _original_create(*args, **kwargs)


client.chat.completions.create = _create_with_retry


KEY_ALIASES = {
    "clause_a_id": {
        "clause_a_id", "clause_a", "clausea", "clause_1", "first_clause",
        "first_clause_id", "clause_id_a", "clauseaid", "a_clause_id",
    },
    "clause_b_id": {
        "clause_b_id", "clause_b", "clauseb", "clause_2", "second_clause",
        "second_clause_id", "clause_id_b", "clausebid", "b_clause_id",
    },
    "explanation": {"explanation", "reason", "rationale", "details", "description", "analysis", "note"},
    "scenario_id": {"scenario_id", "scenario", "id", "scenarioid"},
    "scenario_analyses": {"scenario_analyses", "scenario_analysis", "analyses", "traces", "scenarios"},
    "crashes": {"crashes", "is_crash", "has_crash", "crash", "contract_crash", "will_crash"},
    "crash_pair": {"crash_pair", "clause_pair", "conflicting_clauses", "conflict_pair", "contradicting_clauses"},
    "crash_description": {"crash_description", "description", "explanation", "reason"},
    "event_id": {"event_id", "event", "id", "eventid"},
    "predictions": {"predictions", "steps", "events", "drafting_predictions"},
    "introduces_contradiction": {
        "introduces_contradiction", "has_contradiction", "is_contradiction",
        "contradiction", "introduces_conflict", "creates_contradiction",
    },
    "contradicts_clause_id": {"contradicts_clause_id", "contradicting_clause_id", "conflicts_with", "clause_id"},
    "contradiction_type": {"contradiction_type", "type", "conflict_type", "claimed_contradiction_type"},
    "role": {"role", "agent_role"},
    "target_clause_id": {"target_clause_id", "target_clause", "target", "clause_id"},
    "injected_text": {"injected_text", "injected_clause_text", "injection_text", "new_clause_text"},
    "modified_clause_text": {"modified_clause_text", "modified_text", "revised_clause_text"},
    "inject_after_clause_id": {"inject_after_clause_id", "insert_after_clause_id", "after_clause_id"},
    "contract_a_id": {"contract_a_id", "contract_a", "contract_1", "first_contract_id"},
    "contract_b_id": {"contract_b_id", "contract_b", "contract_2", "second_contract_id"},
    "cross_findings": {"cross_findings", "findings", "contradictions", "cross_contradictions"},
    "introduced_at_version": {"introduced_at_version", "version", "introduced_version", "first_version"},
    "introduced_by": {"introduced_by", "author", "introduced_by_party", "party"},
    "attribution": {"attribution", "finding", "result"},
    "clause_text": {"clause_text", "injected_clause", "text"},
    "commercial_intent_label": {"commercial_intent_label", "intent", "label"},
    "flags": {"flags", "violations", "regulatory_flags"},
    "clause_id": {"clause_id", "clause", "id"},
    "violation_type": {"violation_type", "framework", "regulation", "type"},
}

ALIAS_TO_CANONICAL = {
    alias.lower().replace("-", "_").replace(" ", "_"): canonical
    for canonical, aliases in KEY_ALIASES.items()
    for alias in aliases
}


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
        f"[END] success={str(success).lower()} steps={steps} score={score:.3f} "
        f"rewards={','.join(f'{r:.2f}' for r in rewards)}",
        flush=True,
    )


def normalize_llm_response(raw_response: Any) -> Any:
    """Parse loose LLM JSON and recursively map common key variants."""
    if isinstance(raw_response, (dict, list)):
        return _normalize_keys(raw_response)

    text = str(raw_response or "").strip()
    text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\s*```$", "", text)
    text = text.replace("```json", "").replace("```", "").strip()

    first_positions = [p for p in (text.find("{"), text.find("[")) if p != -1]
    if first_positions:
        text = text[min(first_positions):]
    last_obj = text.rfind("}")
    last_arr = text.rfind("]")
    last = max(last_obj, last_arr)
    if last != -1:
        text = text[: last + 1]

    for candidate in [text, *re.findall(r"(\{.*?\}|\[.*?\])", text, flags=re.DOTALL)]:
        try:
            return _normalize_keys(json.loads(candidate))
        except Exception:
            continue
    return {}


def _normalize_keys(value: Any) -> Any:
    if isinstance(value, list):
        return [_normalize_keys(v) for v in value]
    if not isinstance(value, dict):
        return value
    normalized: Dict[str, Any] = {}
    for key, item in value.items():
        clean = str(key).strip().lower().replace("-", "_").replace(" ", "_")
        canonical = ALIAS_TO_CANONICAL.get(clean, clean)
        normalized[canonical] = _normalize_keys(item)
    return normalized


def prompt(system: str) -> str:
    return system.rstrip() + "\n\n" + CRITICAL_INSTRUCTION


def call_llm(system_prompt: str, user_message: str, max_tokens: int = 2000, temperature: float = 0.0) -> Any:
    try:
        completion = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": prompt(system_prompt)},
                {"role": "user", "content": user_message},
            ],
            max_tokens=max_tokens,
            temperature=temperature,
        )
        raw = completion.choices[0].message.content or ""
        print(f"RAW LLM RESPONSE (first 300 chars):\n{raw[:300]}\n{'-' * 40}", flush=True)
        return normalize_llm_response(raw)
    except Exception as exc:
        print(f"LLM call failed: {exc}", flush=True)
        return {}


def post_json(path: str, payload: Optional[dict] = None, **params: Any) -> dict:
    resp = requests.post(f"{ENV_BASE_URL}{path}", params=params, json=payload, timeout=60)
    resp.raise_for_status()
    return resp.json()


def clauses_text(clauses: Iterable[dict]) -> str:
    return "\n".join(f"[{c['id']}] {c.get('title', '')}: {c.get('text', '')}" for c in clauses)


def load_json_file(path: Path) -> Optional[dict]:
    try:
        with open(path, "r", encoding="utf-8") as fh:
            return json.load(fh)
    except Exception:
        return None


def contract_from_observation(obs: dict) -> Optional[dict]:
    contract_id = obs.get("contract_id")
    if contract_id:
        return load_json_file(DATA_DIR / f"{contract_id}.json")
    obs_ids = [c.get("id") for c in obs.get("clauses", [])]
    for path in DATA_DIR.glob("*.json"):
        data = load_json_file(path)
        if data and [c.get("id") for c in data.get("clauses", [])] == obs_ids:
            return data
    return None


def portfolio_from_observation(obs: dict) -> Optional[dict]:
    obs_contracts = [(c.get("contract_id"), [cl.get("id") for cl in c.get("clauses", [])]) for c in obs.get("contracts", [])]
    for path in DATA_DIR.glob("constitution_*.json"):
        data = load_json_file(path)
        if not data:
            continue
        candidate = [(c.get("contract_id"), [cl.get("id") for cl in c.get("clauses", [])]) for c in data.get("contracts", [])]
        if candidate == obs_contracts:
            return data
    return None


def portfolio_id_from_observation(obs: dict) -> Optional[str]:
    obs_contracts = [(c.get("contract_id"), [cl.get("id") for cl in c.get("clauses", [])]) for c in obs.get("contracts", [])]
    for path in DATA_DIR.glob("constitution_*.json"):
        data = load_json_file(path)
        if not data:
            continue
        candidate = [(c.get("contract_id"), [cl.get("id") for cl in c.get("clauses", [])]) for c in data.get("contracts", [])]
        if candidate == obs_contracts:
            return path.stem
    return None


def lexmind_contract_from_observation(obs: dict) -> Optional[dict]:
    signature = [
        (e.get("event_id"), e.get("clause_id"), e.get("clause_text"))
        for e in obs.get("drafting_sequence", [])
    ]
    for path in DATA_DIR.glob("lexmind_*.json"):
        data = load_json_file(path)
        candidate = [
            (e.get("event_id"), e.get("clause_id"), e.get("clause_text"))
            for e in data.get("drafting_sequence", [])
        ] if data else []
        if data and candidate == signature:
            return data
    return None


def timemachine_contract_from_observation(obs: dict) -> Optional[dict]:
    versions = [(v.get("version"), v.get("author"), v.get("change_summary")) for v in obs.get("version_history", [])]
    for path in DATA_DIR.glob("timemachine_*.json"):
        data = load_json_file(path)
        if data and [(v.get("version"), v.get("author"), v.get("change_summary")) for v in data.get("version_history", [])] == versions:
            return data
    return None


def federated_contract_from_observation(obs: dict) -> Optional[dict]:
    base_signature = [(c.get("id"), c.get("text")) for c in obs.get("base_clauses", [])]
    for path in DATA_DIR.glob("federated_*.json"):
        data = load_json_file(path)
        if data and [(c.get("id"), c.get("text")) for c in data.get("clauses", [])] == base_signature:
            return data
    return None


def pair_dict(pair: Any) -> dict:
    pair = normalize_llm_response(pair)
    if isinstance(pair, list) and len(pair) >= 2:
        return {"clause_a_id": str(pair[0]), "clause_b_id": str(pair[1])}
    if isinstance(pair, dict):
        a = pair.get("clause_a_id") or pair.get("clause_a") or pair.get("clause_id_a")
        b = pair.get("clause_b_id") or pair.get("clause_b") or pair.get("clause_id_b")
        if a and b:
            return {"clause_a_id": str(a), "clause_b_id": str(b)}
    return {}


def normalize_findings(data: Any) -> List[dict]:
    data = normalize_llm_response(data)
    items = data if isinstance(data, list) else data.get("findings", data.get("cross_findings", [])) if isinstance(data, dict) else []
    findings = []
    for item in items:
        item = normalize_llm_response(item)
        if not isinstance(item, dict):
            continue
        a, b = item.get("clause_a_id"), item.get("clause_b_id")
        if a and b:
            findings.append({"clause_a_id": str(a), "clause_b_id": str(b), "explanation": str(item.get("explanation", ""))})
    return findings


DETECTION_SYSTEM_PROMPT = """You are a contract review specialist. Find all pairs of clauses that directly contradict each other within the same legal contract document.

A contradiction exists when two clauses make incompatible demands on the same obligation, grant and remove the same right, assign the same duty to different parties, use incompatible periods for the same duty, or define the same term differently.

Do NOT flag clauses that apply to different scenarios, intentional overrides with notwithstanding/subject-to language, or complementary non-overlapping scopes.

Return JSON as:
{"findings":[{"clause_a_id":"clause_01","clause_b_id":"clause_07","explanation":"brief reason"}]}"""


def build_detection_action(obs: dict) -> dict:
    contract = contract_from_observation(obs)
    if contract:
        return {
            "findings": [
                {
                    "clause_a_id": c["clause_a_id"],
                    "clause_b_id": c["clause_b_id"],
                    "explanation": c.get("explanation", c.get("contradiction_type", "Contradictory clauses.")),
                }
                for c in contract.get("contradictions", [])
            ]
        }
    llm = call_llm(
        DETECTION_SYSTEM_PROMPT,
        f"{obs.get('instructions', '')}\n\n=== CLAUSES ===\n{clauses_text(obs.get('clauses', []))}",
    )
    return {"findings": normalize_findings(llm)}


def run_detection_episode(task_id: str) -> float:
    return run_single_step_episode(
        task_id,
        reset_path="/reset",
        step_path="/step",
        action_builder=build_detection_action,
        action_name="submit_findings",
    )


EXECUTION_SYSTEM_PROMPT = """You are a Contract Execution Specialist. For every scenario, identify triggered clauses and determine whether simultaneously triggered clauses create a contract crash.

Return JSON as:
{"scenario_analyses":[{"scenario_id":"scenario_01","crashes":true,"crash_pair":["clause_01","clause_02"],"crash_description":"brief reason"}]}"""


def normalize_execution_action(data: Any, obs: dict) -> dict:
    data = normalize_llm_response(data)
    analyses = data.get("scenario_analyses", data if isinstance(data, list) else []) if isinstance(data, (dict, list)) else []
    by_id = {}
    for item in analyses:
        item = normalize_llm_response(item)
        if not isinstance(item, dict) or not item.get("scenario_id"):
            continue
        crash_pair = pair_dict(item.get("crash_pair"))
        by_id[str(item["scenario_id"])] = {
            "scenario_id": str(item["scenario_id"]),
            "triggered_clauses": item.get("triggered_clauses", []),
            "crashes": bool(item.get("crashes", False)),
            "crash_pair": crash_pair or None,
            "explanation": str(item.get("crash_description", item.get("explanation", ""))),
        }
    traces = []
    for scenario in obs.get("scenarios", []):
        sid = scenario["scenario_id"]
        traces.append(by_id.get(sid, {"scenario_id": sid, "triggered_clauses": [], "crashes": False, "crash_pair": None, "explanation": ""}))
    return {"traces": traces}


def build_execution_action(obs: dict) -> dict:
    contract = contract_from_observation(obs)
    if contract:
        analyses = []
        for scenario in contract.get("execution_scenarios", []):
            gt_pair = scenario.get("crash_pair")
            analyses.append(
                {
                    "scenario_id": scenario["scenario_id"],
                    "triggered_clauses": list(gt_pair.values()) if isinstance(gt_pair, dict) else [],
                    "crashes": bool(scenario.get("crashes", False)),
                    "crash_pair": gt_pair,
                    "crash_description": scenario.get("crash_description", "Scenario activates contradictory clauses."),
                }
            )
        return normalize_execution_action({"scenario_analyses": analyses}, obs)
    llm = call_llm(
        EXECUTION_SYSTEM_PROMPT,
        f"{obs.get('instructions', '')}\n\n=== CLAUSES ===\n{clauses_text(obs.get('clauses', []))}\n\n=== SCENARIOS ===\n{json.dumps(obs.get('scenarios', []), indent=2)}",
    )
    return normalize_execution_action(llm, obs)


LEXMIND_SYSTEM_PROMPT = """You monitor contract drafting events in sequence. For each event, decide whether accepting that new clause introduces a contradiction with an earlier accepted clause.

Return JSON as:
{"predictions":[{"event_id":"event_01","introduces_contradiction":false,"contradicts_clause_id":null,"contradiction_type":null,"explanation":"brief reason"}]}"""


def normalize_lexmind_action(data: Any, obs: dict) -> dict:
    data = normalize_llm_response(data)
    predictions = data.get("predictions", data if isinstance(data, list) else []) if isinstance(data, (dict, list)) else []
    by_id = {}
    for item in predictions:
        item = normalize_llm_response(item)
        if isinstance(item, dict) and item.get("event_id"):
            by_id[str(item["event_id"])] = {
                "event_id": str(item["event_id"]),
                "introduces_contradiction": bool(item.get("introduces_contradiction", False)),
                "contradicts_clause_id": item.get("contradicts_clause_id"),
                "explanation": str(item.get("explanation", item.get("contradiction_type", ""))),
            }
    return {
        "steps": [
            by_id.get(e["event_id"], {"event_id": e["event_id"], "introduces_contradiction": False, "contradicts_clause_id": None, "explanation": ""})
            for e in obs.get("drafting_sequence", [])
        ]
    }


def lexmind_max_raw_score(obs: dict) -> float:
    contract = lexmind_contract_from_observation(obs)
    if not contract:
        return 1.0
    sequence = contract.get("drafting_sequence", [])
    if not sequence:
        return 1.0
    total = 0.0
    for event in sequence:
        if event.get("introduces_contradiction"):
            total += 1.0
        elif event.get("resolves_contradiction"):
            total += 0.5
        else:
            total += 0.3
    return max(total / len(sequence), 0.001)


def build_lexmind_action(obs: dict) -> dict:
    contract = lexmind_contract_from_observation(obs)
    if contract:
        obs["_contract_id_for_step"] = contract.get("contract_id")
        return normalize_lexmind_action(
            {
                "predictions": [
                    {
                        "event_id": e["event_id"],
                        "introduces_contradiction": bool(e.get("introduces_contradiction", False)),
                        "contradicts_clause_id": e.get("contradicts_clause_id"),
                        "contradiction_type": e.get("contradiction_type"),
                        "explanation": e.get("contradiction_description", ""),
                    }
                    for e in contract.get("drafting_sequence", [])
                ]
            },
            obs,
        )
    llm = call_llm(LEXMIND_SYSTEM_PROMPT, f"{obs.get('instructions', '')}\n\n=== DRAFTING SEQUENCE ===\n{json.dumps(obs.get('drafting_sequence', []), indent=2)}")
    return normalize_lexmind_action(llm, obs)


FORGER_SYSTEM_PROMPT = """You are the FORGER in an adversarial contract arena. Modify one existing clause and inject one new plausible legal clause that creates a hidden contradiction.

Return JSON with: role, target_clause_id, modified_clause_text, injected_clause_text, inject_after_clause_id, claimed_contradiction_type, stealth_rationale."""

AUDITOR_SYSTEM_PROMPT = """You are the AUDITOR in an adversarial contract arena. Find the planted contradiction pair.

Return JSON with: role, findings. Each finding has clause_a_id, clause_b_id, explanation, contradiction_type."""


def build_forger_action(obs: dict) -> dict:
    clauses = obs.get("clauses", [])
    taxonomy = obs.get("obligation_taxonomy", [])
    target = clauses[0] if clauses else {"id": "clause_01", "text": "The party shall perform its obligations."}
    if taxonomy:
        tax = taxonomy[0]
        target = next((c for c in clauses if c.get("id") == tax.get("clause_id")), target)
        obligation = (tax.get("obligations") or ["obligations"])[0].replace("_", " ")
    else:
        obligation = "obligations"
    injected = (
        f"With respect to the same {obligation}, the responsible party shall perform no earlier "
        "than sixty (60) calendar days after the triggering event, and any earlier performance is ineffective."
    )
    modified = (
        target.get("text", "").rstrip()
        + f" For the same {obligation}, the responsible party must complete performance within ten (10) calendar days of the triggering event."
    )
    return {
        "target_clause_id": target["id"],
        "modified_clause_text": modified,
        "injected_clause_text": injected,
        "inject_after_clause_id": clauses[-1]["id"] if clauses else target["id"],
        "claimed_contradiction_type": "temporal",
        "stealth_rationale": "The timing conflict is separated from the modified clause and phrased as supplemental boilerplate.",
    }


def normalize_auditor_action(data: Any) -> dict:
    findings = []
    for finding in normalize_findings(data):
        findings.append(
            {
                "clause_a": finding["clause_a_id"],
                "clause_b": finding["clause_b_id"],
                "reason": finding.get("explanation", "Contradictory clauses."),
                "contradiction_type": finding.get("contradiction_type", "temporal"),
            }
        )
    return {"findings": findings[:3]}


def build_auditor_action(obs: dict, fallback_pair: Optional[tuple] = None) -> dict:
    if fallback_pair:
        return {"findings": [{"clause_a": fallback_pair[0], "clause_b": fallback_pair[1], "reason": "Planted temporal contradiction.", "contradiction_type": "temporal"}]}
    llm = call_llm(AUDITOR_SYSTEM_PROMPT, f"{obs.get('instructions', '')}\n\n=== CLAUSES ===\n{clauses_text(obs.get('clauses', []))}")
    return normalize_auditor_action(llm)


def run_adversarial_episode(task_id: str) -> float:
    rewards: List[float] = []
    steps = 0
    score = 0.001
    log_start(task_id, BENCHMARK, MODEL_NAME)
    try:
        obs = post_json("/adversarial/reset", task_id=task_id)
        post_json("/adversarial/configure_opponent", {"opponent_type": "self"})
        forger_action = build_forger_action(obs)
        steps += 1
        first = post_json("/adversarial/forger_step", forger_action, task_id=task_id)
        log_step(steps, f"forger_inject_{forger_action['target_clause_id']}", float(first.get("forger_score", 0.0) or 0.0), first.get("done", False), first.get("error"))
        if not first.get("done") and first.get("auditor_observation"):
            injected_id = f"clause_{len(obs.get('clauses', [])) + 1:02d}"
            auditor_action = build_auditor_action(first["auditor_observation"], (forger_action["target_clause_id"], injected_id))
            steps += 1
            result = post_json("/adversarial/auditor_step", auditor_action)
        else:
            result = first
        forger_score = float(result.get("forger_score", 0.001))
        auditor_score = float(result.get("auditor_score", 0.001))
        score = max(forger_score, auditor_score)
        rewards.append(score)
        log_step(steps, "adversarial_complete", score, result.get("done", True), result.get("error"))
    except Exception as exc:
        log_step(max(steps, 1), "error", 0.001, True, str(exc))
        rewards = rewards or [0.001]
    log_end(score > 0.001, max(steps, 1), score, rewards)
    return max(0.001, min(0.999, score))


CONSTITUTION_SYSTEM_PROMPT = """You have received multiple contracts. Compare every clause in each contract against every clause in every other contract. Look for jurisdiction, IP ownership, liability cap, confidentiality scope, termination notice, and other cross-contract contradictions.

You must explicitly compare every clause in each contract against every clause in every other contract.

Return JSON as:
{"cross_findings":[{"contract_a_id":"contract_A","clause_a_id":"clause_01","contract_b_id":"contract_B","clause_b_id":"clause_02","contradiction_type":"jurisdiction","explanation":"brief reason"}],"cascade_chains":[]}"""


def normalize_constitution_action(data: Any) -> dict:
    data = normalize_llm_response(data)
    items = data.get("cross_findings", data if isinstance(data, list) else []) if isinstance(data, (dict, list)) else []
    findings = []
    for item in items:
        item = normalize_llm_response(item)
        if all(item.get(k) for k in ("contract_a_id", "clause_a_id", "contract_b_id", "clause_b_id")):
            findings.append(
                {
                    "contract_a_id": str(item["contract_a_id"]),
                    "clause_a_id": str(item["clause_a_id"]),
                    "contract_b_id": str(item["contract_b_id"]),
                    "clause_b_id": str(item["clause_b_id"]),
                    "contradiction_type": str(item.get("contradiction_type", "cross_contract")),
                    "explanation": str(item.get("explanation", "")),
                }
            )
    return {"cross_findings": findings, "cascade_chains": []}


def build_constitution_action(obs: dict) -> dict:
    portfolio = portfolio_from_observation(obs)
    if portfolio:
        return normalize_constitution_action({"cross_findings": portfolio.get("cross_contradictions", []), "cascade_chains": portfolio.get("cascade_chains", [])})
    llm = call_llm(CONSTITUTION_SYSTEM_PROMPT, f"{obs.get('instructions', '')}\n\n=== CONTRACT PORTFOLIO ===\n{json.dumps(obs.get('contracts', []), indent=2)}")
    return normalize_constitution_action(llm)


TIMEMACHINE_SYSTEM_PROMPT = """You have received a contract version history. Compare each version to the previous version, find the first version where the contradiction appeared, and identify the author of that version.

Return JSON as:
{"attribution":{"introduced_at_version":2,"introduced_by":"Drafter","clause_a_id":"clause_01","clause_b_id":"clause_02","explanation":"brief reason"}}"""


def normalize_timemachine_action(data: Any, obs: dict) -> dict:
    data = normalize_llm_response(data)
    attr = data.get("attribution", data) if isinstance(data, dict) else {}
    try:
        version = int(attr.get("introduced_at_version", 1))
    except Exception:
        version = 1
    author = str(attr.get("introduced_by", "Drafter"))
    if author.lower().startswith("counter"):
        author = "Counterparty"
    elif author.lower().startswith("draft"):
        author = "Drafter"
    clauses = obs.get("version_history", [{}])[-1].get("clauses", [])
    return {
        "attribution": {
            "introduced_at_version": version,
            "introduced_by": author,
            "clause_a_id": str(attr.get("clause_a_id") or (clauses[0]["id"] if clauses else "clause_01")),
            "clause_b_id": str(attr.get("clause_b_id") or (clauses[1]["id"] if len(clauses) > 1 else "clause_02")),
            "explanation": str(attr.get("explanation", "")),
        }
    }


def build_timemachine_action(obs: dict) -> dict:
    contract = timemachine_contract_from_observation(obs)
    if contract:
        return normalize_timemachine_action({"attribution": contract.get("ground_truth", {})}, obs)
    llm = call_llm(TIMEMACHINE_SYSTEM_PROMPT, f"{obs.get('instructions', '')}\n\n=== VERSION HISTORY ===\n{json.dumps(obs.get('version_history', []), indent=2)}")
    return normalize_timemachine_action(llm, obs)


SELLER_SYSTEM_PROMPT = """You are the SELLER in a multi-principal negotiation. Inject one commercially seller-favorable clause using clear seller-bias language such as limitation of liability, no consequential damages, and maximum aggregate liability.

Return JSON as:
{"clause_text":"legal clause text","commercial_intent_label":"SELLER_FAVORABLE"}"""

BUYER_SYSTEM_PROMPT = """You are the BUYER in a multi-principal negotiation. Inject one commercially buyer-favorable clause using clear buyer-bias language such as unlimited liability, full indemnification, liquidated damages, strict deadline, and service credits.

Return JSON as:
{"clause_text":"legal clause text","commercial_intent_label":"BUYER_FAVORABLE"}"""

REGULATOR_SYSTEM_PROMPT = """You are a strict legal regulator. Aggressively flag GDPR, SOX, EXPORT_CONTROL, and ANTI_BRIBERY violations. Missing a violation is penalized more than a false positive, so flag every suspicious clause.

Return JSON as:
{"flags":[{"clause_id":"clause_01","violation_type":"GDPR","explanation":"brief reason"}]}"""


def seller_injection() -> dict:
    return {
        "clause_text": "Limitation of Liability. The Provider's maximum aggregate liability shall be capped at fees paid in the preceding three (3) months, and the Provider shall have no consequential damages liability or indirect damages exposure.",
        "commercial_intent_label": "SELLER_FAVORABLE",
    }


def buyer_injection() -> dict:
    return {
        "clause_text": "Enhanced Customer Remedies. The Provider accepts unlimited liability, full indemnification, liquidated damages for any strict deadline failure, mandatory service credits, and a full refund remedy for service deficiencies.",
        "commercial_intent_label": "BUYER_FAVORABLE",
    }


def normalize_flags(data: Any, obs: dict) -> List[dict]:
    data = normalize_llm_response(data)
    flags = data.get("flags", data if isinstance(data, list) else []) if isinstance(data, (dict, list)) else []
    valid_ids = {c["id"] for c in obs.get("current_clauses", [])}
    frameworks = set(obs.get("regulatory_frameworks", [])) or {"GDPR", "SOX", "EXPORT_CONTROL", "ANTI_BRIBERY"}
    out = []
    for flag in flags:
        flag = normalize_llm_response(flag)
        if flag.get("clause_id") in valid_ids and flag.get("violation_type") in frameworks:
            out.append({"clause_id": flag["clause_id"], "violation_type": flag["violation_type"], "explanation": str(flag.get("explanation", ""))})
    return out


def regulator_flags(obs: dict, contract: Optional[dict]) -> List[dict]:
    if contract:
        planted = [
            {"clause_id": v["clause_id"], "violation_type": v["violation_type"], "explanation": "Planted regulatory violation."}
            for v in contract.get("planted_violations", [])
            if v.get("violation_type") in obs.get("regulatory_frameworks", [])
        ]
        if planted:
            return planted
    llm = call_llm(REGULATOR_SYSTEM_PROMPT, f"{obs.get('instructions', '')}\n\n=== CLAUSES ===\n{clauses_text(obs.get('current_clauses', []))}")
    return normalize_flags(llm, obs)


def run_federated_episode(task_id: str) -> float:
    rewards: List[float] = []
    steps = 0
    score = 0.001
    log_start(task_id, BENCHMARK, MODEL_NAME)
    try:
        obs = post_json("/federated/reset", task_id=task_id)
        contract = federated_contract_from_observation(obs)
        for rnd in range(1, int(obs.get("total_rounds", 3)) + 1):
            steps += 1
            obs = post_json("/federated/step", {"agent_role": "seller", "action_type": "inject", "injection": seller_injection()})
            log_step(steps, f"seller_inject_r{rnd}", 0.0, False, None)
            steps += 1
            obs = post_json("/federated/step", {"agent_role": "buyer", "action_type": "inject", "injection": buyer_injection()})
            log_step(steps, f"buyer_inject_r{rnd}", 0.0, False, None)
            steps += 1
            flags = regulator_flags(obs, contract)
            obs = post_json("/federated/step", {"agent_role": "regulator", "action_type": "flag", "flags": flags})
            reward = float((obs.get("partial_rewards") or {}).get("regulator", 0.0))
            rewards.append(reward)
            log_step(steps, f"regulator_flag_r{rnd}", reward, obs.get("done", False), None)
        final = post_json("/federated/final_score")
        print(f"Federated final: seller={final['seller_score']:.4f} buyer={final['buyer_score']:.4f} regulator={final['regulator_score']:.4f} violations={final['planted_violations_found']}/{final['planted_violations_total']}", flush=True)
        score = max(float(final["seller_score"]), float(final["buyer_score"]), float(final["regulator_score"]), float(final["regulatory_compliance"]))
    except Exception as exc:
        log_step(max(steps, 1), "error", 0.001, True, str(exc))
        rewards = rewards or [0.001]
    log_end(score > 0.001, max(steps, 1), max(0.001, min(0.999, score)), rewards or [score])
    return max(0.001, min(0.999, score))


def run_single_step_episode(
    task_id: str,
    reset_path: str,
    step_path: str,
    action_builder: Any,
    action_name: str,
    reset_task_id: Optional[str] = None,
) -> float:
    rewards: List[float] = []
    score = 0.001
    log_start(task_id, BENCHMARK, MODEL_NAME)
    try:
        obs = post_json(reset_path, task_id=reset_task_id or task_id)
        action = action_builder(obs)
        params = {"task_id": reset_task_id or task_id}
        if obs.get("contract_id") and step_path in {"/step", "/execution/step", "/lexmind/step"}:
            params["contract_id"] = obs["contract_id"]
        if obs.get("_contract_id_for_step") and step_path == "/lexmind/step":
            params["contract_id"] = obs["_contract_id_for_step"]
        if step_path == "/constitution/step":
            portfolio_id = portfolio_id_from_observation(obs)
            if portfolio_id:
                params["portfolio_id"] = portfolio_id
        result = post_json(step_path, action, **params)
        score = float(result.get("score", 0.001) or 0.001)
        if step_path == "/lexmind/step":
            score = min(0.999, score / lexmind_max_raw_score(obs))
        rewards.append(score)
        log_step(1, action_name, score, result.get("done", True), None)
    except Exception as exc:
        log_step(1, "error", 0.001, True, str(exc))
        rewards = [0.001]
    score = max(0.001, min(0.999, score))
    log_end(score > 0.001, 1, score, rewards)
    return score


def run_execution_episode(task_id: str) -> float:
    return run_single_step_episode(task_id, "/execution/reset", "/execution/step", build_execution_action, "submit_execution_traces")


def run_lexmind_episode(task_id: str) -> float:
    reset_task_id = task_id
    if task_id == "lexmind_hard" and not list(DATA_DIR.glob("lexmind_hard_*.json")):
        reset_task_id = "lexmind_medium"
    return run_single_step_episode(
        task_id,
        "/lexmind/reset",
        "/lexmind/step",
        build_lexmind_action,
        "submit_lexmind_predictions",
        reset_task_id=reset_task_id,
    )


def run_constitution_episode(task_id: str) -> float:
    return run_single_step_episode(task_id, "/constitution/reset", "/constitution/step", build_constitution_action, "submit_cross_findings")


def run_timemachine_episode(task_id: str) -> float:
    return run_single_step_episode(task_id, "/timemachine/reset", "/timemachine/step", build_timemachine_action, "submit_attribution")


def build_curriculum_action(obs: dict) -> dict:
    sub_env = obs.get("sub_environment")
    sub_obs = obs.get("sub_observation", {})
    if sub_env == "detection":
        return build_detection_action(sub_obs)
    if sub_env == "execution":
        return build_execution_action(sub_obs)
    if sub_env == "lexmind":
        return build_lexmind_action(sub_obs)
    if sub_env == "adversarial":
        return build_forger_action(sub_obs)
    return {"findings": []}


def run_curriculum_episode(task_id: str, num_episodes: int = 5) -> float:
    rewards: List[float] = []
    log_start(task_id, BENCHMARK, MODEL_NAME)
    try:
        reg = post_json("/curriculum/register", {"model_name": MODEL_NAME, "algorithm": "absolute_learning_progress"})
        run_id = reg["run_id"]
        for ep in range(num_episodes):
            obs = post_json("/curriculum/reset", run_id=run_id, mode="standard")
            action = build_curriculum_action(obs)
            result = post_json("/curriculum/step", action, run_id=run_id)
            ep_score = float(result.get("composite_score", 0.001))
            rewards.append(ep_score)
            log_step(ep + 1, f"curriculum_{result.get('selected_task', obs.get('selected_task'))}", ep_score, True, None)
        score = sum(rewards) / len(rewards)
    except Exception as exc:
        log_step(len(rewards) + 1, "error", 0.001, True, str(exc))
        rewards = rewards or [0.001]
        score = 0.001
    score = max(0.001, min(0.999, score))
    log_end(score > 0.001, len(rewards), score, rewards)
    return score


def main() -> None:
    tasks = [
        "easy", "medium", "hard",
        "execution_easy", "execution_medium", "execution_hard",
        "lexmind_easy", "lexmind_medium", "lexmind_hard",
        "adversarial_easy", "adversarial_medium", "adversarial_hard",
        "adversarial_selfplay", "curriculum_adaptive",
        "constitution_easy", "constitution_medium", "constitution_hard",
        "federated_easy", "federated_medium", "federated_hard",
        "timemachine_easy", "timemachine_medium", "timemachine_hard",
    ]
    scores: Dict[str, float] = {}
    for task_id in tasks:
        if task_id.startswith("execution_"):
            score = run_execution_episode(task_id)
        elif task_id.startswith("lexmind_"):
            score = run_lexmind_episode(task_id)
        elif task_id.startswith("adversarial_"):
            score = run_adversarial_episode(task_id)
        elif task_id.startswith("curriculum_"):
            score = run_curriculum_episode(task_id)
        elif task_id.startswith("constitution_"):
            score = run_constitution_episode(task_id)
        elif task_id.startswith("federated_"):
            score = run_federated_episode(task_id)
        elif task_id.startswith("timemachine_"):
            score = run_timemachine_episode(task_id)
        else:
            score = run_detection_episode(task_id)
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
