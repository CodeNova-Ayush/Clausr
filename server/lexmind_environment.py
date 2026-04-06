import json
import random
import uuid
from pathlib import Path
from typing import Tuple

from models import (
    LexMindObservation, LexMindEpisodeAction, LexMindState, Clause, DraftingEvent
)


class LexMindEnv:
    """Incremental observation environment for contract drafting monitoring."""

    def __init__(self):
        self._episode_id = ""
        self._task_id = "lexmind_easy"
        self._contract = None
        self._drafting_sequence = []
        self._score = 0.0
        self._done = False
        self._correctly_detected = 0
        self._false_alarms = 0
        self._contradictions_total = 0
        self._last_feedback = None
        self._contracts_dir = Path(__file__).parent.parent / "data" / "contracts"

    def reset(self, task_id: str = "lexmind_easy") -> LexMindObservation:
        self._task_id = task_id
        self._done = False
        self._score = 0.0
        self._correctly_detected = 0
        self._false_alarms = 0
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

        self._drafting_sequence = self._contract["drafting_sequence"]
        self._contradictions_total = sum(
            1 for e in self._drafting_sequence if e.get("introduces_contradiction")
        )

        return self._make_observation(done=False)

    def load_contract_by_id(self, contract_id: str) -> None:
        filepath = self._contracts_dir / f"{contract_id}.json"
        if not filepath.exists():
            raise FileNotFoundError(f"Contract file not found: {filepath}")
        with open(filepath, "r", encoding="utf-8") as f:
            self._contract = json.load(f)
        self._task_id = self._contract.get("task_id", "lexmind_easy")
        self._episode_id = str(uuid.uuid4())
        self._done = False
        self._score = 0.0
        self._correctly_detected = 0
        self._false_alarms = 0
        self._last_feedback = None
        self._drafting_sequence = self._contract["drafting_sequence"]
        self._contradictions_total = sum(
            1 for e in self._drafting_sequence if e.get("introduces_contradiction")
        )

    def step(self, action: LexMindEpisodeAction) -> LexMindObservation:
        if self._done:
            return self._make_observation(
                done=True, score=self._score, feedback=self._last_feedback
            )

        score, feedback, detected, false_alarms = self._grade(action)
        self._score = score
        self._correctly_detected = detected
        self._false_alarms = false_alarms
        self._done = True
        self._last_feedback = feedback

        return self._make_observation(done=True, score=self._score, feedback=feedback)

    @property
    def state(self) -> LexMindState:
        return LexMindState(
            episode_id=self._episode_id,
            task_id=self._task_id,
            current_step=len(self._drafting_sequence) if self._done else 0,
            total_steps=len(self._drafting_sequence),
            contradictions_introduced_so_far=self._contradictions_total,
            correctly_detected_so_far=self._correctly_detected,
            false_alarms_so_far=self._false_alarms,
            score=self._score,
            done=self._done,
        )

    def get_stripped_sequence(self):
        """Return the drafting sequence with ground truth fields removed."""
        return [self._strip_event(e) for e in self._drafting_sequence]

    def get_full_sequence(self):
        """Return the full drafting sequence including ground truth (for grading UI)."""
        return self._drafting_sequence

    def _strip_event(self, event: dict) -> dict:
        """Remove ground truth contradiction fields from a drafting event."""
        return {
            "event_id": event["event_id"],
            "round": event["round"],
            "round_label": event["round_label"],
            "authored_by": event["authored_by"],
            "action": event["action"],
            "clause_id": event["clause_id"],
            "clause_title": event["clause_title"],
            "clause_text": event["clause_text"],
        }

    def _make_observation(
        self, done: bool, score: float = None, feedback: str = None
    ) -> LexMindObservation:
        seq = self._drafting_sequence
        total = len(seq)

        # Build clauses_so_far from drafting sequence
        clauses_so_far = []
        for event in seq:
            clauses_so_far.append(Clause(
                id=event["clause_id"],
                title=event["clause_title"],
                text=event["clause_text"],
            ))

        first_event = seq[0] if seq else {}
        stripped_sequence = self.get_stripped_sequence()

        return LexMindObservation(
            episode_id=self._episode_id,
            task_id=self._task_id,
            step_number=1,
            total_steps=total,
            current_event=self._strip_event(first_event) if first_event else {},
            clauses_so_far=clauses_so_far,
            drafting_sequence=stripped_sequence,
            round_number=first_event.get("round", 1),
            round_label=first_event.get("round_label", ""),
            authored_by=first_event.get("authored_by", ""),
            action=first_event.get("action", ""),
            instructions=self._instructions(),
            done=done,
            score=score,
            feedback=feedback,
            contract_title=self._contract.get("title", ""),
        )

    def _instructions(self) -> str:
        total = len(self._drafting_sequence)
        n_contradictions = self._contradictions_total
        rounds = max(e["round"] for e in self._drafting_sequence)
        return (
            f"You are monitoring a contract negotiation with {total} drafting events "
            f"across {rounds} negotiation round(s). "
            f"There are exactly {n_contradictions} contradiction introduction events in this sequence.\n\n"
            "For each drafting event, determine:\n"
            "1. Does accepting this clause introduce a CONTRADICTION with any clause already in the draft?\n"
            "2. If yes, which existing clause does it conflict with?\n\n"
            "A contradiction is introduced when a new clause makes an incompatible demand "
            "on the same obligation, right, timeframe, party responsibility, or defined term "
            "that is already covered by an existing accepted clause.\n\n"
            "IMPORTANT: Some events may RESOLVE a previous contradiction by explicitly overriding "
            "or superseding an earlier clause. These are NOT new contradictions — they are fixes. "
            "Do NOT flag resolution events as contradiction introductions.\n\n"
            "Return a JSON object with a 'steps' array. Each step has:\n"
            "- event_id: the event ID\n"
            "- introduces_contradiction: boolean\n"
            "- contradicts_clause_id: the conflicting clause ID (or null)\n"
            "- explanation: brief reasoning"
        )

    def _grade(self, action: LexMindEpisodeAction) -> Tuple[float, str, int, int]:
        """Grade the agent's predictions against ground truth."""
        step_map = {s.event_id: s for s in action.steps}
        total_events = len(self._drafting_sequence)

        total_score = 0.0
        penalties = 0.0
        correctly_detected = 0
        false_alarms = 0
        missed = 0

        for event in self._drafting_sequence:
            eid = event["event_id"]
            gt_contradiction = event.get("introduces_contradiction", False)
            gt_clause_id = event.get("contradicts_clause_id")
            gt_resolves = event.get("resolves_contradiction", False)

            step = step_map.get(eid)
            if step is None:
                # Missing prediction — treat as "no contradiction"
                if gt_contradiction:
                    missed += 1
                    penalties += 0.2
                elif gt_resolves:
                    total_score += 0.5  # Benefit of doubt for resolution
                else:
                    total_score += 0.3
                continue

            pred_contradiction = step.introduces_contradiction
            pred_clause_id = step.contradicts_clause_id

            if gt_contradiction:
                if pred_contradiction:
                    if pred_clause_id and gt_clause_id and pred_clause_id == gt_clause_id:
                        total_score += 1.0
                        correctly_detected += 1
                    else:
                        total_score += 0.4  # Partial credit — wrong clause
                        correctly_detected += 1  # Still detected the event
                else:
                    missed += 1
                    penalties += 0.2
            elif gt_resolves:
                if not pred_contradiction:
                    total_score += 0.5
                else:
                    false_alarms += 1
                    penalties += 0.1
            else:
                if not pred_contradiction:
                    total_score += 0.3
                else:
                    false_alarms += 1
                    penalties += 0.1

        raw_score = (total_score / total_events) - penalties if total_events > 0 else 0.0
        final_score = max(0.0, min(1.0, raw_score))
        final_score = round(final_score, 4)

        actual_contradictions = sum(
            1 for e in self._drafting_sequence if e.get("introduces_contradiction")
        )
        resolutions = sum(
            1 for e in self._drafting_sequence if e.get("resolves_contradiction")
        )

        feedback = (
            f"Correctly detected: {correctly_detected}/{actual_contradictions} contradictions. "
            f"False alarms: {false_alarms}. Missed: {missed}. "
            f"Resolutions handled: {resolutions}. "
            f"Score: {final_score:.2f}"
        )

        return final_score, feedback, correctly_detected, false_alarms
