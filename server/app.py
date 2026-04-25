from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import json

from server.environment import ContractFixEnv
from server.execution_environment import ContractExecutionEnv
from server.lexmind_environment import LexMindEnv
from server.adversarial_environment import AdversarialArenaEnv
from server.curriculum_environment import CurriculumForgeEnv
from server.constitution_environment import ConstitutionForgeEnv
from server.fingerprint_engine import dna_engine
from models import (
    ContractAction, ContractObservation, ContractState,
    ExecutionAction, ExecutionObservation, ContractExecutionState,
    LexMindEpisodeAction, LexMindObservation, LexMindState,
    ForgerAction, ForgerObservation, AuditorAction, AuditorObservation,
    AdversarialState, OpponentConfig, CheckpointSubmission,
    CurriculumRunConfig, CurriculumObservation, CurriculumStepResult,
    CompetenceProfile,
    PortfolioObservation, ConstitutionAction, PortfolioState,
    FingerprintRequest, FingerprintResult,
)

app = FastAPI(
    title="Clausr OpenEnv",
    description="Clausr trains AI agents to detect hidden contradictions in legal contracts.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/reset", response_model=ContractObservation)
def reset(task_id: str = "easy"):
    env = ContractFixEnv()
    return env.reset(task_id=task_id)


@app.post("/step", response_model=ContractObservation)
def step(action: ContractAction, task_id: str = "easy", contract_id: str = None):
    """
    Stateless step endpoint.
    If contract_id is provided, loads that exact contract for grading.
    Otherwise falls back to random contract via reset(task_id).
    """
    env = ContractFixEnv()
    if contract_id:
        env.load_contract_by_id(contract_id)
    else:
        env.reset(task_id=task_id)
    return env.step(action)


@app.get("/state", response_model=ContractState)
def state(task_id: str = "easy"):
    env = ContractFixEnv()
    env.reset(task_id=task_id)
    return env.state


# ── Execution Simulator Endpoints ───────────────────────────────────────

@app.get("/execution/health")
def execution_health():
    return {"status": "ok"}


@app.post("/execution/reset", response_model=ExecutionObservation)
def execution_reset(task_id: str = "execution_easy"):
    env = ContractExecutionEnv()
    return env.reset(task_id=task_id)


@app.post("/execution/step", response_model=ExecutionObservation)
def execution_step(action: ExecutionAction, task_id: str = "execution_easy", contract_id: str = None):
    env = ContractExecutionEnv()
    if contract_id:
        env.load_contract_by_id(contract_id)
    else:
        env.reset(task_id=task_id)
    return env.step(action)


@app.get("/execution/state", response_model=ContractExecutionState)
def execution_state(task_id: str = "execution_easy"):
    env = ContractExecutionEnv()
    env.reset(task_id=task_id)
    return env.state


# ── LexMind — Negotiation Co-Pilot Endpoints ────────────────────────────

@app.post("/lexmind/reset", response_model=LexMindObservation)
def lexmind_reset(task_id: str = "lexmind_easy"):
    env = LexMindEnv()
    return env.reset(task_id=task_id)


@app.post("/lexmind/step", response_model=LexMindObservation)
def lexmind_step(action: LexMindEpisodeAction, task_id: str = "lexmind_easy", contract_id: str = None):
    env = LexMindEnv()
    if contract_id:
        env.load_contract_by_id(contract_id)
    else:
        env.reset(task_id=task_id)
    return env.step(action)


@app.get("/lexmind/state", response_model=LexMindState)
def lexmind_state(task_id: str = "lexmind_easy"):
    env = LexMindEnv()
    env.reset(task_id=task_id)
    return env.state


@app.get("/lexmind/preview")
def lexmind_preview(task_id: str = "lexmind_easy"):
    env = LexMindEnv()
    env.reset(task_id=task_id)
    return {
        "task_id": task_id,
        "contract_title": env._contract.get("title", ""),
        "drafting_sequence": env.get_stripped_sequence(),
        "total_events": len(env._drafting_sequence),
    }


# ── Adversarial Arena Endpoints ──────────────────────────────────────────

_adversarial_env = AdversarialArenaEnv()


@app.get("/adversarial/health")
def adversarial_health():
    return {"status": "ok", "environment": "AdversarialArena"}


@app.post("/adversarial/reset", response_model=ForgerObservation)
def adversarial_reset(task_id: str = "adversarial_easy"):
    global _adversarial_env
    _adversarial_env = AdversarialArenaEnv()
    return _adversarial_env.reset(task_id=task_id)


@app.post("/adversarial/forger_step")
def adversarial_forger_step(action: ForgerAction, task_id: str = "adversarial_easy", contract_id: str = None):
    global _adversarial_env
    if _adversarial_env._phase == "idle":
        _adversarial_env = AdversarialArenaEnv()
        if contract_id:
            _adversarial_env.load_contract_by_id(contract_id)
        else:
            _adversarial_env.reset(task_id=task_id)
    return _adversarial_env.forger_step(action)


@app.get("/adversarial/auditor_observation", response_model=AuditorObservation)
def adversarial_auditor_observation():
    return _adversarial_env.get_auditor_observation()


@app.post("/adversarial/auditor_step")
def adversarial_auditor_step(action: AuditorAction):
    return _adversarial_env.auditor_step(action)


@app.get("/adversarial/state", response_model=AdversarialState)
def adversarial_state():
    return _adversarial_env.state


@app.post("/adversarial/configure_opponent")
def adversarial_configure_opponent(config: OpponentConfig):
    return _adversarial_env.configure_opponent(config)


@app.post("/adversarial/submit_checkpoint")
def adversarial_submit_checkpoint(checkpoint: CheckpointSubmission):
    return _adversarial_env.submit_checkpoint(checkpoint.model_dump())


@app.post("/adversarial/full_episode")
def adversarial_full_episode(
    forger_action: ForgerAction,
    task_id: str = "adversarial_easy",
    contract_id: str = None,
):
    """Run a complete episode: reset -> forger step -> (auto-auditor or return for manual auditor)."""
    global _adversarial_env
    _adversarial_env = AdversarialArenaEnv()
    if contract_id:
        _adversarial_env.load_contract_by_id(contract_id)
    else:
        _adversarial_env.reset(task_id=task_id)
    return _adversarial_env.forger_step(forger_action)


# ── CurriculumForge Endpoints ────────────────────────────────────────────

_curriculum_env = CurriculumForgeEnv()


@app.get("/curriculum/health")
def curriculum_health():
    return {"status": "ok", "environment": "CurriculumForge"}


@app.post("/curriculum/register")
def curriculum_register(config: CurriculumRunConfig):
    return _curriculum_env.register_run(
        model_name=config.model_name,
        algorithm=config.algorithm,
        starting_task=config.starting_task,
    )


@app.post("/curriculum/reset", response_model=CurriculumObservation)
def curriculum_reset(run_id: str, mode: str = "standard", task_id: str = None):
    return _curriculum_env.reset(run_id=run_id, mode=mode, force_task=task_id)


@app.post("/curriculum/step", response_model=CurriculumStepResult)
async def curriculum_step(run_id: str, request: Request):
    action = await request.json()
    return _curriculum_env.step(run_id=run_id, action_data=action)


@app.get("/curriculum/profile/{run_id}", response_model=CompetenceProfile)
def curriculum_profile(run_id: str):
    return _curriculum_env.get_profile(run_id)


@app.get("/curriculum/export/{run_id}")
def curriculum_export(run_id: str):
    episodes = _curriculum_env.export_episodes(run_id)
    from fastapi.responses import JSONResponse
    return JSONResponse(content=episodes)


# ── ConstitutionForge Endpoints ──────────────────────────────────────────

@app.get("/constitution/health")
def constitution_health():
    return {"status": "ok", "environment": "ConstitutionForge"}

@app.post("/constitution/reset", response_model=PortfolioObservation)
def constitution_reset(task_id: str = "constitution_easy"):
    env = ConstitutionForgeEnv()
    return env.reset(task_id=task_id)

@app.post("/constitution/step", response_model=PortfolioObservation)
def constitution_step(action: ConstitutionAction, task_id: str = "constitution_easy", portfolio_id: str = None):
    env = ConstitutionForgeEnv()
    if portfolio_id:
        env.load_portfolio_by_id(portfolio_id)
    else:
        env.reset(task_id=task_id)
    return env.step(action)

@app.get("/constitution/state", response_model=PortfolioState)
def constitution_state(task_id: str = "constitution_easy"):
    env = ConstitutionForgeEnv()
    env.reset(task_id=task_id)
    return env.state


# ── ContractDNA Endpoints ────────────────────────────────────────────────

@app.get("/fingerprint/schema")
def fingerprint_schema():
    return dna_engine.get_schema()

@app.post("/fingerprint", response_model=FingerprintResult)
def fingerprint(req: FingerprintRequest):
    clause_texts = req.clause_texts
    
    if not clause_texts and req.episode_id:
        # Try to find clauses from the global adversarial env if ID matches
        if (
            _adversarial_env._episode_id == req.episode_id
            and _adversarial_env._contract is not None
        ):
            # Use modified clauses (post-forger) if available, else originals
            source = (
                _adversarial_env._modified_clauses
                or _adversarial_env._contract.get("clauses", [])
            )
            clause_texts = [c["text"] for c in source]

    if not clause_texts:
        return {"error": "No clauses provided or episode_id not found"}
        
    return dna_engine.calculate_fingerprint(clause_texts, req.episode_id)


# ── FederatedArena Endpoints ─────────────────────────────────────────────

from server.federated_environment import FederatedArenaEnv
from models import (
    FederatedAction, FederatedObservation, FederatedState, FederatedFinalScore,
)

_federated_env = FederatedArenaEnv()


@app.get("/federated/health")
def federated_health():
    return {"status": "ok", "environment": "FederatedArena"}


@app.post("/federated/reset", response_model=FederatedObservation)
def federated_reset(task_id: str = "federated_easy"):
    global _federated_env
    _federated_env = FederatedArenaEnv()
    return _federated_env.reset(task_id=task_id)


@app.post("/federated/step", response_model=FederatedObservation)
def federated_step(action: FederatedAction):
    return _federated_env.step(action)


@app.get("/federated/state", response_model=FederatedState)
def federated_state():
    return _federated_env.state


@app.post("/federated/final_score", response_model=FederatedFinalScore)
def federated_final_score():
    return _federated_env.get_final_score()


# ── ContractTimeMachine Endpoints ────────────────────────────────────────

from server.timemachine_environment import ContractTimeMachineEnv
from models import TimeMachineAction, TimeMachineObservation, TimeMachineResult, TimeMachineState

_timemachine_env = ContractTimeMachineEnv()


@app.get("/timemachine/health")
def timemachine_health():
    return {"status": "ok", "environment": "ContractTimeMachine"}


@app.post("/timemachine/reset", response_model=TimeMachineObservation)
def timemachine_reset(task_id: str = "timemachine_easy"):
    global _timemachine_env
    _timemachine_env = ContractTimeMachineEnv()
    return _timemachine_env.reset(task_id=task_id)


@app.post("/timemachine/step", response_model=TimeMachineResult)
def timemachine_step(action: TimeMachineAction):
    return _timemachine_env.step(action)


@app.get("/timemachine/state", response_model=TimeMachineState)
def timemachine_state():
    return _timemachine_env.state


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    env = ContractFixEnv()

    try:
        while True:
            data_str = await websocket.receive_text()
            try:
                data = json.loads(data_str)
            except json.JSONDecodeError:
                await websocket.send_json({"error": "Invalid JSON"})
                continue

            msg_type = data.get("type")
            if msg_type == "reset":
                task_id = data.get("task_id", "easy")
                try:
                    obs = env.reset(task_id=task_id)
                    await websocket.send_json(json.loads(obs.model_dump_json()))
                except Exception as e:
                    await websocket.send_json({"error": str(e)})
            elif msg_type == "step":
                action_data = data.get("action", {})
                try:
                    action = ContractAction(**action_data)
                    obs = env.step(action)
                    await websocket.send_json(json.loads(obs.model_dump_json()))
                except Exception as e:
                    await websocket.send_json({"error": str(e)})
            elif msg_type == "state":
                try:
                    state_obj = env.state
                    await websocket.send_json(json.loads(state_obj.model_dump_json()))
                except Exception as e:
                    await websocket.send_json({"error": str(e)})
            else:
                await websocket.send_json({"error": "Unknown message type"})
    except WebSocketDisconnect:
        pass

def main():
    import uvicorn
    uvicorn.run("server.app:app", host="0.0.0.0", port=7860)

if __name__ == "__main__":
    main()
