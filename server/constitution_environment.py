import json
import random
import uuid
from pathlib import Path
from typing import Tuple, Optional, Set

from models import (
    PortfolioObservation,
    ConstitutionAction,
    PortfolioContract,
    PortfolioState,
    Clause,
)

class ConstitutionForgeEnv:
    def __init__(self):
        self._episode_id = ""
        self._task_id = "constitution_easy"
        self._portfolio = None
        self._score = 0.001
        self._done = False
        self._cross_contradictions_found = 0
        self._cascades_found = 0
        self._last_feedback = None
        self._contracts_dir = Path(__file__).parent.parent / "data" / "contracts"

    def reset(self, task_id: str = "constitution_easy") -> PortfolioObservation:
        self._task_id = task_id
        self._done = False
        self._score = 0.001
        self._cross_contradictions_found = 0
        self._cascades_found = 0
        self._episode_id = str(uuid.uuid4())
        self._last_feedback = None

        pattern = f"{task_id}_*.json"
        matching_files = list(self._contracts_dir.glob(pattern))

        if not matching_files:
            raise FileNotFoundError(
                f"No portfolios found for task_id: {task_id} at {self._contracts_dir}/{pattern}"
            )

        chosen_file = random.choice(matching_files)
        with open(chosen_file, "r", encoding="utf-8") as f:
            self._portfolio = json.load(f)

        return self._make_observation(done=False)

    def load_portfolio_by_id(self, portfolio_id: str) -> None:
        filepath = self._contracts_dir / f"{portfolio_id}.json"
        if not filepath.exists():
            raise FileNotFoundError(f"Portfolio file not found: {filepath}")
        with open(filepath, "r", encoding="utf-8") as f:
            self._portfolio = json.load(f)
        self._task_id = self._portfolio.get("task_id", "constitution_easy")
        self._episode_id = str(uuid.uuid4())
        self._done = False
        self._score = 0.001
        self._cross_contradictions_found = 0
        self._cascades_found = 0
        self._last_feedback = None

    def step(self, action: ConstitutionAction) -> PortfolioObservation:
        if self._done:
            return self._make_observation(
                done=True, score=self._score, feedback=self._last_feedback
            )

        score, feedback, found, cascades = self._grade(action)
        self._score = score
        self._cross_contradictions_found = found
        self._cascades_found = cascades
        self._done = True
        self._last_feedback = feedback

        return self._make_observation(done=True, score=self._score, feedback=feedback)

    @property
    def state(self) -> PortfolioState:
        return PortfolioState(
            episode_id=self._episode_id,
            task_id=self._task_id,
            score=self._score,
            cross_contradictions_found=self._cross_contradictions_found,
            cascades_found=self._cascades_found,
            done=self._done,
        )

    def _make_observation(
        self, done: bool, score: float = None, feedback: str = None
    ) -> PortfolioObservation:
        contracts = []
        for c in self._portfolio["contracts"]:
            clauses = [Clause(**cl) for cl in c["clauses"]]
            contracts.append(
                PortfolioContract(
                    contract_id=c["contract_id"],
                    contract_type=c["contract_type"],
                    clauses=clauses,
                )
            )

        num_cross = len(self._portfolio.get("cross_contradictions", []))
        num_cascades = len(self._portfolio.get("cascade_chains", []))

        return PortfolioObservation(
            episode_id=self._episode_id,
            task_id=self._task_id,
            contracts=contracts,
            num_cross_contradictions=num_cross,
            num_cascades=num_cascades,
            instructions=self._instructions(),
            done=done,
            score=score,
            feedback=feedback,
        )

    def _instructions(self) -> str:
        num_cross = len(self._portfolio.get("cross_contradictions", []))
        num_cascades = len(self._portfolio.get("cascade_chains", []))
        return (
            f"Analyze this portfolio of contracts. There are {num_cross} cross-contract contradictions "
            f"and {num_cascades} cascade chains hidden across the documents.\n"
            "Your task is to find pairs of clauses from DIFFERENT contracts that directly contradict each other.\n"
            "If fixing one contradiction creates another, you must identify this as a cascade chain."
        )

    def _canonical_pair(self, c_a: str, cl_a: str, c_b: str, cl_b: str) -> Tuple[str, str, str, str]:
        # Sort by contract ID, then clause ID to ensure determinism
        if (c_a, cl_a) > (c_b, cl_b):
            return (c_b, cl_b, c_a, cl_a)
        return (c_a, cl_a, c_b, cl_b)

    def _grade(self, action: ConstitutionAction) -> Tuple[float, str, int, int]:
        true_pairs = set()
        for c in self._portfolio.get("cross_contradictions", []):
            pair = self._canonical_pair(c["contract_a_id"], c["clause_a_id"], c["contract_b_id"], c["clause_b_id"])
            true_pairs.add(pair)

        # Build ground truth cascades as sets of canonical pairs
        true_cascades = []
        for chain in self._portfolio.get("cascade_chains", []):
            chain_pairs = set()
            for c_id in chain:
                # Find the contradiction by ID
                for c in self._portfolio.get("cross_contradictions", []):
                    if c.get("id") == c_id:
                        chain_pairs.add(self._canonical_pair(c["contract_a_id"], c["clause_a_id"], c["contract_b_id"], c["clause_b_id"]))
            if chain_pairs:
                true_cascades.append(chain_pairs)

        found_pairs = set()
        agent_pair_map = {}  # mapping from finding index to canonical pair
        for idx, f in enumerate(action.cross_findings):
            pair = self._canonical_pair(f.contract_a_id, f.clause_a_id, f.contract_b_id, f.clause_b_id)
            found_pairs.add(pair)
            agent_pair_map[idx] = pair

        true_positives = len(found_pairs & true_pairs)
        false_positives = len(found_pairs - true_pairs)

        # Score cascades
        cascades_found = 0
        if action.cascade_chains:
            for agent_chain in action.cascade_chains:
                # Convert agent chain indices to canonical pairs
                agent_chain_pairs = set()
                for idx in agent_chain:
                    if idx in agent_pair_map:
                        agent_chain_pairs.add(agent_pair_map[idx])
                
                # Check if this matches any true cascade exactly
                for tc in true_cascades:
                    if agent_chain_pairs == tc:
                        cascades_found += 1
                        break

        if not true_pairs:
            base_score = 1.0
        else:
            base_score = true_positives / len(true_pairs)

        penalty = 0.20 * false_positives
        bonus = 0.15 * cascades_found

        score = base_score + bonus - penalty
        score = max(0.001, min(1.0, score))

        feedback = (
            f"Cross-contradictions found: {true_positives}/{len(true_pairs)}. "
            f"Cascades found: {cascades_found}/{len(true_cascades)}. "
            f"False positives: {false_positives}. Final score: {score:.3f}"
        )

        return score, feedback, true_positives, cascades_found
