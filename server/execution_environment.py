import json
import random
import uuid
from pathlib import Path
from typing import Tuple

from models import (
    ExecutionObservation, ExecutionAction, ExecutionScenario,
    Clause, ContractExecutionState
)


class ContractExecutionEnv:
    def __init__(self):
        self._episode_id = ""
        self._task_id = "execution_easy"
        self._contract = None
        self._score = 0.001
        self._done = False
        self._crashes_detected = 0
        self._last_feedback = None
        self._contracts_dir = Path(__file__).parent.parent / "data" / "contracts"

    def reset(self, task_id: str = "execution_easy") -> ExecutionObservation:
        self._task_id = task_id
        self._done = False
        self._score = 0.001
        self._crashes_detected = 0
        self._episode_id = str(uuid.uuid4())
        self._last_feedback = None

        # Map execution task IDs to the base contract difficulty
        base_task = task_id.replace("execution_", "")
        pattern = f"{base_task}_*.json"
        matching_files = list(self._contracts_dir.glob(pattern))

        if not matching_files:
            raise FileNotFoundError(
                f"No contracts found for task_id: {task_id} (base: {base_task}) "
                f"at {self._contracts_dir}/{pattern}"
            )

        chosen_file = random.choice(matching_files)
        with open(chosen_file, "r", encoding="utf-8") as f:
            self._contract = json.load(f)

        return self._make_observation(done=False)

    def load_contract_by_id(self, contract_id: str) -> None:
        filepath = self._contracts_dir / f"{contract_id}.json"
        if not filepath.exists():
            raise FileNotFoundError(f"Contract file not found: {filepath}")
        with open(filepath, "r", encoding="utf-8") as f:
            self._contract = json.load(f)
        self._task_id = "execution_" + self._contract.get("task_id", "easy")
        self._episode_id = str(uuid.uuid4())
        self._done = False
        self._score = 0.001
        self._crashes_detected = 0
        self._last_feedback = None

    def step(self, action: ExecutionAction) -> ExecutionObservation:
        if self._done:
            return self._make_observation(
                done=True, score=self._score, feedback=self._last_feedback
            )

        score, feedback, detected = self._grade(action)
        self._score = score
        self._crashes_detected = detected
        self._done = True
        self._last_feedback = feedback

        return self._make_observation(done=True, score=self._score, feedback=feedback)

    @property
    def state(self) -> ContractExecutionState:
        scenarios = self._contract.get("execution_scenarios", []) if self._contract else []
        return ContractExecutionState(
            episode_id=self._episode_id,
            task_id=self._task_id,
            score=self._score,
            scenarios_total=len(scenarios),
            crashes_detected=self._crashes_detected,
            done=self._done,
        )

    def _make_observation(
        self, done: bool, score: float = None, feedback: str = None
    ) -> ExecutionObservation:
        clauses = [Clause(**c) for c in self._contract["clauses"]]
        scenarios_raw = self._contract.get("execution_scenarios", [])

        scenarios = []
        num_crashing = 0
        for s in scenarios_raw:
            if s.get("crashes", False):
                num_crashing += 1
            scenarios.append(ExecutionScenario(
                scenario_id=s["scenario_id"],
                title=s["title"],
                description=s["description"],
                actor=s["actor"],
                action_taken=s["action_taken"],
                triggered_clauses=s.get("triggers_clauses", []),
            ))

        return ExecutionObservation(
            contract_text=self._contract["contract_text"],
            clauses=clauses,
            scenarios=scenarios,
            task_id=self._task_id,
            num_crashing_scenarios=num_crashing,
            instructions=self._instructions(num_crashing, len(scenarios)),
            done=done,
            score=score,
            feedback=feedback,
            episode_id=self._episode_id,
            contract_id=self._contract.get("contract_id", ""),
        )

    def _instructions(self, num_crashing: int, total: int) -> str:
        return (
            f"You are a Contract Execution Specialist. Below is a contract and {total} "
            f"realistic business scenarios that employees might encounter.\n\n"
            f"Exactly {num_crashing} of these scenarios will trigger a contract crash — "
            f"a situation where two simultaneously activated clauses make contradictory demands.\n\n"
            f"For EACH scenario:\n"
            f"1. Identify which clauses are triggered by the described action\n"
            f"2. Determine if ANY two triggered clauses directly contradict each other\n"
            f"3. If they do → this is a CRASH. Identify the exact crash pair.\n"
            f"4. If they don't → this scenario resolves cleanly.\n\n"
            f"WARNING: Some scenarios touch sensitive clauses but resolve cleanly due to "
            f"override language, different contexts, or complementary scope. Do NOT flag these as crashes.\n\n"
            f"A crash ONLY occurs when two simultaneously triggered clauses make directly "
            f"incompatible demands on the same party for the same obligation."
        )

    def _grade(self, action: ExecutionAction) -> Tuple[float, str, int]:
        scenarios = {s["scenario_id"]: s for s in self._contract.get("execution_scenarios", [])}
        total = len(scenarios)
        if total == 0:
            return 1.0, "No scenarios to grade.", 0

        trace_map = {t.scenario_id: t for t in action.traces}
        total_score = 0.0
        crashes_detected = 0

        for sid, gt in scenarios.items():
            trace = trace_map.get(sid)
            if trace is None:
                continue  # Missing trace = 0 points

            gt_crashes = gt.get("crashes", False)
            gt_pair = gt.get("crash_pair")

            if gt_crashes:
                if trace.crashes:
                    # Check crash pair match (order independent)
                    if trace.crash_pair and gt_pair:
                        predicted = tuple(sorted([
                            trace.crash_pair.get("clause_a_id", ""),
                            trace.crash_pair.get("clause_b_id", "")
                        ]))
                        actual = tuple(sorted([
                            gt_pair.get("clause_a_id", ""),
                            gt_pair.get("clause_b_id", "")
                        ]))
                        if predicted == actual:
                            total_score += 1.0
                            crashes_detected += 1
                        else:
                            total_score += 0.2  # Partial credit
                    else:
                        total_score += 0.2
                else:
                    total_score -= 0.2
            else:
                if not trace.crashes:
                    total_score += 1.0
                else:
                    total_score -= 0.2

        score = max(0.0, min(1.0, total_score / total))
        score = round(score, 4)

        feedback = (
            f"Crashes correctly detected: {crashes_detected}/{sum(1 for s in scenarios.values() if s.get('crashes'))}. "
            f"Score: {score:.2f}"
        )
        return score, feedback, crashes_detected
