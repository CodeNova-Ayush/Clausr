"""
ContractDNA — Deterministic heuristic risk-fingerprinting engine.

Produces a 5-dimension risk vector for any contract without calling an LLM.
Each dimension scores 0.0–1.0 based on per-clause cross-comparison heuristics.
"""

import re
from typing import Dict, List, Optional, Tuple

from models import FingerprintDelta, FingerprintResult

# ── Regex helpers ────────────────────────────────────────────────────────

_NUM_RE = re.compile(r"\b(\d+(?:,\d{3})*(?:\.\d+)?)\b")
_PERCENT_RE = re.compile(r"\b(\d+(?:\.\d+)?)\s*%")
_MONEY_RE = re.compile(r"\$\s*(\d+(?:,\d{3})*(?:\.\d+)?)")

_OBLIGATION_KEYWORDS = [
    "payment", "delivery", "notice", "termination", "liability",
    "confidentiality", "warranty", "indemnification", "compliance",
    "renewal", "penalty", "fee", "insurance", "audit", "inspection",
]

_TEMPORAL_TERMS = [
    "days", "weeks", "months", "years", "business days", "calendar days",
    "notice", "deadline", "effective date", "renewal", "expiry",
    "termination", "within", "prior to", "no later than", "before",
]

_DUTY_VERBS = ["shall", "must", "responsible for", "obligated to", "agrees to", "will"]

_PARTY_INDICATORS = [
    "buyer", "seller", "licensor", "licensee", "provider", "client",
    "employer", "employee", "landlord", "tenant", "party a", "party b",
    "company", "contractor", "vendor", "customer", "borrower", "lender",
    "disclosing party", "receiving party",
]

_TERMINATION_TERMS = [
    "termination", "renewal", "expiry", "auto-renew", "automatically renew",
    "notice period", "terminate", "survive", "cancellation", "wind down",
    "non-renewal",
]

_CONDITIONAL_TERMS = [
    "if", "unless", "except", "notwithstanding", "provided that",
    "in the event that", "subject to", "in the event of", "on condition that",
    "save that", "excluding",
]


def _extract_numbers(text: str) -> List[float]:
    """Return all numeric values found in text."""
    nums = []
    for m in _NUM_RE.finditer(text):
        try:
            nums.append(float(m.group(1).replace(",", "")))
        except ValueError:
            continue
    return nums


def _shared_obligation_keywords(a: str, b: str) -> List[str]:
    """Return obligation keywords appearing in both texts."""
    a_low, b_low = a.lower(), b.lower()
    return [kw for kw in _OBLIGATION_KEYWORDS if kw in a_low and kw in b_low]


def _extract_time_references(text: str) -> List[Tuple[float, str]]:
    """Extract (quantity, unit) pairs like '30 days', '6 months'."""
    pattern = re.compile(
        r"(\d+(?:\.\d+)?)\s*(days?|business days?|calendar days?|weeks?|months?|years?)",
        re.IGNORECASE,
    )
    results = []
    for m in pattern.finditer(text):
        try:
            results.append((float(m.group(1)), m.group(2).lower().rstrip("s")))
        except ValueError:
            continue
    return results


def _extract_parties_mentioned(text: str) -> List[str]:
    """Return party indicator terms found in text."""
    low = text.lower()
    return [p for p in _PARTY_INDICATORS if p in low]


def _extract_duty_phrases(text: str) -> List[str]:
    """Extract short phrases around duty verbs for comparison."""
    low = text.lower()
    phrases = []
    for verb in _DUTY_VERBS:
        idx = low.find(verb)
        while idx != -1:
            start = max(0, idx - 30)
            end = min(len(low), idx + len(verb) + 60)
            phrases.append(low[start:end].strip())
            idx = low.find(verb, idx + 1)
    return phrases


def _has_conditional(text: str) -> List[str]:
    """Return conditional terms found in the text."""
    low = text.lower()
    return [t for t in _CONDITIONAL_TERMS if t in low]


# ── Engine ───────────────────────────────────────────────────────────────

class ContractDNAEngine:
    """Deterministic, LLM-free risk fingerprinting for legal contracts."""

    def __init__(self):
        self.history: Dict[str, FingerprintResult] = {}

        self.weights = {
            "numeric": 0.20,
            "temporal": 0.20,
            "party_obligation": 0.25,
            "termination": 0.20,
            "conditional": 0.15,
        }

    # ── Schema (for GET /fingerprint/schema) ─────────────────────────────

    def get_schema(self) -> dict:
        return {
            "dimensions": [
                {
                    "name": "Numeric Risk",
                    "key": "numeric_risk",
                    "weight": self.weights["numeric"],
                    "description": (
                        "Measures density of numeric quantities (days, amounts, "
                        "percentages) and conflicts when similar obligations "
                        "reference different numeric values."
                    ),
                },
                {
                    "name": "Temporal Risk",
                    "key": "temporal_risk",
                    "weight": self.weights["temporal"],
                    "description": (
                        "Detects time-related constraints — deadlines, notice "
                        "periods, renewal windows — and flags risk when the same "
                        "event is referenced with different time windows."
                    ),
                },
                {
                    "name": "Party-Obligation Risk",
                    "key": "party_obligation_risk",
                    "weight": self.weights["party_obligation"],
                    "description": (
                        "Scores strictness and conflict potential of duties "
                        "using modal verbs (shall, must, obligated to) and "
                        "whether the same duty is assigned to different parties."
                    ),
                },
                {
                    "name": "Termination Risk",
                    "key": "termination_risk",
                    "weight": self.weights["termination"],
                    "description": (
                        "Measures conflict potential in termination, renewal, "
                        "and expiry clauses — especially when auto-renewal and "
                        "explicit expiry language coexist."
                    ),
                },
                {
                    "name": "Conditional Risk",
                    "key": "conditional_risk",
                    "weight": self.weights["conditional"],
                    "description": (
                        "Measures complexity of conditional language (if, unless, "
                        "notwithstanding, provided that) and flags risk when the "
                        "same outcome is conditioned on contradictory triggers."
                    ),
                },
            ]
        }

    # ── Main fingerprint calculation ─────────────────────────────────────

    def calculate_fingerprint(
        self,
        clause_texts: List[str],
        episode_id: Optional[str] = None,
    ) -> FingerprintResult:
        n = max(len(clause_texts), 1)

        numeric_score = self._score_numeric(clause_texts, n)
        temporal_score = self._score_temporal(clause_texts, n)
        party_score = self._score_party_obligation(clause_texts, n)
        term_score = self._score_termination(clause_texts, n)
        cond_score = self._score_conditional(clause_texts, n)

        overall = (
            numeric_score * self.weights["numeric"]
            + temporal_score * self.weights["temporal"]
            + party_score * self.weights["party_obligation"]
            + term_score * self.weights["termination"]
            + cond_score * self.weights["conditional"]
        )

        if overall >= 0.75:
            label = "CRITICAL"
        elif overall >= 0.50:
            label = "HIGH"
        elif overall >= 0.25:
            label = "MEDIUM"
        else:
            label = "LOW"

        scores_dict = {
            "Numeric Risk": numeric_score,
            "Temporal Risk": temporal_score,
            "Party-Obligation Risk": party_score,
            "Termination Risk": term_score,
            "Conditional Risk": cond_score,
        }
        dominant = max(scores_dict.items(), key=lambda x: x[1])[0]

        result = FingerprintResult(
            episode_id=episode_id,
            numeric_risk=round(numeric_score, 3),
            temporal_risk=round(temporal_score, 3),
            party_obligation_risk=round(party_score, 3),
            termination_risk=round(term_score, 3),
            conditional_risk=round(cond_score, 3),
            overall_risk=round(overall, 3),
            risk_label=label,
            dominant_risk_type=dominant,
            contradiction_distribution={
                "numeric": round(numeric_score, 3),
                "temporal": round(temporal_score, 3),
                "party_obligation": round(party_score, 3),
                "termination": round(term_score, 3),
                "conditional": round(cond_score, 3),
            },
            obligation_density=round(min(1.0, sum([1 for c in clause_texts if any(kw in c.lower() for kw in _OBLIGATION_KEYWORDS)]) / max(n, 1)), 3),
            complexity_score=round((numeric_score + temporal_score + cond_score) / 3, 3),
            estimated_difficulty="HARD" if overall >= 0.6 else "MEDIUM" if overall >= 0.3 else "EASY",
        )

        # Delta calculation for repeated calls on the same episode
        if episode_id:
            if episode_id in self.history:
                prev = self.history[episode_id]
                deltas = {
                    "Numeric Risk": result.numeric_risk - prev.numeric_risk,
                    "Temporal Risk": result.temporal_risk - prev.temporal_risk,
                    "Party-Obligation Risk": result.party_obligation_risk - prev.party_obligation_risk,
                    "Termination Risk": result.termination_risk - prev.termination_risk,
                    "Conditional Risk": result.conditional_risk - prev.conditional_risk,
                }

                max_dim = max(deltas.items(), key=lambda x: abs(x[1]))
                magnitude = max_dim[1]
                attack_detected = any(d > 0.30 for d in deltas.values())

                result.delta = FingerprintDelta(
                    changed_most_dimension=max_dim[0],
                    magnitude=round(magnitude, 3),
                    attack_detected=attack_detected,
                )

            # Store for future delta comparison
            self.history[episode_id] = result

        return result

    # ── Dimension 1: Numeric Risk ────────────────────────────────────────

    def _score_numeric(self, clauses: List[str], n: int) -> float:
        """
        High risk when:
        - Many clauses contain numeric values
        - Two clauses sharing obligation keywords have *different* numeric values
        """
        clauses_with_nums = 0
        clause_nums: List[Tuple[int, List[float]]] = []  # (index, numbers)
        conflict_pairs = 0

        for i, text in enumerate(clauses):
            nums = _extract_numbers(text)
            if nums:
                clauses_with_nums += 1
            clause_nums.append((i, nums))

        # Density component: how many clauses have numbers
        density = min(1.0, clauses_with_nums / max(n, 1) * 1.5)

        # Conflict component: clauses sharing obligation keywords but different numbers
        for i in range(len(clauses)):
            for j in range(i + 1, len(clauses)):
                shared_kw = _shared_obligation_keywords(clauses[i], clauses[j])
                if shared_kw:
                    nums_i = set(clause_nums[i][1])
                    nums_j = set(clause_nums[j][1])
                    if nums_i and nums_j and nums_i != nums_j:
                        conflict_pairs += 1

        conflict = min(1.0, conflict_pairs * 0.20)

        return min(1.0, density * 0.4 + conflict * 0.6)

    # ── Dimension 2: Temporal Risk ───────────────────────────────────────

    def _score_temporal(self, clauses: List[str], n: int) -> float:
        """
        High risk when:
        - Multiple clauses reference time constraints
        - Same event / obligation keyword appears with different time windows
        """
        time_clauses = 0
        clause_time_refs: List[List[Tuple[float, str]]] = []
        conflict_count = 0

        for text in clauses:
            refs = _extract_time_references(text)
            if refs:
                time_clauses += 1
            clause_time_refs.append(refs)

        # How many clauses have temporal terms (broader check)
        temporal_density = 0
        for text in clauses:
            low = text.lower()
            if any(t in low for t in _TEMPORAL_TERMS):
                temporal_density += 1
        temporal_density_score = min(1.0, temporal_density / max(n, 1) * 2.0)

        # Cross-clause: same obligation keyword, different time values
        for i in range(len(clauses)):
            for j in range(i + 1, len(clauses)):
                shared_kw = _shared_obligation_keywords(clauses[i], clauses[j])
                if shared_kw and clause_time_refs[i] and clause_time_refs[j]:
                    # Normalize to days for comparison
                    vals_i = {self._normalize_to_days(q, u) for q, u in clause_time_refs[i]}
                    vals_j = {self._normalize_to_days(q, u) for q, u in clause_time_refs[j]}
                    if vals_i and vals_j and vals_i != vals_j:
                        conflict_count += 1

        conflict_score = min(1.0, conflict_count * 0.25)

        return min(1.0, temporal_density_score * 0.35 + conflict_score * 0.65)

    @staticmethod
    def _normalize_to_days(quantity: float, unit: str) -> float:
        """Convert a time quantity to approximate days for comparison."""
        unit = unit.lower().rstrip("s")
        multipliers = {
            "day": 1, "business day": 1, "calendar day": 1,
            "week": 7, "month": 30, "year": 365,
        }
        return quantity * multipliers.get(unit, 1)

    # ── Dimension 3: Party-Obligation Risk ───────────────────────────────

    def _score_party_obligation(self, clauses: List[str], n: int) -> float:
        """
        High risk when:
        - Many clauses contain duty language (shall, must, obligated to)
        - The same duty / obligation keyword appears assigned to different parties
        """
        duty_clauses = 0
        clause_duties: List[Tuple[List[str], List[str]]] = []  # (parties, duty_phrases)
        conflict_count = 0

        for text in clauses:
            parties = _extract_parties_mentioned(text)
            duties = _extract_duty_phrases(text)
            if duties:
                duty_clauses += 1
            clause_duties.append((parties, duties))

        density = min(1.0, duty_clauses / max(n, 1) * 1.5)

        # Cross-clause: same obligation keyword but different parties
        for i in range(len(clauses)):
            for j in range(i + 1, len(clauses)):
                shared_kw = _shared_obligation_keywords(clauses[i], clauses[j])
                parties_i = set(clause_duties[i][0])
                parties_j = set(clause_duties[j][0])
                duties_i = clause_duties[i][1]
                duties_j = clause_duties[j][1]

                if shared_kw and duties_i and duties_j:
                    # Different parties mentioned → potential role conflict
                    if parties_i and parties_j and parties_i != parties_j:
                        conflict_count += 1

        conflict = min(1.0, conflict_count * 0.20)

        return min(1.0, density * 0.4 + conflict * 0.6)

    # ── Dimension 4: Termination Risk ────────────────────────────────────

    def _score_termination(self, clauses: List[str], n: int) -> float:
        """
        High risk when:
        - Multiple clauses discuss termination / renewal / expiry
        - Both auto-renewal AND explicit expiry language exist
        """
        term_clause_count = 0
        has_auto_renew = False
        has_explicit_expiry = False
        has_termination_for_convenience = False
        has_termination_for_cause = False

        auto_renew_terms = ["auto-renew", "automatically renew", "automatic renewal", "shall renew"]
        expiry_terms = ["expiry", "expire", "expiration", "fixed term", "shall not renew", "non-renewal"]
        for_convenience = ["for convenience", "without cause", "at will", "at any time"]
        for_cause = ["for cause", "material breach", "with cause"]

        for text in clauses:
            low = text.lower()
            if any(t in low for t in _TERMINATION_TERMS):
                term_clause_count += 1
            if any(t in low for t in auto_renew_terms):
                has_auto_renew = True
            if any(t in low for t in expiry_terms):
                has_explicit_expiry = True
            if any(t in low for t in for_convenience):
                has_termination_for_convenience = True
            if any(t in low for t in for_cause):
                has_termination_for_cause = True

        density = min(1.0, term_clause_count / max(n, 1) * 3.0)

        # Conflict: auto-renew + explicit expiry is a classic contradiction source
        conflict = 0.0
        if has_auto_renew and has_explicit_expiry:
            conflict += 0.50
        if has_termination_for_convenience and has_termination_for_cause:
            conflict += 0.30
        conflict = min(1.0, conflict)

        return min(1.0, density * 0.35 + conflict * 0.65)

    # ── Dimension 5: Conditional Risk ────────────────────────────────────

    def _score_conditional(self, clauses: List[str], n: int) -> float:
        """
        High risk when:
        - Many clauses use conditional language
        - Same outcome appears conditioned on contradictory triggers
        """
        cond_clause_count = 0
        clause_conditions: List[List[str]] = []
        conflict_count = 0

        for text in clauses:
            conds = _has_conditional(text)
            if conds:
                cond_clause_count += 1
            clause_conditions.append(conds)

        density = min(1.0, cond_clause_count / max(n, 1) * 2.0)

        # Cross-clause: same obligation but contradictory conditional triggers
        contradictory_pairs = [
            ("if", "unless"),
            ("if", "except"),
            ("notwithstanding", "subject to"),
            ("provided that", "unless"),
            ("in the event that", "except"),
        ]

        for i in range(len(clauses)):
            for j in range(i + 1, len(clauses)):
                shared_kw = _shared_obligation_keywords(clauses[i], clauses[j])
                if shared_kw and clause_conditions[i] and clause_conditions[j]:
                    conds_i = set(clause_conditions[i])
                    conds_j = set(clause_conditions[j])
                    # Check for contradictory trigger pairs
                    for pair_a, pair_b in contradictory_pairs:
                        if (pair_a in conds_i and pair_b in conds_j) or \
                           (pair_b in conds_i and pair_a in conds_j):
                            conflict_count += 1
                            break

        conflict = min(1.0, conflict_count * 0.30)

        return min(1.0, density * 0.35 + conflict * 0.65)


# ── Module-level singleton ───────────────────────────────────────────────

dna_engine = ContractDNAEngine()
