import json
import random
import uuid
from pathlib import Path
from typing import Tuple, Optional

from models import ContractObservation, ContractAction, Clause, ContractState, Finding

class ContractFixEnv:
    def __init__(self):
        self._episode_id = ""
        self._task_id = "easy"
        self._contract = None
        self._score = 0.001
        self._done = False
        self._contradictions_found = 0
        self._last_feedback = None
        self._contracts_dir = Path(__file__).parent.parent / "data" / "contracts"

    def reset(self, task_id: str = "easy") -> ContractObservation:
        self._task_id = task_id
        self._done = False
        self._score = 0.001
        self._contradictions_found = 0
        self._episode_id = str(uuid.uuid4())
        self._last_feedback = None

        pattern = f"{task_id}_*.json"
        matching_files = list(self._contracts_dir.glob(pattern))

        if not matching_files:
            raise FileNotFoundError(
                f"No contracts found for task_id: {task_id} at {self._contracts_dir}/{pattern}"
            )

        chosen_file = random.choice(matching_files)
        with open(chosen_file, "r", encoding="utf-8") as f:
            self._contract = json.load(f)

        return self._make_observation(done=False)

    def load_contract_by_id(self, contract_id: str) -> None:
        """Load a specific contract by its contract_id (e.g. 'easy_001')."""
        filepath = self._contracts_dir / f"{contract_id}.json"
        if not filepath.exists():
            raise FileNotFoundError(f"Contract file not found: {filepath}")
        with open(filepath, "r", encoding="utf-8") as f:
            self._contract = json.load(f)
        self._task_id = self._contract.get("task_id", "easy")
        self._episode_id = str(uuid.uuid4())
        self._done = False
        self._score = 0.001
        self._contradictions_found = 0
        self._last_feedback = None

    def step(self, action: ContractAction) -> ContractObservation:
        if self._done:
            return self._make_observation(
                done=True, score=self._score, feedback=self._last_feedback
            )

        score, feedback, found = self._grade(action)
        self._score = score
        self._contradictions_found = found
        self._done = True
        self._last_feedback = feedback

        return self._make_observation(done=True, score=self._score, feedback=feedback)

    @property
    def state(self) -> ContractState:
        n_total = (
            len(self._contract["contradictions"]) if self._contract is not None else 0
        )
        return ContractState(
            episode_id=self._episode_id,
            task_id=self._task_id,
            score=self._score,
            contradictions_found=self._contradictions_found,
            contradictions_total=n_total,
            done=self._done,
        )

    def _make_observation(
        self, done: bool, score: float = None, feedback: str = None
    ) -> ContractObservation:
        clauses = [Clause(**c) for c in self._contract["clauses"]]
        num_contradictions = len(self._contract["contradictions"])

        return ContractObservation(
            contract_text=self._contract["contract_text"],
            clauses=clauses,
            task_id=self._task_id,
            num_contradictions=num_contradictions,
            instructions=self._instructions(),
            done=done,
            score=score,
            feedback=feedback,
            episode_id=self._episode_id,
            contract_id=self._contract.get("contract_id", ""),
        )

    def _instructions(self) -> str:
        n = len(self._contract["contradictions"])
        return (
            f"Read the following contract carefully. There are exactly {n} internal "
            "contradictions in this document. A contradiction is a pair of clauses within "
            "the same document that directly conflict with each other about the same obligation, "
            "right, timeframe, cost, or party responsibility.\n"
            f"Your task is to identify all {n} contradictions. For each contradiction, provide "
            "the clause_a_id and clause_b_id, along with a brief explanation of why they conflict.\n"
            "WARNING: Do NOT flag clauses that apply to different scenarios or contexts as contradictions. "
            "For example, different notice periods for termination for cause vs termination for convenience are NOT contradictions.\n"
            "WARNING: Do NOT flag clauses where one explicitly says 'notwithstanding' or 'subject to' "
            "referring to the other — these are intentional legal overrides, NOT contradictions.\n"
            "WARNING: Do NOT flag clauses that cover complementary, non-overlapping scopes (e.g., "
            "different geographic regions, different service tiers, different user types)."
        )

    def _grade(self, action: ContractAction) -> Tuple[float, str, int]:
        true_pairs = set()
        for c in self._contract.get("contradictions", []):
            true_pairs.add(tuple(sorted([c["clause_a_id"], c["clause_b_id"]])))

        found_pairs = set()
        for f in action.findings:
            found_pairs.add(tuple(sorted([f.clause_a_id, f.clause_b_id])))

        true_positives = len(found_pairs & true_pairs)
        false_positives = len(found_pairs - true_pairs)

        if not true_pairs:
            raw = 1.0
        else:
            raw = true_positives / len(true_pairs)

        lambda_penalty = {"easy": 0.10, "medium": 0.15, "hard": 0.20}.get(self._task_id, 0.10)
        score = max(0.001, min(0.999, raw - (lambda_penalty * false_positives)))
        score = round(score, 4)

        feedback_string = (
            f"Correctly identified: {true_positives}/{len(true_pairs)} contradictions. "
            f"False positives: {false_positives}. Score: {score:.2f} (Penalty scale: {lambda_penalty})"
        )

        return score, feedback_string, true_positives
