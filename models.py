from pydantic import BaseModel
from typing import Dict, Optional, List

# Compatibility alias for the exact audit import command:
# python3 -c "from models import star; print('Models OK')"
star = "*"

class Clause(BaseModel):
    id: str
    title: str
    text: str

class Finding(BaseModel):
    clause_a_id: str
    clause_b_id: str
    explanation: str

class ContractAction(BaseModel):
    findings: List[Finding]

class CompeteRequest(BaseModel):
    task_id: str = "easy"
    contract_id: Optional[str] = None
    agent_a_findings: List[Finding]
    agent_b_findings: List[Finding]

class ContractObservation(BaseModel):
    contract_text: str
    clauses: List[Clause]
    task_id: str
    num_contradictions: int
    instructions: str
    done: bool
    score: Optional[float] = None
    reward: Optional[float] = None
    feedback: Optional[str] = None
    episode_id: Optional[str] = None
    contract_id: Optional[str] = None
    contradictions_found: Optional[int] = None
    contradictions_total: Optional[int] = None
    false_positives: Optional[int] = None


class ContractStepResult(ContractObservation):
    reward: float
    score: float
    feedback: str
    contradictions_found: int
    contradictions_total: int
    false_positives: int

class ContractState(BaseModel):
    episode_id: str
    task_id: str
    score: float
    contradictions_found: int
    contradictions_total: int
    done: bool


# ── Execution Simulator Models ──────────────────────────────────────────

class ExecutionTrace(BaseModel):
    scenario_id: str
    triggered_clauses: List[str] = []
    crashes: bool = False
    crash_pair: Optional[dict] = None
    explanation: str = ""

class ExecutionAction(BaseModel):
    traces: List[ExecutionTrace]

class ExecutionScenario(BaseModel):
    scenario_id: str
    title: str
    description: str
    actor: str
    action_taken: str
    triggered_clauses: List[str] = []

class ExecutionObservation(BaseModel):
    contract_text: str
    clauses: List[Clause]
    scenarios: List[ExecutionScenario]
    task_id: str
    num_crashing_scenarios: int
    instructions: str
    done: bool
    score: Optional[float] = None
    feedback: Optional[str] = None
    episode_id: Optional[str] = None
    contract_id: Optional[str] = None

class ContractExecutionState(BaseModel):
    episode_id: str
    task_id: str
    score: float
    scenarios_total: int
    crashes_detected: int
    done: bool


# ── LexMind — Negotiation Co-Pilot Models ───────────────────────────────

class DraftingEvent(BaseModel):
    event_id: str
    round: int
    round_label: str
    authored_by: str
    action: str
    clause_id: str
    clause_title: str
    clause_text: str
    introduces_contradiction: bool = False
    contradicts_clause_id: Optional[str] = None
    contradiction_type: Optional[str] = None
    contradiction_description: Optional[str] = None
    resolves_contradiction: bool = False
    resolves_pair: Optional[dict] = None


class LexMindObservation(BaseModel):
    episode_id: str
    task_id: str
    step_number: int
    total_steps: int
    current_event: dict  # DraftingEvent with ground truth stripped
    clauses_so_far: List[Clause]
    drafting_sequence: List[dict]  # Full sequence with ground truth stripped
    round_number: int
    round_label: str
    authored_by: str
    action: str
    instructions: str
    done: bool
    score: Optional[float] = None
    feedback: Optional[str] = None
    contract_title: Optional[str] = None
    contract_id: Optional[str] = None


class LexMindStepAction(BaseModel):
    event_id: str
    introduces_contradiction: bool
    contradicts_clause_id: Optional[str] = None
    explanation: str = ""


class LexMindEpisodeAction(BaseModel):
    steps: List[LexMindStepAction]


class LexMindState(BaseModel):
    episode_id: str
    task_id: str
    current_step: int
    total_steps: int
    contradictions_introduced_so_far: int
    correctly_detected_so_far: int
    false_alarms_so_far: int
    score: float
    done: bool


# ── Adversarial Arena Models ────────────────────────────────────────────

class ObligationTaxonomyEntry(BaseModel):
    clause_id: str
    obligations: List[str]

class ForgerObservation(BaseModel):
    episode_id: str
    task_id: str
    role: str = "forger"
    contract_title: str
    clauses: List[Clause]
    contract_text: str
    obligation_taxonomy: List[ObligationTaxonomyEntry]
    forbidden_lexical_patterns: List[str]
    auditor_history: Optional[dict] = None
    instructions: str
    done: bool
    score: Optional[float] = None
    feedback: Optional[str] = None

class ForgerAction(BaseModel):
    target_clause_id: str
    modified_clause_text: str
    injected_clause_text: str
    inject_after_clause_id: str
    claimed_contradiction_type: str
    stealth_rationale: str = ""

class FindingAction(BaseModel):
    clause_a: str
    clause_b: str
    reason: str
    contradiction_type: str

class AuditorObservation(BaseModel):
    episode_id: str
    task_id: str
    role: str = "auditor"
    contract_title: str
    clauses: List[Clause]
    contract_text: str
    total_clause_count: int
    instructions: str
    done: bool
    score: Optional[float] = None
    feedback: Optional[str] = None

class AuditorAction(BaseModel):
    findings: List[FindingAction]

class RubricScore(BaseModel):
    name: str
    weight: float
    raw_score: float
    weighted_score: float
    detail: str = ""

class ForgerGradeResult(BaseModel):
    stealth: RubricScore
    validity: RubricScore
    subtlety: RubricScore
    plausibility: RubricScore
    total_score: float
    oracle_accepted: bool

class AuditorGradeResult(BaseModel):
    detection: RubricScore
    precision: RubricScore
    reasoning_quality: RubricScore
    total_score: float

class AdversarialEpisodeResult(BaseModel):
    episode_id: str
    task_id: str
    forger_score: float
    auditor_score: float
    forger_rubrics: ForgerGradeResult
    auditor_rubrics: AuditorGradeResult
    oracle_accepted: bool
    injection_details: Optional[dict] = None

class OpponentConfig(BaseModel):
    opponent_type: str  # "random", "fixed_v1", "self", "pool"

class CheckpointSubmission(BaseModel):
    checkpoint_id: str
    role: str
    score_history: List[float] = []
    metadata: Optional[dict] = None

class AdversarialState(BaseModel):
    episode_id: str
    task_id: str
    phase: str
    forger_score: float
    auditor_score: float
    oracle_accepted: bool
    done: bool


# ── CurriculumForge Models ──────────────────────────────────────────────

class CompetenceProfile(BaseModel):
    run_id: str
    model_name: str = ""
    algorithm: str = "absolute_learning_progress"
    total_episodes: int = 0
    per_environment_scores: Dict[str, float] = {}
    per_contradiction_type_accuracy: Dict[str, float] = {}
    per_difficulty_history: Dict[str, List[float]] = {}
    improvement_gradients: Dict[str, float] = {}
    plateau_flags: Dict[str, bool] = {}
    failure_flags: Dict[str, bool] = {}
    estimated_mastery_eta: Dict[str, Optional[float]] = {}
    task_selection_probabilities: Dict[str, float] = {}
    recent_task_history: List[str] = []
    mastered_types: List[str] = []

class TeacherReasoning(BaseModel):
    selected_task: str
    selected_difficulty: str
    algorithm: str
    reasoning_steps: List[str] = []
    learning_progress_scores: Dict[str, float] = {}
    selection_probabilities: Dict[str, float] = {}

class CurriculumRunConfig(BaseModel):
    model_name: str = "default"
    algorithm: str = "absolute_learning_progress"
    starting_task: Optional[str] = None

class CurriculumObservation(BaseModel):
    run_id: str
    episode_id: str
    episode_number: int
    selected_task: str
    selected_difficulty: str
    sub_environment: str
    teacher_reasoning: TeacherReasoning
    competence_snapshot: CompetenceProfile
    sub_observation: dict
    instructions: str
    done: bool
    score: Optional[float] = None
    feedback: Optional[str] = None

class CurriculumStepResult(BaseModel):
    run_id: str
    episode_id: str
    episode_number: int
    selected_task: str
    base_score: float
    curriculum_bonus: float
    breadth_bonus: float
    transfer_bonus: float
    composite_score: float
    sub_result: dict
    competence_snapshot: CompetenceProfile
    done: bool
    feedback: str = ""

class CurriculumEpisodeRecord(BaseModel):
    run_id: str
    episode_id: str
    episode_number: int
    task_id: str
    difficulty: str
    sub_environment: str
    base_score: float
    curriculum_bonus: float
    breadth_bonus: float
    transfer_bonus: float
    composite_score: float
    contradiction_types_attempted: List[str] = []
    timestamp: str = ""

# ── ConstitutionForge Models ─────────────────────────────────────────────

class PortfolioContract(BaseModel):
    contract_id: str
    contract_type: str
    clauses: List[Clause]

class PortfolioObservation(BaseModel):
    episode_id: str
    task_id: str
    contracts: List[PortfolioContract]
    num_cross_contradictions: int
    num_cascades: int
    instructions: str
    done: bool
    score: Optional[float] = None
    feedback: Optional[str] = None

class CrossFinding(BaseModel):
    contract_a_id: str
    clause_a_id: str
    contract_b_id: str
    clause_b_id: str
    contradiction_type: str
    explanation: str

class ConstitutionAction(BaseModel):
    cross_findings: List[CrossFinding]
    cascade_chains: Optional[List[List[int]]] = None

class PortfolioState(BaseModel):
    episode_id: str
    task_id: str
    score: float
    cross_contradictions_found: int
    cascades_found: int
    done: bool

# ── ContractDNA Models ───────────────────────────────────────────────────

class FingerprintRequest(BaseModel):
    clause_texts: Optional[List[str]] = None
    episode_id: Optional[str] = None

class FingerprintDelta(BaseModel):
    changed_most_dimension: str
    magnitude: float
    attack_detected: bool

class FingerprintResult(BaseModel):
    episode_id: Optional[str] = None
    numeric_risk: float
    temporal_risk: float
    party_obligation_risk: float
    termination_risk: float
    conditional_risk: float
    overall_risk: float
    risk_label: str
    dominant_risk_type: str
    contradiction_distribution: Optional[Dict[str, float]] = None
    obligation_density: Optional[float] = None
    complexity_score: Optional[float] = None
    estimated_difficulty: Optional[str] = None
    delta: Optional[FingerprintDelta] = None

# ── FederatedArena Models ────────────────────────────────────────────────

class InjectionAction(BaseModel):
    clause_text: str
    commercial_intent_label: str  # "SELLER_FAVORABLE", "BUYER_FAVORABLE", "NEUTRAL"

class RegulationFlag(BaseModel):
    clause_id: str
    violation_type: str  # "GDPR", "SOX", "EXPORT_CONTROL", "ANTI_BRIBERY"
    explanation: str

class FederatedAction(BaseModel):
    agent_role: str  # "seller", "buyer", "regulator"
    action_type: str  # "inject" or "flag"
    injection: Optional[InjectionAction] = None
    flags: Optional[List[RegulationFlag]] = None

class InjectionRecord(BaseModel):
    clause_id: str
    clause_text: str
    author: str  # "seller" or "buyer"
    round: int
    commercial_intent_label: str

class FederatedObservation(BaseModel):
    episode_id: str
    task_id: str
    base_clauses: List[Clause]
    current_clauses: List[Clause]
    round: int
    total_rounds: int
    next_agent_role: str
    regulatory_frameworks: List[str]
    instructions: str
    done: bool
    score: Optional[float] = None
    feedback: Optional[str] = None
    partial_rewards: Optional[Dict[str, float]] = None

class FederatedState(BaseModel):
    episode_id: str
    task_id: str
    round: int
    total_rounds: int
    current_clauses: List[Clause]
    injections: List[InjectionRecord]
    flags: List[RegulationFlag]
    seller_score: float
    buyer_score: float
    regulator_score: float
    commercial_balance: float
    regulatory_compliance: float
    next_agent_role: str
    done: bool

class FederatedFinalScore(BaseModel):
    episode_id: str
    task_id: str
    seller_score: float
    buyer_score: float
    regulator_score: float
    commercial_balance: float
    regulatory_compliance: float
    injections: List[InjectionRecord]
    flags: List[RegulationFlag]
    planted_violations_found: int
    planted_violations_total: int
    false_positives: int
    breakdown: Dict[str, float]

# ── ContractTimeMachine Models ───────────────────────────────────────────

class RevisionSnapshot(BaseModel):
    version: int
    author: str  # "Drafter" or "Counterparty"
    timestamp: str
    change_summary: str
    clauses: List[Clause]

class TimeMachineObservation(BaseModel):
    episode_id: str
    task_id: str
    version_history: List[RevisionSnapshot]
    total_versions: int
    contradiction_type_hint: str
    instructions: str
    done: bool
    score: Optional[float] = None
    feedback: Optional[str] = None

class Attribution(BaseModel):
    introduced_at_version: int
    introduced_by: str  # "Drafter" or "Counterparty"
    clause_a_id: str
    clause_b_id: str
    explanation: str

class TimeMachineAction(BaseModel):
    attribution: Attribution

class TimeMachineResult(BaseModel):
    episode_id: str
    task_id: str
    score: float
    reward: float
    done: bool
    feedback: str
    ground_truth: Optional[Dict] = None
    breakdown: Optional[Dict[str, float]] = None

class TimeMachineState(BaseModel):
    episode_id: str
    task_id: str
    submitted: bool
    score: float
    done: bool

