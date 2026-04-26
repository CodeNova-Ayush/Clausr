"""
ContractTimeMachine — Forensic causal-attribution RL environment.

The agent receives the complete version history of a contract and must
identify: (1) at which exact revision a fatal contradiction was introduced,
(2) which party introduced it, and (3) which clause pair forms it.
"""

import json
import random
import uuid
from pathlib import Path
from typing import Dict, List, Optional

from models import (
    Attribution,
    Clause,
    RevisionSnapshot,
    TimeMachineAction,
    TimeMachineObservation,
    TimeMachineResult,
    TimeMachineState,
)

CONTRADICTION_TYPES = ["numeric", "temporal", "party_obligation", "termination", "conditional"]


class ContractTimeMachineEnv:
    """Forensic causal-attribution environment for contract contradictions."""

    def __init__(self):
        self._episode_id = ""
        self._task_id = "timemachine_easy"
        self._contract: Optional[dict] = None
        self._ground_truth: Optional[dict] = None
        self._version_history: List[dict] = []
        self._submitted = False
        self._done = False
        self._score = 0.0
        self._contracts_dir = Path(__file__).parent.parent / "data" / "contracts"

    def reset(self, task_id: str = "timemachine_easy") -> TimeMachineObservation:
        self._task_id = task_id
        self._done = False
        self._submitted = False
        self._score = 0.0
        self._episode_id = str(uuid.uuid4())

        base = task_id.replace("timemachine_", "")
        pattern = f"timemachine_{base}_*.json"
        matching = list(self._contracts_dir.glob(pattern))

        if not matching:
            for fb in ["easy", "medium", "hard"]:
                matching = list(self._contracts_dir.glob(f"timemachine_{fb}_*.json"))
                if matching:
                    break
        if not matching:
            raise FileNotFoundError(f"No timemachine contracts for {task_id}")

        chosen = random.choice(matching)
        with open(chosen, "r", encoding="utf-8") as f:
            self._contract = json.load(f)

        self._ground_truth = self._contract["ground_truth"]
        self._version_history = self._contract["version_history"]

        return self._make_observation()

    def step(self, action: TimeMachineAction) -> TimeMachineResult:
        if self._done:
            return TimeMachineResult(
                episode_id=self._episode_id,
                task_id=self._task_id,
                score=self._score,
                reward=self._score,
                done=True,
                feedback="Episode already completed.",
                ground_truth=self._ground_truth,
            )

        attr = action.attribution
        gt = self._ground_truth
        breakdown = {}

        # ── Version scoring (0.40) ───────────────────────────────
        if attr.introduced_at_version == gt["introduced_at_version"]:
            version_score = 0.40
            version_fb = f"CORRECT: contradiction introduced at v{gt['introduced_at_version']}."
        elif abs(attr.introduced_at_version - gt["introduced_at_version"]) == 1:
            version_score = 0.20
            version_fb = (
                f"CLOSE: you said v{attr.introduced_at_version}, "
                f"actual was v{gt['introduced_at_version']} (±1 partial credit)."
            )
        else:
            version_score = 0.0
            version_fb = (
                f"WRONG: you said v{attr.introduced_at_version}, "
                f"actual was v{gt['introduced_at_version']}."
            )
        breakdown["version_score"] = version_score

        # ── Author scoring (0.25) ────────────────────────────────
        if attr.introduced_by == gt["introduced_by"]:
            author_score = 0.25
            author_fb = f"CORRECT: introduced by {gt['introduced_by']}."
        else:
            author_score = 0.0
            author_fb = (
                f"WRONG: you said {attr.introduced_by}, "
                f"actual was {gt['introduced_by']}."
            )
        breakdown["author_score"] = author_score

        # ── Clause pair scoring (0.35) ───────────────────────────
        submitted_pair = frozenset([attr.clause_a_id, attr.clause_b_id])
        gt_pair = frozenset([gt["clause_a_id"], gt["clause_b_id"]])
        if submitted_pair == gt_pair:
            clause_score = 0.35
            clause_fb = f"CORRECT: clause pair {gt['clause_a_id']} ↔ {gt['clause_b_id']}."
        elif len(submitted_pair & gt_pair) == 1:
            clause_score = 0.15
            clause_fb = (
                f"PARTIAL: one correct clause. Expected {gt['clause_a_id']} ↔ {gt['clause_b_id']}, "
                f"got {attr.clause_a_id} ↔ {attr.clause_b_id}."
            )
        else:
            clause_score = 0.0
            clause_fb = (
                f"WRONG: expected {gt['clause_a_id']} ↔ {gt['clause_b_id']}, "
                f"got {attr.clause_a_id} ↔ {attr.clause_b_id}."
            )
        breakdown["clause_pair_score"] = clause_score

        total = version_score + author_score + clause_score
        total = max(0.001, min(1.0, total))

        self._score = total
        self._submitted = True
        self._done = True

        feedback = " | ".join([version_fb, author_fb, clause_fb])

        return TimeMachineResult(
            episode_id=self._episode_id,
            task_id=self._task_id,
            score=total,
            reward=total,
            done=True,
            feedback=feedback,
            ground_truth=self._ground_truth,
            breakdown=breakdown,
        )

    @property
    def state(self) -> TimeMachineState:
        return TimeMachineState(
            episode_id=self._episode_id,
            task_id=self._task_id,
            submitted=self._submitted,
            score=self._score,
            done=self._done,
        )

    def _make_observation(self) -> TimeMachineObservation:
        snapshots = []
        for vh in self._version_history:
            snapshots.append(RevisionSnapshot(
                version=vh["version"],
                author=vh["author"],
                timestamp=vh["timestamp"],
                change_summary=vh["change_summary"],
                clauses=[Clause(**c) for c in vh["clauses"]],
            ))

        ctype = self._ground_truth.get("contradiction_type", "numeric")
        n = len(self._version_history)

        instructions = (
            f"You are a forensic contract analyst. This contract went through "
            f"{n} revision rounds between Drafter and Counterparty.\n\n"
            f"A fatal contradiction of type '{ctype}' exists in the final version. "
            f"Your task is to determine:\n"
            f"1. At which EXACT version the contradiction was first introduced\n"
            f"2. Which party (Drafter or Counterparty) authored that version\n"
            f"3. Which two clauses form the contradicting pair\n\n"
            f"STRATEGY: Examine the final version to find the contradiction, "
            f"then work backwards through the version history doing diff analysis "
            f"to find the first version where the conflict appears.\n\n"
            f"SCORING: Version identification = 0.40, Author = 0.25, "
            f"Clause pair = 0.35. Partial credit for version ±1."
        )

        return TimeMachineObservation(
            episode_id=self._episode_id,
            task_id=self._task_id,
            version_history=snapshots,
            total_versions=n,
            contradiction_type_hint=ctype,
            instructions=instructions,
            done=False,
        )
