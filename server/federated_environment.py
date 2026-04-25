"""
FederatedArena — 3-agent multi-principal legal contract negotiation environment.

Three agents: Seller (commercial bias toward seller), Buyer (commercial bias
toward buyer), Regulator (regulatory compliance monitor).  Seller and Buyer
have zero-sum commercial rewards; the Regulator has an independent reward based
on correctly flagging regulatory violations.
"""

import json
import random
import re
import uuid
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from models import (
    Clause,
    FederatedAction,
    FederatedFinalScore,
    FederatedObservation,
    FederatedState,
    InjectionAction,
    InjectionRecord,
    RegulationFlag,
)

# ── Constants ────────────────────────────────────────────────────────────

VALID_FRAMEWORKS = ["GDPR", "SOX", "EXPORT_CONTROL", "ANTI_BRIBERY"]
VALID_INTENTS = ["SELLER_FAVORABLE", "BUYER_FAVORABLE", "NEUTRAL"]
AGENT_ORDER = ["seller", "buyer", "regulator"]

# Commercial-bias keyword banks for deterministic scoring
_SELLER_KEYWORDS = [
    "limit liability", "limitation of liability", "cap on damages",
    "no consequential", "as-is", "sole discretion", "without warranty",
    "provider may", "vendor's option", "maximum aggregate",
    "best efforts", "commercially reasonable efforts",
    "shorter delivery", "reduced warranty", "expedited timeline",
    "no refund", "non-refundable",
]

_BUYER_KEYWORDS = [
    "unlimited liability", "full indemnification", "liquidated damages",
    "strict deadline", "time is of the essence", "extended warranty",
    "buyer owns", "client owns", "all intellectual property",
    "penalty for late", "service credits", "right to audit",
    "most favored customer", "right to terminate for convenience",
    "full refund", "guaranteed uptime",
]

# Regulatory violation detection patterns (deterministic heuristics)
_GDPR_VIOLATION_PATTERNS = [
    r"without.{0,30}consent",
    r"share.{0,30}personal data.{0,40}without",
    r"transfer.{0,30}(personal data|data subject).{0,40}(any|all) jurisdict",
    r"retain.{0,20}(personal data|customer).{0,30}indefinit",
    r"no provision.{0,30}(data subject|access request|erasure|right to)",
    r"without.{0,30}(data protection|impact assessment|lawful basis)",
    r"monitoring.{0,30}(without|no).{0,30}(notice|consent|basis)",
    r"keystroke.{0,15}logging",
    r"biometric.{0,15}tracking",
]

_SOX_VIOLATION_PATTERNS = [
    r"(modify|alter|purge).{0,30}(audit trail|financial|transaction record)",
    r"off-balance.sheet",
    r"deferred.{0,20}revenue.{0,20}(discretion|management)",
    r"(sole|its).{0,10}discretion.{0,30}(record|log|audit|financial)",
    r"no.{0,20}(internal control|segregation of duties)",
]

_EXPORT_CONTROL_PATTERNS = [
    r"(sublicens|transfer|shar).{0,30}(defense|military|controlled).{0,40}without.{0,30}(approv|notif|author)",
    r"without.{0,30}(export control|itar|ear|government approv)",
    r"(foreign|overseas).{0,20}(government|entity|contractor).{0,30}without",
    r"without.{0,20}end-use.{0,10}restrict",
    r"without.{0,20}deemed export",
    r"no.{0,20}(end-use|deemed export).{0,10}(restrict|control)",
]

_ANTI_BRIBERY_PATTERNS = [
    r"facilitation.{0,10}payment",
    r"(local|engagement).{0,10}fee.{0,30}(government|official|procurement)",
    r"hospitality.{0,20}(government|official|procurement)",
    r"(gift|gratuity|payment).{0,30}(government|official|public).{0,15}(officer|servant|employee)",
    r"(customary|discretionary).{0,20}(payment|fee|expenditure).{0,30}(official|government)",
]

_FRAMEWORK_PATTERNS = {
    "GDPR": _GDPR_VIOLATION_PATTERNS,
    "SOX": _SOX_VIOLATION_PATTERNS,
    "EXPORT_CONTROL": _EXPORT_CONTROL_PATTERNS,
    "ANTI_BRIBERY": _ANTI_BRIBERY_PATTERNS,
}


def _detect_violations(clause_text: str, frameworks: List[str]) -> List[str]:
    """Return list of framework names that the clause appears to violate."""
    low = clause_text.lower()
    hits = []
    for fw in frameworks:
        patterns = _FRAMEWORK_PATTERNS.get(fw, [])
        for pat in patterns:
            if re.search(pat, low):
                hits.append(fw)
                break
    return hits


def _score_commercial_bias(clause_text: str) -> float:
    """Score a clause's commercial bias.  Negative = seller-favorable, positive = buyer-favorable."""
    low = clause_text.lower()
    seller = sum(1 for kw in _SELLER_KEYWORDS if kw in low)
    buyer = sum(1 for kw in _BUYER_KEYWORDS if kw in low)
    if seller == 0 and buyer == 0:
        return 0.0
    return (buyer - seller) / max(seller + buyer, 1)


# ── Environment ──────────────────────────────────────────────────────────

class FederatedArenaEnv:
    """Three-agent multi-principal legal contract negotiation environment."""

    def __init__(self):
        self._episode_id = ""
        self._task_id = "federated_easy"
        self._contract: Optional[dict] = None
        self._base_clauses: List[dict] = []
        self._current_clauses: List[dict] = []
        self._round = 1
        self._total_rounds = 3
        self._phase = "idle"  # idle | seller_turn | buyer_turn | regulator_turn | done
        self._done = False
        self._regulatory_frameworks: List[str] = []
        self._planted_violations: List[dict] = []
        self._injections: List[InjectionRecord] = []
        self._flags: List[RegulationFlag] = []
        self._seller_score = 0.0
        self._buyer_score = 0.0
        self._regulator_score = 0.0
        self._commercial_balance = 0.0
        self._regulatory_compliance = 0.0
        self._next_clause_num = 16
        self._contracts_dir = Path(__file__).parent.parent / "data" / "contracts"

    # ── Reset ────────────────────────────────────────────────────────────

    def reset(self, task_id: str = "federated_easy") -> FederatedObservation:
        self._task_id = task_id
        self._done = False
        self._phase = "seller_turn"
        self._round = 1
        self._episode_id = str(uuid.uuid4())
        self._injections = []
        self._flags = []
        self._seller_score = 0.0
        self._buyer_score = 0.0
        self._regulator_score = 0.0
        self._commercial_balance = 0.0
        self._regulatory_compliance = 0.0
        self._next_clause_num = 16

        # Load contract data
        base = task_id.replace("federated_", "")
        pattern = f"federated_{base}_*.json"
        matching = list(self._contracts_dir.glob(pattern))
        if not matching:
            # Fallback chain
            for fb in ["easy", "medium", "hard"]:
                matching = list(self._contracts_dir.glob(f"federated_{fb}_*.json"))
                if matching:
                    break
        if not matching:
            raise FileNotFoundError(f"No federated contracts for {task_id}")

        chosen = random.choice(matching)
        with open(chosen, "r", encoding="utf-8") as f:
            self._contract = json.load(f)

        self._base_clauses = [dict(c) for c in self._contract["clauses"]]
        self._current_clauses = [dict(c) for c in self._contract["clauses"]]
        self._total_rounds = self._contract.get("total_rounds", 3)
        self._planted_violations = self._contract.get("planted_violations", [])

        # Select regulatory frameworks based on difficulty
        all_fw = self._contract.get("regulatory_frameworks", ["GDPR"])
        if "easy" in task_id:
            self._regulatory_frameworks = all_fw[:1]
        elif "medium" in task_id:
            self._regulatory_frameworks = all_fw[:2]
        else:
            self._regulatory_frameworks = all_fw

        return self._make_observation("seller")

    # ── Step ─────────────────────────────────────────────────────────────

    def step(self, action: FederatedAction) -> FederatedObservation:
        if self._done:
            return self._make_observation(action.agent_role, done=True, feedback="Episode already finished.")

        expected_role = self._phase.replace("_turn", "")
        if action.agent_role != expected_role:
            return self._make_observation(
                expected_role,
                feedback=f"Expected {expected_role} action, got {action.agent_role}.",
            )

        if action.agent_role in ("seller", "buyer"):
            return self._handle_injection(action)
        elif action.agent_role == "regulator":
            return self._handle_regulation(action)
        else:
            return self._make_observation(
                expected_role,
                feedback=f"Unknown agent_role: {action.agent_role}",
            )

    # ── Injection handling (seller / buyer) ───────────────────────────────

    def _handle_injection(self, action: FederatedAction) -> FederatedObservation:
        role = action.agent_role
        injection = action.injection
        if not injection:
            # No injection → pass (skip)
            if role == "seller":
                self._phase = "buyer_turn"
                return self._make_observation("buyer")
            else:
                self._phase = "regulator_turn"
                return self._make_observation("regulator")

        # Validate intent label
        intent = injection.commercial_intent_label
        if intent not in VALID_INTENTS:
            intent = "NEUTRAL"

        # Create new clause
        clause_id = f"clause_{self._next_clause_num:02d}"
        self._next_clause_num += 1
        new_clause = {
            "id": clause_id,
            "title": f"{'Vendor' if role == 'seller' else 'Client'} Supplementary Provision",
            "text": injection.clause_text,
        }
        self._current_clauses.append(new_clause)

        self._injections.append(InjectionRecord(
            clause_id=clause_id,
            clause_text=injection.clause_text,
            author=role,
            round=self._round,
            commercial_intent_label=intent,
        ))

        # Calculate partial commercial reward for this injection
        bias = _score_commercial_bias(injection.clause_text)
        if role == "seller":
            # Seller wants negative bias (seller-favorable)
            partial = max(0.0, -bias) * 0.3
            self._seller_score += partial
            self._buyer_score -= partial * 0.5
            self._phase = "buyer_turn"
            return self._make_observation("buyer", partial_rewards={"seller": partial})
        else:
            # Buyer wants positive bias (buyer-favorable)
            partial = max(0.0, bias) * 0.3
            self._buyer_score += partial
            self._seller_score -= partial * 0.5
            self._phase = "regulator_turn"
            return self._make_observation("regulator", partial_rewards={"buyer": partial})

    # ── Regulation handling (regulator) ────────────────────────────────────

    def _handle_regulation(self, action: FederatedAction) -> FederatedObservation:
        flags = action.flags or []

        # Score flags against planted violations
        planted_ids = {v["clause_id"]: v for v in self._planted_violations}
        round_reward = 0.0

        for flag in flags:
            self._flags.append(flag)
            if flag.clause_id in planted_ids:
                planted = planted_ids[flag.clause_id]
                if flag.violation_type == planted["violation_type"]:
                    round_reward += 1.0  # Correct detection
                else:
                    round_reward += 0.3  # Right clause, wrong framework
            else:
                # Check if the flagged clause actually has a detectable violation
                clause_text = ""
                for c in self._current_clauses:
                    if c["id"] == flag.clause_id:
                        clause_text = c["text"]
                        break
                detected = _detect_violations(clause_text, self._regulatory_frameworks)
                if flag.violation_type in detected:
                    round_reward += 0.5  # Caught an injected violation
                else:
                    round_reward -= 0.3  # False positive

        self._regulator_score += round_reward

        # Advance round
        self._round += 1
        if self._round > self._total_rounds:
            self._done = True
            self._phase = "done"
            self._compute_final_scores()
            return self._make_observation("regulator", done=True, partial_rewards={"regulator": round_reward})
        else:
            self._phase = "seller_turn"
            return self._make_observation("seller", partial_rewards={"regulator": round_reward})

    # ── Final scoring ────────────────────────────────────────────────────

    def _compute_final_scores(self) -> None:
        """Compute commercial balance and regulatory compliance at episode end."""
        # Commercial balance: aggregate bias of all clauses
        total_bias = 0.0
        for c in self._current_clauses:
            total_bias += _score_commercial_bias(c["text"])

        # Normalize to [-1.0, 1.0]
        n = max(len(self._current_clauses), 1)
        self._commercial_balance = max(-1.0, min(1.0, total_bias / n * 3.0))

        # Final seller/buyer scores incorporate commercial balance
        # Negative balance = seller-favorable
        if self._commercial_balance < 0:
            self._seller_score += abs(self._commercial_balance) * 0.5
            self._buyer_score -= abs(self._commercial_balance) * 0.5
        else:
            self._buyer_score += self._commercial_balance * 0.5
            self._seller_score -= self._commercial_balance * 0.5

        # Regulatory compliance: how many planted violations were correctly flagged
        planted_ids = {v["clause_id"]: v["violation_type"] for v in self._planted_violations}
        flagged_ids = {f.clause_id: f.violation_type for f in self._flags}

        correct = 0
        for pid, ptype in planted_ids.items():
            if pid in flagged_ids and flagged_ids[pid] == ptype:
                correct += 1

        total_planted = max(len(planted_ids), 1)
        self._regulatory_compliance = correct / total_planted

        # Missed violations penalty
        missed = len(planted_ids) - correct
        self._regulator_score -= missed * 0.5

        # Clamp scores
        self._seller_score = max(0.001, min(0.999, self._seller_score))
        self._buyer_score = max(0.001, min(0.999, self._buyer_score))
        self._regulator_score = max(0.001, min(0.999, self._regulator_score))

    def get_final_score(self) -> FederatedFinalScore:
        """Return complete final scores with breakdown."""
        if not self._done:
            self._compute_final_scores()

        planted_ids = {v["clause_id"]: v["violation_type"] for v in self._planted_violations}
        flagged_ids = {f.clause_id: f.violation_type for f in self._flags}
        correct = sum(
            1 for pid, ptype in planted_ids.items()
            if pid in flagged_ids and flagged_ids[pid] == ptype
        )

        # Count false positives
        false_pos = 0
        for f in self._flags:
            if f.clause_id not in planted_ids:
                clause_text = ""
                for c in self._current_clauses:
                    if c["id"] == f.clause_id:
                        clause_text = c["text"]
                        break
                detected = _detect_violations(clause_text, self._regulatory_frameworks)
                if f.violation_type not in detected:
                    false_pos += 1

        return FederatedFinalScore(
            episode_id=self._episode_id,
            task_id=self._task_id,
            seller_score=self._seller_score,
            buyer_score=self._buyer_score,
            regulator_score=self._regulator_score,
            commercial_balance=self._commercial_balance,
            regulatory_compliance=self._regulatory_compliance,
            injections=self._injections,
            flags=self._flags,
            planted_violations_found=correct,
            planted_violations_total=len(self._planted_violations),
            false_positives=false_pos,
            breakdown={
                "seller_injection_value": sum(
                    max(0.0, -_score_commercial_bias(inj.clause_text))
                    for inj in self._injections if inj.author == "seller"
                ),
                "buyer_injection_value": sum(
                    max(0.0, _score_commercial_bias(inj.clause_text))
                    for inj in self._injections if inj.author == "buyer"
                ),
                "regulator_correct_flags": float(correct),
                "regulator_false_positives": float(false_pos),
                "commercial_balance": self._commercial_balance,
                "regulatory_compliance": self._regulatory_compliance,
            },
        )

    # ── State ────────────────────────────────────────────────────────────

    @property
    def state(self) -> FederatedState:
        return FederatedState(
            episode_id=self._episode_id,
            task_id=self._task_id,
            round=self._round,
            total_rounds=self._total_rounds,
            current_clauses=[Clause(**c) for c in self._current_clauses],
            injections=self._injections,
            flags=self._flags,
            seller_score=round(self._seller_score, 4),
            buyer_score=round(self._buyer_score, 4),
            regulator_score=round(self._regulator_score, 4),
            commercial_balance=round(self._commercial_balance, 4),
            regulatory_compliance=round(self._regulatory_compliance, 4),
            next_agent_role=self._phase.replace("_turn", ""),
            done=self._done,
        )

    # ── Observation builder ──────────────────────────────────────────────

    def _make_observation(
        self,
        next_role: str,
        done: bool = False,
        feedback: Optional[str] = None,
        partial_rewards: Optional[Dict[str, float]] = None,
    ) -> FederatedObservation:
        return FederatedObservation(
            episode_id=self._episode_id,
            task_id=self._task_id,
            base_clauses=[Clause(**c) for c in self._base_clauses],
            current_clauses=[Clause(**c) for c in self._current_clauses],
            round=self._round,
            total_rounds=self._total_rounds,
            next_agent_role=next_role,
            regulatory_frameworks=self._regulatory_frameworks,
            instructions=self._instructions_for(next_role),
            done=done or self._done,
            feedback=feedback,
            partial_rewards=partial_rewards,
        )

    def _instructions_for(self, role: str) -> str:
        n = len(self._current_clauses)
        fw_str = ", ".join(self._regulatory_frameworks)

        if role == "seller":
            return (
                f"You are the SELLER in a FederatedArena episode (round {self._round}/{self._total_rounds}).\n\n"
                f"The contract currently has {n} clauses. Your goal is to inject ONE clause that "
                f"favors the Seller commercially — limiting liability, shortening delivery "
                f"obligations, expanding IP rights, or reducing payment obligations.\n\n"
                f"Your injection should be subtle enough to avoid detection by the Regulator.\n\n"
                f"Respond with:\n"
                f"- clause_text: The text of the clause to inject\n"
                f"- commercial_intent_label: SELLER_FAVORABLE\n"
            )
        elif role == "buyer":
            return (
                f"You are the BUYER in a FederatedArena episode (round {self._round}/{self._total_rounds}).\n\n"
                f"The contract currently has {n} clauses (the Seller just injected a clause). "
                f"Your goal is to inject ONE clause that favors the Buyer commercially — "
                f"maximizing vendor liability, extending warranty periods, claiming IP ownership, "
                f"or enforcing strict delivery timelines.\n\n"
                f"Respond with:\n"
                f"- clause_text: The text of the clause to inject\n"
                f"- commercial_intent_label: BUYER_FAVORABLE\n"
            )
        else:
            return (
                f"You are the REGULATOR in a FederatedArena episode (round {self._round}/{self._total_rounds}).\n\n"
                f"The contract currently has {n} clauses. Both the Seller and Buyer have "
                f"injected clauses. Your goal is to identify clauses that violate regulatory "
                f"frameworks.\n\n"
                f"Active regulatory frameworks: {fw_str}\n\n"
                f"For each violation found, provide:\n"
                f"- clause_id: The ID of the violating clause\n"
                f"- violation_type: One of {fw_str}\n"
                f"- explanation: Why this clause violates the framework\n\n"
                f"SCORING: +1.0 per correct detection, -0.5 per missed violation, -0.3 per false positive.\n"
                f"Be precise — false positives are heavily penalized."
            )
