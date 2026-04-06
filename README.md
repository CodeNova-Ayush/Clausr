# ContractFix OpenEnv Environment

## What ContractFix Is
ContractFix is an AI agent training environment. The agent reads real business contracts and identifies internal contradictions — pairs of clauses within the same document that directly conflict with each other. This is a real problem legal teams face every day. A contract that says "payment due in 30 days" in one clause and "invoices unpaid after 45 days incur a penalty" in another creates dangerous ambiguity. ContractFix trains AI agents to catch these automatically.

## How One Episode Works
1. **Reset**: The client calls `/reset` specifying a task level (easy, medium, hard). The environment loads a random pre-generated contract.
2. **Observation**: The agent receives the full contract text, the structured clause list, the exact count of planted contradictions, and instructions.
3. **Action**: The agent identifies clause pairs that conflict and submits a list of findings to the `/step` endpoint.
4. **Grading**: The deterministic grader compares the agent's findings against the ground truth contradiction pairs using set intersection (no LLMs are used for grading).
5. **Score**: The agent receives a score from 0.0 to 1.0. False positives incur a penalty (0.1 per false positive).

## Tasks
* **Easy**: NDA and Service Agreement (8 clauses, 1 contradiction).
* **Medium**: SaaS and Professional Services Agreement (25 clauses, 4 contradictions).
* **Hard**: Enterprise MSA and Technology Licensing Agreement (60 clauses, 8 contradictions, 3 traps). 

## Contradiction Types
1. **Numeric or Temporal Conflict**: The same obligation is described with different numbers (e.g., Net 30 vs Net 45).
2. **Scope Conflict**: One clause grants a right, another removes it.
3. **Party Obligation Conflict**: The same duty is assigned to different parties.
4. **Termination or Renewal Conflict**: Logically overlapping notice windows.
5. **Definition Conflict**: The same term defined differently (in Hard tasks).

## Traps (Hard Tasks)
1. **Different Contexts**: Clauses applicable to different scenarios (e.g., termination for cause vs convenience).
2. **Explicit Override**: "Notwithstanding clause X...".
3. **Complementary Scope**: Differing geography.

## API Endpoints
| Endpoint | Method | Description |
|-----------|---------|-------------|
| `/health` | GET | Health check. |
| `/reset` | POST | Starts a new episode. |
| `/step` | POST | Submits an action and gets a score. |
| `/state` | GET | Gets the current state without step or reset. |
| `/ws`     | WebSocket | Maintains session state for real training. |

## Format
- **Observation Space**: `ContractObservation` Model
- **Action Space**: `ContractAction` Model containing `findings`.
- **Reward Function**: `max(0.0, min(1.0, (true_positives / total_contradictions) - 0.1 * false_positives))`

## File Structure Tree
```
contractfix/
├── server/
│   ├── __init__.py
│   ├── app.py
│   └── environment.py
├── data/
│   └── contracts/
│       ├── easy_001.json
│       ├── ...
│       └── hard_002.json
├── models.py
├── client.py
├── openenv.yaml
├── inference.py
├── Dockerfile
├── requirements.txt
├── pyproject.toml
└── README.md
```

## Setup Instructions

### Local Server
```bash
# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn server.app:app --host 0.0.0.0 --port 7860
```

### Baseline Inference
```bash
API_BASE_URL="https://api.openai.com/v1" MODEL_NAME="gpt-4o-mini" OPENAI_API_KEY="..." python inference.py
```

### Docker Commands
```bash
docker build -t contractfix .
docker run -d -p 7860:7860 --name contractfix contractfix
```

## Technical Constraints
* **Compute**: 2 vCPU, 8 GB memory.
* **Server Port**: 7860.
* **Dependencies**: No large ML libraries like `torch` or `transformers`.