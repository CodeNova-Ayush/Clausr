from pydantic import BaseModel
from typing import Optional, List

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
