import json
import math
import random
import re
import uuid
from collections import Counter
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from models import (
    AdversarialEpisodeResult,
    AdversarialState,
    AuditorAction,
    AuditorGradeResult,
    AuditorObservation,
    Clause,
    ForgerAction,
    ForgerGradeResult,
    ForgerObservation,
    ObligationTaxonomyEntry,
    OpponentConfig,
    RubricScore,
)

OBLIGATION_CATEGORIES = [
    "payment",
    "termination",
    "liability",
    "delivery",
    "ip_rights",
    "confidentiality",
]

CONTRADICTION_TYPES = [
    "numeric",
    "temporal",
    "conditional",
    "party_obligation",
    "termination",
]

_EMBEDDING_MODEL = None


def _get_embedding_model():
    global _EMBEDDING_MODEL
    if _EMBEDDING_MODEL is None:
        try:
            from sentence_transformers import SentenceTransformer
            _EMBEDDING_MODEL = SentenceTransformer(
                "sentence-transformers/all-MiniLM-L6-v2"
            )
        except ImportError:
            _EMBEDDING_MODEL = "unavailable"
    return _EMBEDDING_MODEL


def _cosine_similarity(vec_a, vec_b) -> float:
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    mag_a = math.sqrt(sum(a * a for a in vec_a))
    mag_b = math.sqrt(sum(b * b for b in vec_b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


def _compute_subtlety(text_a: str, text_b: str) -> float:
    model = _get_embedding_model()
    if model == "unavailable":
        words_a = set(text_a.lower().split())
        words_b = set(text_b.lower().split())
        if not words_a or not words_b:
            return 0.5
        overlap = len(words_a & words_b) / max(len(words_a | words_b), 1)
        return max(0.0, min(1.0, 1.0 - overlap))
    embeddings = model.encode([text_a, text_b])
    sim = _cosine_similarity(embeddings[0].tolist(), embeddings[1].tolist())
    return max(0.0, min(1.0, 1.0 - sim))


def _compute_plausibility(text: str) -> float:
    """Heuristic plausibility: penalize very short, non-alphabetic, or
    obviously non-legal text.  Returns 0..1."""
    if len(text.strip()) < 20:
        return 0.1
    alpha_ratio = sum(1 for c in text if c.isalpha()) / max(len(text), 1)
    if alpha_ratio < 0.5:
        return 0.2
    legal_signals = [
        "shall", "party", "agreement", "clause", "obligation",
        "liability", "termination", "pursuant", "notwithstanding",
        "herein", "hereof", "hereunder", "provided", "subject to",
    ]
    signal_count = sum(1 for s in legal_signals if s in text.lower())
    return min(1.0, 0.3 + 0.1 * signal_count)


def _extract_word_roots(text: str) -> set:
    words = re.findall(r"[a-z]{3,}", text.lower())
    return {w[:6] for w in words}


class OracleValidator:
    """Deterministic oracle that validates Forger injections."""

    def __init__(self, contract: dict):
        self._contract = contract
        self._clause_map = {c["id"]: c for c in contract["clauses"]}
        self._taxonomy = contract.get("obligation_taxonomy", [])
        self._taxonomy_map: Dict[str, List[str]] = {}
        for entry in self._taxonomy:
            self._taxonomy_map[entry["clause_id"]] = entry.get("obligations", [])

    def validate(
        self,
        action: ForgerAction,
        original_clause_text: str,
    ) -> Tuple[bool, str]:
        target_id = action.target_clause_id
        if target_id not in self._clause_map:
            return False, f"Target clause {target_id} does not exist in the contract."

        if action.claimed_contradiction_type not in CONTRADICTION_TYPES:
            return False, (
                f"Invalid contradiction type '{action.claimed_contradiction_type}'. "
                f"Must be one of: {CONTRADICTION_TYPES}"
            )

        scope_ok, scope_msg = self._check_obligation_scope(
            target_id, action.modified_clause_text, action.injected_clause_text
        )
        if not scope_ok:
            return False, f"Obligation scope check failed: {scope_msg}"

        compat_ok, compat_msg = self._check_outcome_incompatibility(
            original_clause_text,
            action.modified_clause_text,
            action.injected_clause_text,
            action.claimed_contradiction_type,
        )
        if not compat_ok:
            return False, f"Outcome incompatibility check failed: {compat_msg}"

        simul_ok, simul_msg = self._check_simultaneity(
            action.modified_clause_text, action.injected_clause_text
        )
        if not simul_ok:
            return False, f"Simultaneity check failed: {simul_msg}"

        return True, "Oracle accepted: all three checks passed."

    def _check_obligation_scope(
        self, target_id: str, modified_text: str, injected_text: str
    ) -> Tuple[bool, str]:
        target_obligations = set(self._taxonomy_map.get(target_id, []))
        if not target_obligations:
            combined = modified_text.lower() + " " + injected_text.lower()
            matched = [
                cat for cat in OBLIGATION_CATEGORIES
                if cat.replace("_", " ") in combined or cat in combined
            ]
            if not matched:
                return False, "No obligation category overlap detected."
            return True, f"Inferred obligation overlap: {matched}"

        injected_lower = injected_text.lower()
        overlap = [
            ob for ob in target_obligations
            if ob.replace("_", " ") in injected_lower or ob in injected_lower
        ]
        if not overlap:
            combined_words = set(injected_lower.split())
            for ob in target_obligations:
                ob_words = set(ob.replace("_", " ").split())
                if ob_words & combined_words:
                    overlap.append(ob)

        if not overlap:
            return True, "Scope accepted (creative framing)."

        return True, f"Obligation scope overlap confirmed: {overlap}"

    def _check_outcome_incompatibility(
        self,
        original_text: str,
        modified_text: str,
        injected_text: str,
        contradiction_type: str,
    ) -> Tuple[bool, str]:
        if modified_text.strip() == original_text.strip():
            return False, (
                "Modified clause is identical to original. "
                "No contradiction can arise from an unchanged clause."
            )

        if modified_text.strip() == injected_text.strip():
            return False, "Modified clause and injected clause are identical."

        mod_roots = _extract_word_roots(modified_text)
        inj_roots = _extract_word_roots(injected_text)
        if mod_roots and inj_roots:
            overlap_ratio = len(mod_roots & inj_roots) / max(
                len(mod_roots | inj_roots), 1
            )
            if overlap_ratio > 0.95:
                return False, (
                    "Modified and injected texts are near-identical "
                    f"(root overlap {overlap_ratio:.2f}). Not a genuine contradiction."
                )

        return True, "Outcome incompatibility check passed."

    def _check_simultaneity(
        self, modified_text: str, injected_text: str
    ) -> Tuple[bool, str]:
        conditional_markers = [
            "if ", "unless ", "only when ", "in the event ",
            "provided that ", "except when ", "solely in cases ",
        ]
        mod_lower = modified_text.lower()
        inj_lower = injected_text.lower()

        mod_conditional = any(m in mod_lower for m in conditional_markers)
        inj_conditional = any(m in inj_lower for m in conditional_markers)

        if mod_conditional and inj_conditional:
            mod_conditions = [m for m in conditional_markers if m in mod_lower]
            inj_conditions = [m for m in conditional_markers if m in inj_lower]
            if set(mod_conditions) == set(inj_conditions):
                return True, "Both clauses use the same conditional triggers — simultaneity likely."
            return True, "Both clauses are conditional — simultaneity plausible under overlapping conditions."

        if mod_conditional != inj_conditional:
            return True, "One clause is unconditional, the other conditional — simultaneity possible."

        return True, "Both clauses are unconditional — simultaneity is inherent."


class FixedKeywordAuditor:
    """Simple keyword-overlap auditor for adversarial_easy."""

    def audit(self, clauses: List[dict]) -> AuditorAction:
        from models import FindingAction

        findings = []
        clause_list = list(clauses)
        for i in range(len(clause_list)):
            for j in range(i + 1, len(clause_list)):
                a_words = set(clause_list[i]["text"].lower().split())
                b_words = set(clause_list[j]["text"].lower().split())
                overlap = a_words & b_words
                conflict_words = {
                    "not", "no", "never", "prohibited", "forbidden",
                    "shall not", "must not", "exclusive", "solely",
                }
                if len(overlap) > 10 and (conflict_words & a_words or conflict_words & b_words):
                    findings.append(FindingAction(
                        clause_a=clause_list[i]["id"],
                        clause_b=clause_list[j]["id"],
                        reason="Keyword overlap with negation detected",
                        contradiction_type="numeric",
                    ))
        return AuditorAction(findings=findings[:3])


class EmbeddingSimilarityAuditor:
    """Embedding-based auditor for adversarial_medium."""

    def audit(self, clauses: List[dict]) -> AuditorAction:
        from models import FindingAction

        model = _get_embedding_model()
        findings = []

        if model == "unavailable":
            return FixedKeywordAuditor().audit(clauses)

        texts = [c["text"] for c in clauses]
        embeddings = model.encode(texts)

        pairs = []
        for i in range(len(clauses)):
            for j in range(i + 1, len(clauses)):
                sim = _cosine_similarity(
                    embeddings[i].tolist(), embeddings[j].tolist()
                )
                if sim > 0.6:
                    pairs.append((sim, i, j))

        pairs.sort(reverse=True)
        for sim, i, j in pairs[:5]:
            findings.append(FindingAction(
                clause_a=clauses[i]["id"],
                clause_b=clauses[j]["id"],
                reason=f"High semantic similarity ({sim:.3f}) suggests potential contradiction",
                contradiction_type="numeric",
            ))

        return AuditorAction(findings=findings[:3])


class RandomAuditor:
    """Random baseline auditor."""

    def audit(self, clauses: List[dict]) -> AuditorAction:
        from models import FindingAction

        if len(clauses) < 2:
            return AuditorAction(findings=[])
        indices = list(range(len(clauses)))
        random.shuffle(indices)
        a, b = indices[0], indices[1]
        return AuditorAction(findings=[FindingAction(
            clause_a=clauses[a]["id"],
            clause_b=clauses[b]["id"],
            reason="Random guess",
            contradiction_type=random.choice(CONTRADICTION_TYPES),
        )])


class RandomForger:
    """Random baseline forger for testing."""

    def forge(self, clauses: List[dict], taxonomy: List[dict]) -> ForgerAction:
        if not clauses:
            raise ValueError("No clauses to forge against")
        target = random.choice(clauses)
        insert_after = random.choice(clauses)
        return ForgerAction(
            target_clause_id=target["id"],
            modified_clause_text=target["text"] + " Payment is due within 15 days.",
            injected_clause_text="All payments under this agreement shall be processed within 45 business days of invoice receipt.",
            inject_after_clause_id=insert_after["id"],
            claimed_contradiction_type="numeric",
            stealth_rationale="Random injection for baseline testing",
        )


class AdversarialArenaEnv:
    """Two-agent zero-sum environment for contract contradiction forging and auditing."""

    def __init__(self):
        self._episode_id = ""
        self._task_id = "adversarial_easy"
        self._contract = None
        self._phase = "idle"
        self._done = False
        self._forger_score = 0.001
        self._auditor_score = 0.001
        self._oracle_accepted = False
        self._forger_action: Optional[ForgerAction] = None
        self._forger_grade: Optional[ForgerGradeResult] = None
        self._auditor_grade: Optional[AuditorGradeResult] = None
        self._modified_clauses: Optional[List[dict]] = None
        self._original_clause_text = ""
        self._injected_clause_id = ""
        self._target_clause_id = ""
        self._oracle_message = ""
        self._contracts_dir = Path(__file__).parent.parent / "data" / "contracts"

        self._opponent_type = "random"
        self._opponent_pool: List[dict] = []

    def reset(self, task_id: str = "adversarial_easy") -> ForgerObservation:
        self._task_id = task_id
        self._done = False
        self._phase = "forger_turn"
        self._forger_score = 0.001
        self._auditor_score = 0.001
        self._oracle_accepted = False
        self._episode_id = str(uuid.uuid4())
        self._forger_action = None
        self._forger_grade = None
        self._auditor_grade = None
        self._modified_clauses = None
        self._original_clause_text = ""
        self._injected_clause_id = ""
        self._target_clause_id = ""
        self._oracle_message = ""

        base = task_id.replace("adversarial_", "")
        if base == "selfplay":
            base = "medium"
        pattern = f"adversarial_{base}_*.json"
        matching = list(self._contracts_dir.glob(pattern))

        if not matching:
            pattern = f"{base}_*.json"
            matching = list(self._contracts_dir.glob(pattern))

        if not matching:
            for fallback in ["easy", "medium", "hard"]:
                matching = list(self._contracts_dir.glob(f"{fallback}_*.json"))
                if matching:
                    break

        if not matching:
            raise FileNotFoundError(
                f"No contracts found for task_id: {task_id} at {self._contracts_dir}"
            )

        chosen = random.choice(matching)
        with open(chosen, "r", encoding="utf-8") as f:
            self._contract = json.load(f)

        return self._make_forger_observation()

    def load_contract_by_id(self, contract_id: str) -> None:
        filepath = self._contracts_dir / f"{contract_id}.json"
        if not filepath.exists():
            raise FileNotFoundError(f"Contract file not found: {filepath}")
        with open(filepath, "r", encoding="utf-8") as f:
            self._contract = json.load(f)
        self._episode_id = str(uuid.uuid4())
        self._phase = "forger_turn"
        self._done = False
        self._forger_score = 0.001
        self._auditor_score = 0.001

    def forger_step(self, action: ForgerAction) -> dict:
        if self._phase != "forger_turn":
            return {
                "error": f"Cannot submit forger action in phase '{self._phase}'",
                "phase": self._phase,
            }

        target_clause = None
        for c in self._contract["clauses"]:
            if c["id"] == action.target_clause_id:
                target_clause = c
                break

        if target_clause is None:
            return {
                "error": f"Target clause '{action.target_clause_id}' not found.",
                "phase": self._phase,
            }

        self._original_clause_text = target_clause["text"]
        self._target_clause_id = action.target_clause_id
        self._forger_action = action

        oracle = OracleValidator(self._contract)
        accepted, message = oracle.validate(action, self._original_clause_text)
        self._oracle_accepted = accepted
        self._oracle_message = message

        if not accepted:
            self._phase = "done"
            self._done = True
            self._forger_score = max(0.001, -0.20 + 0.001)
            self._auditor_score = min(0.999, 0.10)
            self._forger_grade = ForgerGradeResult(
                stealth=RubricScore(name="stealth", weight=0.40, raw_score=0.0, weighted_score=0.0, detail="Oracle rejected"),
                validity=RubricScore(name="validity", weight=0.30, raw_score=0.0, weighted_score=0.0, detail=message),
                subtlety=RubricScore(name="subtlety", weight=0.20, raw_score=0.0, weighted_score=0.0, detail="N/A"),
                plausibility=RubricScore(name="plausibility", weight=0.10, raw_score=0.0, weighted_score=0.0, detail="N/A"),
                total_score=0.001,
                oracle_accepted=False,
            )
            self._auditor_grade = AuditorGradeResult(
                detection=RubricScore(name="detection", weight=0.60, raw_score=1.0, weighted_score=0.60, detail="Win by default (invalid forge)"),
                precision=RubricScore(name="precision", weight=0.25, raw_score=1.0, weighted_score=0.25, detail="No false positives"),
                reasoning_quality=RubricScore(name="reasoning_quality", weight=0.15, raw_score=1.0, weighted_score=0.15, detail="N/A"),
                total_score=0.10,
            )
            return {
                "oracle_accepted": False,
                "oracle_message": message,
                "forger_score": self._forger_score,
                "auditor_score": self._auditor_score,
                "phase": "done",
                "done": True,
            }

        modified_clauses = []
        injected_id = f"clause_{len(self._contract['clauses']) + 1:02d}"
        self._injected_clause_id = injected_id
        insert_done = False

        for c in self._contract["clauses"]:
            if c["id"] == action.target_clause_id:
                modified_clauses.append({
                    "id": c["id"],
                    "title": c["title"],
                    "text": action.modified_clause_text,
                })
            else:
                modified_clauses.append(dict(c))

            if c["id"] == action.inject_after_clause_id and not insert_done:
                modified_clauses.append({
                    "id": injected_id,
                    "title": f"Supplementary Provision",
                    "text": action.injected_clause_text,
                })
                insert_done = True

        if not insert_done:
            modified_clauses.append({
                "id": injected_id,
                "title": "Supplementary Provision",
                "text": action.injected_clause_text,
            })

        self._modified_clauses = modified_clauses
        self._phase = "auditor_turn"

        auditor_obs = self._make_auditor_observation()

        if self._opponent_type in ("random", "fixed_v1", "pool"):
            auditor = self._get_opponent_auditor()
            auditor_action = auditor.audit(self._modified_clauses)
            return self.auditor_step(auditor_action)

        return {
            "oracle_accepted": True,
            "oracle_message": message,
            "phase": "auditor_turn",
            "auditor_observation": auditor_obs.model_dump(),
            "done": False,
        }

    def auditor_step(self, action: AuditorAction) -> dict:
        if self._phase != "auditor_turn":
            return {
                "error": f"Cannot submit auditor action in phase '{self._phase}'",
                "phase": self._phase,
            }

        self._phase = "done"
        self._done = True

        forger_grade = self._grade_forger(action)
        auditor_grade = self._grade_auditor(action)

        self._forger_grade = forger_grade
        self._auditor_grade = auditor_grade
        self._forger_score = max(0.001, min(0.999, forger_grade.total_score))
        self._auditor_score = max(0.001, min(0.999, auditor_grade.total_score))

        return {
            "episode_id": self._episode_id,
            "task_id": self._task_id,
            "phase": "done",
            "done": True,
            "forger_score": self._forger_score,
            "auditor_score": self._auditor_score,
            "forger_rubrics": forger_grade.model_dump(),
            "auditor_rubrics": auditor_grade.model_dump(),
            "oracle_accepted": self._oracle_accepted,
            "oracle_message": self._oracle_message,
        }

    def get_auditor_observation(self) -> AuditorObservation:
        if self._phase != "auditor_turn":
            raise ValueError(f"Auditor observation unavailable in phase '{self._phase}'")
        return self._make_auditor_observation()

    @property
    def state(self) -> AdversarialState:
        return AdversarialState(
            episode_id=self._episode_id,
            task_id=self._task_id,
            phase=self._phase,
            forger_score=self._forger_score,
            auditor_score=self._auditor_score,
            oracle_accepted=self._oracle_accepted,
            done=self._done,
        )

    def configure_opponent(self, config: OpponentConfig) -> dict:
        self._opponent_type = config.opponent_type
        return {
            "status": "configured",
            "opponent_type": config.opponent_type,
            "pool_size": len(self._opponent_pool),
        }

    def submit_checkpoint(self, checkpoint: dict) -> dict:
        self._opponent_pool.append({
            "checkpoint_id": checkpoint.get("checkpoint_id", str(uuid.uuid4())),
            "role": checkpoint.get("role", "both"),
            "score_history": checkpoint.get("score_history", []),
            "metadata": checkpoint.get("metadata", {}),
            "timestamp": str(uuid.uuid4())[:8],
        })
        return {
            "status": "registered",
            "pool_size": len(self._opponent_pool),
            "checkpoint_id": self._opponent_pool[-1]["checkpoint_id"],
        }

    def _get_opponent_auditor(self):
        if self._opponent_type == "fixed_v1":
            return FixedKeywordAuditor()
        if self._opponent_type == "pool" and self._opponent_pool:
            return EmbeddingSimilarityAuditor()
        return RandomAuditor()

    def _make_forger_observation(self) -> ForgerObservation:
        clauses = [Clause(**c) for c in self._contract["clauses"]]
        taxonomy_raw = self._contract.get("obligation_taxonomy", [])
        taxonomy = [ObligationTaxonomyEntry(**t) for t in taxonomy_raw]

        forbidden = self._contract.get("forbidden_lexical_patterns", [])
        auditor_history = self._contract.get("auditor_history", None)

        return ForgerObservation(
            episode_id=self._episode_id,
            task_id=self._task_id,
            contract_title=self._contract.get("title", ""),
            clauses=clauses,
            contract_text=self._contract.get("contract_text", ""),
            obligation_taxonomy=taxonomy,
            forbidden_lexical_patterns=forbidden,
            auditor_history=auditor_history,
            instructions=self._forger_instructions(),
            done=False,
        )

    def _make_auditor_observation(self) -> AuditorObservation:
        clauses_data = self._modified_clauses or [
            dict(c) for c in self._contract["clauses"]
        ]
        clauses = [Clause(**c) for c in clauses_data]
        contract_text = "\n\n".join(
            f"{c['title']}\n{c['text']}" for c in clauses_data
        )
        return AuditorObservation(
            episode_id=self._episode_id,
            task_id=self._task_id,
            contract_title=self._contract.get("title", ""),
            clauses=clauses,
            contract_text=contract_text,
            total_clause_count=len(clauses),
            instructions=self._auditor_instructions(),
            done=False,
        )

    def _forger_instructions(self) -> str:
        n = len(self._contract["clauses"])
        return (
            f"You are the FORGER in an Adversarial Arena episode.\n\n"
            f"You have been given a clean contract with {n} clauses. Your goal is to inject "
            f"a hidden logical contradiction that will evade detection by the Auditor.\n\n"
            f"Requirements for a successful injection:\n"
            f"1. SEMANTICALLY DISTANT: The two conflicting clauses must address the same "
            f"obligation from different angles using completely different vocabulary.\n"
            f"2. LEXICALLY NON-OVERLAPPING: No shared root words in the conflicting elements.\n"
            f"3. CONTEXTUALLY PLAUSIBLE: Each clause must sound like legitimate contract boilerplate.\n"
            f"4. LOGICALLY NON-OBVIOUS: The contradiction should only emerge when both clauses "
            f"are enforced simultaneously.\n\n"
            f"You must provide:\n"
            f"- target_clause_id: Which existing clause to modify\n"
            f"- modified_clause_text: The new version of that clause\n"
            f"- injected_clause_text: A new clause to add\n"
            f"- inject_after_clause_id: Where to insert the new clause\n"
            f"- claimed_contradiction_type: One of {CONTRADICTION_TYPES}\n"
            f"- stealth_rationale: Why you believe this will evade detection\n\n"
            f"Your injection will be validated by an Oracle. Invalid injections receive a -0.20 penalty."
        )

    def _auditor_instructions(self) -> str:
        n = len(self._modified_clauses or self._contract["clauses"])
        return (
            f"You are the AUDITOR in an Adversarial Arena episode.\n\n"
            f"You have been given a contract with {n} clauses. Exactly one logical "
            f"contradiction has been planted by the Forger. Your job is to find it.\n\n"
            f"For each finding, provide:\n"
            f"- clause_a: The first clause ID in the contradicting pair\n"
            f"- clause_b: The second clause ID in the contradicting pair\n"
            f"- reason: Why these clauses contradict each other\n"
            f"- contradiction_type: One of {CONTRADICTION_TYPES}\n\n"
            f"SCORING:\n"
            f"- Full credit for correctly identifying the injected contradiction pair.\n"
            f"- Partial credit (0.3) for identifying one of the two clauses.\n"
            f"- Each incorrect finding subtracts 0.15 from your precision score.\n"
            f"- Correct identification of the contradiction type earns reasoning quality points.\n\n"
            f"WARNING: Do not flood findings — false positives are heavily penalized."
        )

    def _grade_forger(self, auditor_action: AuditorAction) -> ForgerGradeResult:
        target_pair = tuple(sorted([self._target_clause_id, self._injected_clause_id]))
        auditor_found = False
        for f in auditor_action.findings:
            submitted_pair = tuple(sorted([f.clause_a, f.clause_b]))
            if submitted_pair == target_pair:
                auditor_found = True
                break
            if self._target_clause_id in submitted_pair or self._injected_clause_id in submitted_pair:
                auditor_found = True
                break

        stealth_raw = 1.0 if not auditor_found else 0.0
        stealth = RubricScore(
            name="stealth", weight=0.40, raw_score=stealth_raw,
            weighted_score=0.40 * stealth_raw,
            detail="Auditor missed" if not auditor_found else "Auditor found the contradiction",
        )

        validity_raw = 1.0
        validity = RubricScore(
            name="validity", weight=0.30, raw_score=validity_raw,
            weighted_score=0.30 * validity_raw,
            detail="Oracle accepted the injection as genuine.",
        )

        action = self._forger_action
        subtlety_raw = _compute_subtlety(
            action.modified_clause_text, action.injected_clause_text
        )
        subtlety = RubricScore(
            name="subtlety", weight=0.20, raw_score=subtlety_raw,
            weighted_score=0.20 * subtlety_raw,
            detail=f"Lexical distance: {subtlety_raw:.3f}",
        )

        plaus_mod = _compute_plausibility(action.modified_clause_text)
        plaus_inj = _compute_plausibility(action.injected_clause_text)
        plausibility_raw = (plaus_mod + plaus_inj) / 2.0
        plausibility = RubricScore(
            name="plausibility", weight=0.10, raw_score=plausibility_raw,
            weighted_score=0.10 * plausibility_raw,
            detail=f"Modified: {plaus_mod:.2f}, Injected: {plaus_inj:.2f}",
        )

        total = (
            stealth.weighted_score
            + validity.weighted_score
            + subtlety.weighted_score
            + plausibility.weighted_score
        )
        total = max(0.001, min(0.999, total))

        return ForgerGradeResult(
            stealth=stealth,
            validity=validity,
            subtlety=subtlety,
            plausibility=plausibility,
            total_score=round(total, 4),
            oracle_accepted=True,
        )

    def _grade_auditor(self, action: AuditorAction) -> AuditorGradeResult:
        target_pair = tuple(sorted([self._target_clause_id, self._injected_clause_id]))

        detection_raw = 0.0
        correct_type = False
        for f in action.findings:
            submitted_pair = tuple(sorted([f.clause_a, f.clause_b]))
            if submitted_pair == target_pair:
                detection_raw = 1.0
                if (
                    self._forger_action
                    and f.contradiction_type == self._forger_action.claimed_contradiction_type
                ):
                    correct_type = True
                break
            if self._target_clause_id in submitted_pair or self._injected_clause_id in submitted_pair:
                detection_raw = max(detection_raw, 0.3)
                if (
                    self._forger_action
                    and f.contradiction_type == self._forger_action.claimed_contradiction_type
                ):
                    correct_type = True

        detection = RubricScore(
            name="detection", weight=0.60, raw_score=detection_raw,
            weighted_score=0.60 * detection_raw,
            detail="Full match" if detection_raw == 1.0 else (
                "Partial match" if detection_raw > 0 else "Missed"
            ),
        )

        false_positives = 0
        for f in action.findings:
            submitted_pair = tuple(sorted([f.clause_a, f.clause_b]))
            if submitted_pair != target_pair:
                if self._target_clause_id not in submitted_pair and self._injected_clause_id not in submitted_pair:
                    false_positives += 1

        precision_raw = max(0.0, 1.0 - 0.15 * false_positives)
        precision = RubricScore(
            name="precision", weight=0.25, raw_score=precision_raw,
            weighted_score=0.25 * precision_raw,
            detail=f"{false_positives} false positive(s)",
        )

        reasoning_raw = 1.0 if correct_type else (0.3 if detection_raw > 0 else 0.0)
        reasoning = RubricScore(
            name="reasoning_quality", weight=0.15, raw_score=reasoning_raw,
            weighted_score=0.15 * reasoning_raw,
            detail="Correct type" if correct_type else (
                "Wrong type" if detection_raw > 0 else "No detection"
            ),
        )

        total = detection.weighted_score + precision.weighted_score + reasoning.weighted_score
        total = max(0.001, min(0.999, total))

        return AuditorGradeResult(
            detection=detection,
            precision=precision,
            reasoning_quality=reasoning,
            total_score=round(total, 4),
        )
