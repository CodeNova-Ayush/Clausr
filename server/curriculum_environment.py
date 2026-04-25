"""CurriculumForge — Adaptive curriculum meta-environment.

Wraps all four Clausr sub-environments behind a unified interface and uses a
deterministic Teacher to sequence episodes based on the agent's live
CompetenceProfile.
"""

import json
import random
import uuid
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from models import (
    CompetenceProfile,
    ContractAction,
    CurriculumEpisodeRecord,
    CurriculumObservation,
    CurriculumStepResult,
    ExecutionAction,
    LexMindEpisodeAction,
    ForgerAction,
    TeacherReasoning,
)
from server.environment import ContractFixEnv
from server.execution_environment import ContractExecutionEnv
from server.lexmind_environment import LexMindEnv
from server.adversarial_environment import AdversarialArenaEnv

ALL_TASKS = [
    "easy", "medium", "hard",
    "execution_easy", "execution_medium", "execution_hard",
    "lexmind_easy", "lexmind_medium",
    "adversarial_easy", "adversarial_medium", "adversarial_hard",
    "adversarial_selfplay",
]

CONTRADICTION_TYPES = ["numeric", "temporal", "conditional", "party_obligation", "termination"]

DIFFICULTY_MAP = {
    "easy": "easy", "medium": "medium", "hard": "hard",
    "execution_easy": "easy", "execution_medium": "medium", "execution_hard": "hard",
    "lexmind_easy": "easy", "lexmind_medium": "medium",
    "adversarial_easy": "easy", "adversarial_medium": "medium",
    "adversarial_hard": "hard", "adversarial_selfplay": "hard",
}

ENV_FAMILY = {
    "easy": "detection", "medium": "detection", "hard": "detection",
    "execution_easy": "execution", "execution_medium": "execution",
    "execution_hard": "execution",
    "lexmind_easy": "lexmind", "lexmind_medium": "lexmind",
    "adversarial_easy": "adversarial", "adversarial_medium": "adversarial",
    "adversarial_hard": "adversarial", "adversarial_selfplay": "adversarial",
}

ROLLING_WINDOW = 20
GRADIENT_WINDOW = 10
PLATEAU_THRESHOLD = 0.02
FAILURE_THRESHOLD = 0.15
FAILURE_WINDOW = 5
TARGET_SCORE = 0.85

CURRICULUM_BONUS_AMOUNT = 0.05
BREADTH_BONUS_AMOUNT = 0.03
TRANSFER_BONUS_AMOUNT = 0.10
BREADTH_LOOKBACK = 10
TRANSFER_FIRST_ATTEMPT_THRESHOLD = 0.6


class CompetenceTracker:
    """Maintains per-run performance profiles with rolling statistics."""

    def __init__(self, run_id: str, model_name: str = "", algorithm: str = "absolute_learning_progress"):
        self.run_id = run_id
        self.model_name = model_name
        self.algorithm = algorithm
        self.total_episodes = 0

        self._score_history: Dict[str, List[float]] = defaultdict(list)
        self._type_results: Dict[str, List[bool]] = defaultdict(list)
        self._recent_tasks: List[str] = []
        self._mastered_types: List[str] = []
        self._type_first_attempt: Dict[str, Optional[float]] = {}

    def record_episode(self, task_id: str, score: float, contradiction_types: List[str] = None):
        self.total_episodes += 1
        self._score_history[task_id].append(score)
        self._recent_tasks.append(task_id)
        if len(self._recent_tasks) > 100:
            self._recent_tasks = self._recent_tasks[-100:]

        if contradiction_types:
            for ct in contradiction_types:
                success = score > 0.5
                self._type_results[ct].append(success)

                if ct not in self._type_first_attempt:
                    self._type_first_attempt[ct] = score

                results = self._type_results[ct]
                if len(results) >= 5 and sum(results[-5:]) / 5 >= 0.8:
                    if ct not in self._mastered_types:
                        self._mastered_types.append(ct)

    def get_profile(self) -> CompetenceProfile:
        per_env = {}
        for task_id, scores in self._score_history.items():
            window = scores[-ROLLING_WINDOW:]
            per_env[task_id] = sum(window) / len(window) if window else 0.0

        per_type = {}
        for ct, results in self._type_results.items():
            window = results[-50:]
            per_type[ct] = sum(window) / len(window) if window else 0.0

        per_diff: Dict[str, List[float]] = defaultdict(list)
        for task_id, scores in self._score_history.items():
            diff = DIFFICULTY_MAP.get(task_id, "easy")
            per_diff[diff].extend(scores[-ROLLING_WINDOW:])

        gradients = {}
        for task_id, scores in self._score_history.items():
            gradients[task_id] = self._compute_gradient(scores)

        plateaus = {}
        for task_id, scores in self._score_history.items():
            recent = scores[-GRADIENT_WINDOW:]
            if len(recent) >= 2:
                improvement = abs(recent[-1] - recent[0])
                plateaus[task_id] = improvement < PLATEAU_THRESHOLD and (sum(recent) / len(recent)) > 0.7
            else:
                plateaus[task_id] = False

        failures = {}
        for task_id, scores in self._score_history.items():
            recent = scores[-FAILURE_WINDOW:]
            if len(recent) >= FAILURE_WINDOW:
                failures[task_id] = (sum(recent) / len(recent)) < FAILURE_THRESHOLD
            else:
                failures[task_id] = False

        etas = {}
        for task_id, scores in self._score_history.items():
            grad = gradients.get(task_id, 0.0)
            current = per_env.get(task_id, 0.0)
            if grad > 0.001 and current < TARGET_SCORE:
                etas[task_id] = (TARGET_SCORE - current) / grad
            else:
                etas[task_id] = None

        probs = self._compute_selection_probabilities(gradients, plateaus, failures, per_env)

        return CompetenceProfile(
            run_id=self.run_id,
            model_name=self.model_name,
            algorithm=self.algorithm,
            total_episodes=self.total_episodes,
            per_environment_scores=per_env,
            per_contradiction_type_accuracy=per_type,
            per_difficulty_history={k: list(v) for k, v in per_diff.items()},
            improvement_gradients=gradients,
            plateau_flags=plateaus,
            failure_flags=failures,
            estimated_mastery_eta=etas,
            task_selection_probabilities=probs,
            recent_task_history=self._recent_tasks[-BREADTH_LOOKBACK:],
            mastered_types=list(self._mastered_types),
        )

    def get_transfer_bonus_info(self, task_id: str, score: float) -> Tuple[bool, str, str, float]:
        """Check if this episode qualifies for a transfer bonus."""
        difficulty = DIFFICULTY_MAP.get(task_id, "easy")
        family = ENV_FAMILY.get(task_id, "detection")

        for ct in CONTRADICTION_TYPES:
            if ct in self._mastered_types:
                other_types = [t for t in CONTRADICTION_TYPES if t != ct and t not in self._mastered_types]
                for ot in other_types:
                    if self._type_first_attempt.get(ot) is None:
                        continue
                    attempts = self._type_results.get(ot, [])
                    if len(attempts) <= 2 and score >= TRANSFER_FIRST_ATTEMPT_THRESHOLD:
                        return True, ct, ot, score

        return False, "", "", 0.0

    def _compute_gradient(self, scores: List[float]) -> float:
        window = scores[-GRADIENT_WINDOW:]
        if len(window) < 2:
            return 0.0
        n = len(window)
        x_mean = (n - 1) / 2.0
        y_mean = sum(window) / n
        num = sum((i - x_mean) * (window[i] - y_mean) for i in range(n))
        den = sum((i - x_mean) ** 2 for i in range(n))
        if den == 0:
            return 0.0
        return num / den

    def _compute_selection_probabilities(
        self,
        gradients: Dict[str, float],
        plateaus: Dict[str, bool],
        failures: Dict[str, bool],
        per_env: Dict[str, float],
    ) -> Dict[str, float]:
        if self.algorithm == "absolute_learning_progress":
            return self._alp_probabilities(gradients, plateaus, failures)
        elif self.algorithm == "threshold_gating":
            return self._threshold_gating_probabilities(per_env, plateaus)
        elif self.algorithm == "paired":
            return self._paired_probabilities(gradients, per_env)
        return self._alp_probabilities(gradients, plateaus, failures)

    def _alp_probabilities(
        self,
        gradients: Dict[str, float],
        plateaus: Dict[str, bool],
        failures: Dict[str, bool],
    ) -> Dict[str, float]:
        raw = {}
        for task_id in ALL_TASKS:
            grad = abs(gradients.get(task_id, 0.0))
            if plateaus.get(task_id, False):
                grad *= 0.1
            if failures.get(task_id, False):
                grad *= 0.1
            if task_id not in gradients:
                grad = 0.5
            raw[task_id] = max(grad, 0.01)

        total = sum(raw.values())
        return {k: v / total for k, v in raw.items()}

    def _threshold_gating_probabilities(
        self,
        per_env: Dict[str, float],
        plateaus: Dict[str, bool],
    ) -> Dict[str, float]:
        unlocked = {}
        thresholds = {"easy": 0.0, "medium": 0.5, "hard": 0.7}

        for task_id in ALL_TASKS:
            diff = DIFFICULTY_MAP.get(task_id, "easy")
            threshold = thresholds.get(diff, 0.0)

            if diff == "easy":
                unlocked[task_id] = 1.0
            else:
                family = ENV_FAMILY.get(task_id, "detection")
                prev_diff = "easy" if diff == "medium" else "medium"
                prev_tasks = [
                    t for t in ALL_TASKS
                    if DIFFICULTY_MAP.get(t) == prev_diff and ENV_FAMILY.get(t) == family
                ]
                if prev_tasks:
                    prev_scores = [per_env.get(t, 0.0) for t in prev_tasks]
                    best = max(prev_scores) if prev_scores else 0.0
                    unlocked[task_id] = 1.0 if best >= threshold else 0.0
                else:
                    unlocked[task_id] = 1.0

            if plateaus.get(task_id, False):
                unlocked[task_id] *= 0.2

        total = sum(unlocked.values())
        if total == 0:
            return {k: 1.0 / len(ALL_TASKS) for k in ALL_TASKS}
        return {k: v / total for k, v in unlocked.items()}

    def _paired_probabilities(
        self,
        gradients: Dict[str, float],
        per_env: Dict[str, float],
    ) -> Dict[str, float]:
        raw = {}
        for task_id in ALL_TASKS:
            score = per_env.get(task_id, 0.0)
            frontier_distance = abs(score - 0.5)
            raw[task_id] = max(0.01, 1.0 - frontier_distance)

            if "adversarial" in task_id:
                raw[task_id] *= 1.5

        total = sum(raw.values())
        return {k: v / total for k, v in raw.items()}


class CurriculumForgeEnv:
    """Meta-environment that wraps all Clausr sub-environments with adaptive
    curriculum scheduling."""

    def __init__(self):
        self._trackers: Dict[str, CompetenceTracker] = {}
        self._episode_logs: Dict[str, List[dict]] = defaultdict(list)

        self._active_run_id: Optional[str] = None
        self._active_env = None
        self._active_env_type: Optional[str] = None
        self._active_task_id: Optional[str] = None
        self._active_episode_id: Optional[str] = None
        self._active_episode_number: int = 0
        self._active_sub_obs: Optional[dict] = None
        self._mode: str = "standard"

    def register_run(self, model_name: str = "default", algorithm: str = "absolute_learning_progress", starting_task: Optional[str] = None) -> dict:
        run_id = str(uuid.uuid4())[:12]
        self._trackers[run_id] = CompetenceTracker(
            run_id=run_id, model_name=model_name, algorithm=algorithm,
        )
        self._episode_logs[run_id] = []
        return {
            "run_id": run_id,
            "model_name": model_name,
            "algorithm": algorithm,
            "starting_task": starting_task,
            "available_tasks": ALL_TASKS,
        }

    def reset(self, run_id: str, mode: str = "standard", force_task: Optional[str] = None) -> CurriculumObservation:
        if run_id not in self._trackers:
            self._trackers[run_id] = CompetenceTracker(run_id=run_id)

        self._active_run_id = run_id
        self._mode = mode
        tracker = self._trackers[run_id]
        profile = tracker.get_profile()

        if force_task:
            selected_task = force_task
        else:
            selected_task = self._teacher_select(profile, mode)

        self._active_task_id = selected_task
        self._active_episode_id = str(uuid.uuid4())
        self._active_episode_number = tracker.total_episodes + 1

        difficulty = DIFFICULTY_MAP.get(selected_task, "easy")
        family = ENV_FAMILY.get(selected_task, "detection")

        sub_obs = self._reset_sub_environment(selected_task)
        self._active_sub_obs = sub_obs

        reasoning = self._build_teacher_reasoning(profile, selected_task, difficulty, mode)

        return CurriculumObservation(
            run_id=run_id,
            episode_id=self._active_episode_id,
            episode_number=self._active_episode_number,
            selected_task=selected_task,
            selected_difficulty=difficulty,
            sub_environment=family,
            teacher_reasoning=reasoning,
            competence_snapshot=profile,
            sub_observation=sub_obs,
            instructions=self._build_instructions(selected_task, family, profile),
            done=False,
        )

    def step(self, run_id: str, action_data: dict) -> CurriculumStepResult:
        if run_id not in self._trackers:
            raise ValueError(f"Unknown run_id: {run_id}")

        tracker = self._trackers[run_id]
        task_id = self._active_task_id
        family = ENV_FAMILY.get(task_id, "detection")

        base_score, sub_result = self._step_sub_environment(task_id, action_data)

        profile_before = tracker.get_profile()
        rolling_mean = profile_before.per_environment_scores.get(task_id, 0.0)
        curriculum_bonus = CURRICULUM_BONUS_AMOUNT if base_score > rolling_mean else 0.0

        recent = profile_before.recent_task_history[-BREADTH_LOOKBACK:]
        breadth_bonus = BREADTH_BONUS_AMOUNT if task_id not in recent else 0.0

        transfer_hit, mastered_type, attempted_type, _ = tracker.get_transfer_bonus_info(task_id, base_score)
        transfer_bonus = TRANSFER_BONUS_AMOUNT if transfer_hit else 0.0

        contradiction_types = self._extract_contradiction_types(task_id, action_data)
        tracker.record_episode(task_id, base_score, contradiction_types)

        composite = min(0.999, max(0.001, base_score + curriculum_bonus + breadth_bonus + transfer_bonus))
        composite = round(composite, 4)

        profile_after = tracker.get_profile()

        record = {
            "run_id": run_id,
            "episode_id": self._active_episode_id,
            "episode_number": self._active_episode_number,
            "task_id": task_id,
            "difficulty": DIFFICULTY_MAP.get(task_id, "easy"),
            "sub_environment": family,
            "base_score": round(base_score, 4),
            "curriculum_bonus": curriculum_bonus,
            "breadth_bonus": breadth_bonus,
            "transfer_bonus": transfer_bonus,
            "composite_score": composite,
            "contradiction_types_attempted": contradiction_types,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        self._episode_logs[run_id].append(record)

        feedback_parts = [f"Base: {base_score:.3f}"]
        if curriculum_bonus > 0:
            feedback_parts.append(f"+{curriculum_bonus:.2f} improvement bonus")
        if breadth_bonus > 0:
            feedback_parts.append(f"+{breadth_bonus:.2f} breadth bonus")
        if transfer_bonus > 0:
            feedback_parts.append(f"+{transfer_bonus:.2f} transfer bonus ({mastered_type}→{attempted_type})")
        feedback_parts.append(f"= {composite:.3f} composite")

        return CurriculumStepResult(
            run_id=run_id,
            episode_id=self._active_episode_id,
            episode_number=self._active_episode_number,
            selected_task=task_id,
            base_score=round(base_score, 4),
            curriculum_bonus=curriculum_bonus,
            breadth_bonus=breadth_bonus,
            transfer_bonus=transfer_bonus,
            composite_score=composite,
            sub_result=sub_result,
            competence_snapshot=profile_after,
            done=True,
            feedback=" | ".join(feedback_parts),
        )

    def get_profile(self, run_id: str) -> CompetenceProfile:
        if run_id not in self._trackers:
            raise ValueError(f"Unknown run_id: {run_id}")
        return self._trackers[run_id].get_profile()

    def export_episodes(self, run_id: str) -> List[dict]:
        return self._episode_logs.get(run_id, [])

    def _teacher_select(self, profile: CompetenceProfile, mode: str) -> str:
        probs = profile.task_selection_probabilities
        if not probs:
            return random.choice(ALL_TASKS)

        if mode == "paired":
            adversarial_tasks = [t for t in ALL_TASKS if "adversarial" in t]
            if adversarial_tasks and random.random() < 0.4:
                return random.choice(adversarial_tasks)

        tasks = list(probs.keys())
        weights = [probs[t] for t in tasks]
        return random.choices(tasks, weights=weights, k=1)[0]

    def _build_teacher_reasoning(self, profile: CompetenceProfile, task: str, difficulty: str, mode: str) -> TeacherReasoning:
        steps = []
        gradients = profile.improvement_gradients
        plateaus = profile.plateau_flags
        failures = profile.failure_flags

        if profile.total_episodes == 0:
            steps.append("First episode — selecting based on default curriculum ordering.")
        else:
            steps.append(f"Episode {profile.total_episodes + 1}. Evaluating learning progress across {len(gradients)} tracked tasks.")

            if task in gradients:
                grad = gradients[task]
                steps.append(f"Task '{task}' gradient: {grad:.4f}")
            if plateaus.get(task, False):
                steps.append(f"Task '{task}' is plateaued — down-weighted in selection.")
            if failures.get(task, False):
                steps.append(f"Task '{task}' is in failure zone — down-weighted in selection.")

            prob = profile.task_selection_probabilities.get(task, 0.0)
            steps.append(f"Selection probability for '{task}': {prob:.3f}")

        if mode == "paired":
            steps.append("PAIRED mode: adversarial tasks boosted for frontier-seeking curriculum.")

        return TeacherReasoning(
            selected_task=task,
            selected_difficulty=difficulty,
            algorithm=profile.algorithm,
            reasoning_steps=steps,
            learning_progress_scores=gradients,
            selection_probabilities=profile.task_selection_probabilities,
        )

    def _build_instructions(self, task_id: str, family: str, profile: CompetenceProfile) -> str:
        rolling = profile.per_environment_scores.get(task_id, 0.0)
        ep = profile.total_episodes

        header = (
            f"CurriculumForge Episode {ep + 1}\n"
            f"Selected task: {task_id} (family: {family})\n"
            f"Your rolling average on this task: {rolling:.3f}\n"
            f"Scoring: base score + improvement bonus (+0.05 if you beat your rolling mean) "
            f"+ breadth bonus (+0.03 for task diversity) + transfer bonus (+0.10 for zero-shot transfer)\n\n"
        )
        return header + "Complete the sub-environment task below."

    def _reset_sub_environment(self, task_id: str) -> dict:
        family = ENV_FAMILY.get(task_id, "detection")

        if family == "detection":
            env = ContractFixEnv()
            obs = env.reset(task_id=task_id)
            self._active_env = env
            self._active_env_type = "detection"
            return json.loads(obs.model_dump_json())

        elif family == "execution":
            env = ContractExecutionEnv()
            obs = env.reset(task_id=task_id)
            self._active_env = env
            self._active_env_type = "execution"
            return json.loads(obs.model_dump_json())

        elif family == "lexmind":
            env = LexMindEnv()
            obs = env.reset(task_id=task_id)
            self._active_env = env
            self._active_env_type = "lexmind"
            return json.loads(obs.model_dump_json())

        elif family == "adversarial":
            env = AdversarialArenaEnv()
            obs = env.reset(task_id=task_id)
            self._active_env = env
            self._active_env_type = "adversarial"
            return json.loads(obs.model_dump_json())

        raise ValueError(f"Unknown environment family: {family}")

    def _step_sub_environment(self, task_id: str, action_data: dict) -> Tuple[float, dict]:
        env = self._active_env
        env_type = self._active_env_type

        try:
            if env_type == "detection":
                action = ContractAction(**action_data)
                obs = env.step(action)
                result = json.loads(obs.model_dump_json())
                score = float(result.get("score", 0.001) or 0.001)
                return max(0.001, min(0.999, score)), result

            elif env_type == "execution":
                action = ExecutionAction(**action_data)
                obs = env.step(action)
                result = json.loads(obs.model_dump_json())
                score = float(result.get("score", 0.001) or 0.001)
                return max(0.001, min(0.999, score)), result

            elif env_type == "lexmind":
                action = LexMindEpisodeAction(**action_data)
                obs = env.step(action)
                result = json.loads(obs.model_dump_json())
                score = float(result.get("score", 0.001) or 0.001)
                return max(0.001, min(0.999, score)), result

            elif env_type == "adversarial":
                action = ForgerAction(**action_data)
                result = env.forger_step(action)
                score = float(result.get("forger_score", 0.001))
                return max(0.001, min(0.999, score)), result

        except Exception as e:
            return 0.001, {"error": str(e), "env_type": env_type, "score": 0.001}

        raise ValueError(f"Unknown env type: {env_type}")

    def _extract_contradiction_types(self, task_id: str, action_data: dict) -> List[str]:
        types = []
        family = ENV_FAMILY.get(task_id, "detection")

        if family == "adversarial":
            ct = action_data.get("claimed_contradiction_type", "")
            if ct:
                types.append(ct)
        elif family == "detection":
            for f in action_data.get("findings", []):
                exp = f.get("explanation", "").lower()
                for ct in CONTRADICTION_TYPES:
                    if ct.replace("_", " ") in exp or ct in exp:
                        types.append(ct)

        return types if types else ["unspecified"]
