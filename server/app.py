from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import json

from server.environment import ContractFixEnv
from server.execution_environment import ContractExecutionEnv
from server.lexmind_environment import LexMindEnv
from models import (
    ContractAction, ContractObservation, ContractState,
    ExecutionAction, ExecutionObservation, ContractExecutionState,
    LexMindEpisodeAction, LexMindObservation, LexMindState,
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
