from pydantic import BaseModel
from typing import Dict, Optional, List

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

class ContractObservation(BaseModel):
    contract_text: str
    clauses: List[Clause]
    task_id: str
    num_contradictions: int
    instructions: str
    done: bool
    score: Optional[float] = None
    feedback: Optional[str] = None
    episode_id: Optional[str] = None
    contract_id: Optional[str] = None

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
