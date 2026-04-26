# ContractFix — Internal Build Specification

This is the complete internal design document for building the ContractFix OpenEnv environment.
Attach this file along with README.md when starting Claude Code.
This document describes every component, every function, every data structure, and every workflow
in complete detail. Claude Code must follow this specification exactly.

---

## Project Overview

ContractFix is an OpenEnv environment where an AI agent reads business contracts and identifies
pairs of clauses that directly contradict each other within the same document.

The environment follows the OpenEnv standard interface exactly:
- Pydantic models for all data structures
- FastAPI server with WebSocket and REST endpoints
- Standard reset() step() state() API
- openenv.yaml manifest
- Baseline inference.py script
- Dockerfile for deployment

---

## How The Full System Works — Complete Flow

### Offline Phase (before deployment, runs once)
The developer generates contract JSON files and stores them in data/contracts/.
These files contain both the readable contract text (sent to the agent) and the ground truth
contradiction metadata (used only by the grader, never sent to the agent).
Contracts are generated offline because generating them at runtime would be too slow,
inconsistent, and would burn the 2 vCPU limit.

### Runtime Phase (every episode)

Step 1 — Client calls reset(task_id)
The client sends a POST request to /reset with a task_id parameter (easy, medium, or hard).
The server creates a new ContractFixEnv instance per WebSocket connection, or handles it
statelessly for REST calls.

Step 2 — Environment loads contract
The reset() method inside ContractFixEnv scans the data/contracts/ directory for JSON files
matching the pattern {task_id}_*.json, picks one at random using random.choice(), loads it
into memory, generates a new episode_id using uuid4(), resets score to 0.0, resets done to False.

Step 3 — Observation is built and returned
The _make_observation() helper method builds a ContractObservation object from the loaded contract.
It includes contract_text, clauses (as a list of Clause objects), task_id, num_contradictions
(the count of planted contradictions), and the instructions string.
Critically, the ground truth contradictions metadata is NOT included in the observation.
The observation is serialized to JSON and returned to the client.

Step 4 — Agent reads the observation
The inference script receives the ContractObservation and passes the contract text and clause list
to an LLM via the OpenAI client. The LLM is given a system prompt explaining the task and
instructed to return a JSON object with a findings list.

Step 5 — Agent submits action
The inference script parses the LLM's JSON response into a ContractAction object containing
a list of Finding objects, each with clause_a_id, clause_b_id, and explanation.
The client sends this as a POST request to /step.

Step 6 — Grader runs
The step() method calls _grade() internally. The grader builds the ground truth set of
(clause_a_id, clause_b_id) tuples sorted so order does not matter, builds the found set
from the agent's findings the same way, computes set intersection for true positives,
computes set difference for false positives, calculates the score, and returns the result.

Step 7 — Scored observation is returned
step() sets done=True, sets score and feedback on the observation, and returns it to the client.
The episode is now complete. Calling step() again after done=True returns the same final observation.

Step 8 — inference.py prints results
The baseline script prints the score for each task and the mean score across all three tasks.

---

## Complete File Structure

```
contractfix/
├── server/
│   ├── __init__.py             empty file, makes server a Python package
│   ├── app.py                  FastAPI application with all endpoints
│   └── environment.py          ContractFixEnv class with all game logic
├── data/
│   └── contracts/              directory containing all pre-generated contract JSON files
│       ├── easy_001.json       NDA, 8 clauses, 1 contradiction, no traps
│       ├── easy_002.json       Service Agreement, 8 clauses, 1 contradiction, no traps
│       ├── medium_001.json     SaaS Agreement, 25 clauses, 4 contradictions, no traps
│       ├── medium_002.json     Professional Services Agreement, 25 clauses, 4 contradictions, no traps
│       ├── hard_001.json       Enterprise MSA, 60 clauses, 8 contradictions, 3 traps
│       └── hard_002.json       Technology Licensing Agreement, 60 clauses, 8 contradictions, 3 traps
├── models.py                   all Pydantic data models
├── client.py                   HTTP and WebSocket client wrapper
├── openenv.yaml                OpenEnv manifest file
├── inference.py                baseline inference script
├── Dockerfile                  container definition
├── requirements.txt            Python dependencies
├── pyproject.toml              project metadata
└── README.md                   public documentation
```

---

## Data Models — models.py

### Clause
Represents one clause in a contract.
Fields:
- id (str): unique identifier like "clause_03" or "clause_14"
- title (str): short human-readable name like "Confidentiality Period" or "Payment Terms"
- text (str): the full text of the clause as it appears in the contract

### Finding
Represents one contradiction finding submitted by the agent.
Fields:
- clause_a_id (str): ID of the first clause in the contradicting pair
- clause_b_id (str): ID of the second clause in the contradicting pair
- explanation (str): agent's explanation of why these two clauses conflict

### ContractAction
The action the agent submits to end the episode.
Fields:
- findings (list[Finding]): list of all contradiction findings the agent identified

### ContractObservation
Everything the agent receives from the environment.
Fields:
- contract_text (str): the full contract as a single plain text string with all clauses
- clauses (list[Clause]): structured list of all clauses, each as a Clause object
- task_id (str): one of "easy", "medium", "hard"
- num_contradictions (int): the exact number of planted contradictions, disclosed to agent
- instructions (str): natural language description of the task
- done (bool): False at episode start, True after step() is called
- score (Optional[float]): None before step(), the score 0.0-1.0 after step()
- feedback (Optional[str]): None before step(), a feedback string after step()

### ContractState
Episode metadata, available at any time.
Fields:
- episode_id (str): UUID for this episode, generated fresh on each reset()
- task_id (str): current task level
- score (float): current score, 0.0 before step() is called
- contradictions_found (int): number of true positives from grader
- contradictions_total (int): total number of planted contradictions in this contract
- done (bool): whether the episode has ended

---

## Contract JSON Format — data/contracts/*.json

Each contract file is a JSON object with two major sections:
the public section (sent to agent in the observation) and the private section (used only by grader).

### Top-level fields

contract_id (str): unique identifier like "easy_001"
task_id (str): must match the file prefix, one of "easy", "medium", "hard"
title (str): human-readable contract title
contract_text (str): the full contract as plain prose text, all clauses written out
clauses (array): list of clause objects, each with id, title, text
contradictions (array): ground truth list, NEVER sent to agent
traps (array): near-contradiction traps for hard contracts, for documentation only

### Contradiction object format
Each object in the contradictions array has:
- clause_a_id (str): ID of first clause
- clause_b_id (str): ID of second clause
- type (str): one of "temporal", "scope", "party_obligation", "termination_renewal", "definition"
- description (str): plain English description of the conflict, for developer reference only

### Trap object format (hard contracts only)
Each object in the traps array has:
- clause_a_id (str): ID of first clause
- clause_b_id (str): ID of second clause
- reason (str): why this is NOT a contradiction, for developer reference only

### CRITICAL RULE FOR GENERATING CONTRACTS
Always define the contradictions FIRST, then write the contract prose AROUND them.
Never write a contract first and then try to find or insert contradictions.
The workflow is: choose contradiction types, assign clause IDs, write the conflicting sentences,
then write all surrounding neutral filler clauses.
This guarantees the grader always has deterministic ground truth.

---

## Contract Content Requirements

### easy_001.json
Contract type: Non-Disclosure Agreement between two companies
Parties: Acme Corp (Disclosing Party) and Beta Ltd (Receiving Party)
Number of clauses: 8
Contradiction count: 1
Contradiction type: Type 1 temporal conflict
Conflict: confidentiality duration stated as 2 years in clause_03 (Confidentiality Period)
and 36 months in clause_07 (Obligations Upon Termination)
The other 6 clauses are neutral: Parties, Purpose, Permitted Disclosures, Exclusions,
Return of Information, Governing Law
Traps: none

### easy_002.json
Contract type: Service Agreement between two companies
Parties: GlobalTech Inc (Client) and SwiftDeliver Ltd (Supplier)
Number of clauses: 8
Contradiction count: 1
Contradiction type: Type 3 party obligation conflict
Conflict: clause_03 (Delivery Costs) says Supplier is solely responsible for all shipping costs,
clause_07 (Cost Allocation) says all shipping costs are borne exclusively by the Client
The other 6 clauses are neutral: Services, Payment, Insurance, Term, Termination, Dispute Resolution
Traps: none

### medium_001.json
Contract type: SaaS Subscription Agreement
Parties: NovaSoft Inc (Vendor) and RetailCo Ltd (Customer)
Number of clauses: 25
Contradiction count: 4
Contradictions:
- clause_04 (Payment Terms) says Net 30 days vs clause_14 (Late Payment) says 45 days trigger — Type 1
- clause_06 (License Grant) says any commercial use including resale vs clause_11 (Restrictions) prohibits resale — Type 2
- clause_08 (Data Backup) says Vendor maintains daily backups vs clause_17 (Customer Responsibilities) says Customer solely responsible for backups — Type 3
- clause_12 (Termination for Convenience) says 30 days notice vs clause_20 (Auto-Renewal) requires 90 days cancellation — Type 4
All other 21 clauses are neutral covering: definitions, support SLA, IP ownership, warranties,
limitation of liability, confidentiality, compliance, audit rights, force majeure, notices,
amendments, severability, entire agreement
Contradicting clauses must NOT be adjacent to each other in the document
Traps: none

### medium_002.json
Contract type: Professional Services Agreement
Parties: DesignPro Agency (Service Provider) and BuildCorp Ltd (Client)
Number of clauses: 25
Contradiction count: 4
Use the same 4 contradiction types as medium_001 but with completely different content,
different clause IDs for the conflicts (spread them differently), and different business context
Traps: none

### hard_001.json
Contract type: Master Service Agreement
Parties: Apex Systems Corp (Vendor) and MegaRetail Group (Client)
Number of clauses: 60
Contradiction count: 8
Contradictions to plant:
1. Type 1: payment net days mismatch, clause_05 vs clause_22
2. Type 1: liability cap amount mismatch — $500,000 in clause_09 vs $1,000,000 in clause_31
3. Type 2: permitted use vs restriction on same right, clause_07 vs clause_18
4. Type 2: audit rights granted in clause_13 but restricted in clause_40
5. Type 3: indemnification obligation assigned to different parties, clause_11 vs clause_35
6. Type 3: insurance responsibility conflict, clause_16 vs clause_44
7. Type 4: termination notice window conflict, clause_20 vs clause_52
8. Type 5: Business Day defined as Mon-Fri in clause_02 but Saturday included in SLA at clause_38
Traps to plant (three clause pairs that LOOK contradictory but are NOT):
- Trap 1: different notice periods for termination for cause vs termination for convenience
- Trap 2: a "notwithstanding clause X" explicit override making one clause intentionally supersede another
- Trap 3: complementary geographic scope — one clause says rights apply in Territory, another says different rights apply outside Territory

### hard_002.json
Contract type: Technology Licensing and Services Agreement
Parties: CoreTech Innovations (Licensor) and GlobalBank Financial (Licensee)
Number of clauses: 60
Contradiction count: 8
Use all 5 contradiction types but with completely different content, different clause IDs,
and different business context from hard_001
Traps: 3 traps, different from the 3 in hard_001

---

## server/environment.py — ContractFixEnv Class

This is the core of the environment. Every method is described in full below.

### Class initialization __init__
When ContractFixEnv is instantiated, set the following instance variables:
- _episode_id: empty string initially
- _task_id: "easy" initially
- _contract: None initially, will hold the loaded contract dict
- _score: 0.0
- _done: False
- _contradictions_found: 0

### reset(task_id) method
Parameters: task_id (str), defaults to "easy"
What it does:
1. Set self._task_id to the provided task_id
2. Set self._done to False
3. Set self._score to 0.0
4. Set self._contradictions_found to 0
5. Generate a new self._episode_id using str(uuid.uuid4())
6. Build the path to the contracts directory using pathlib.Path pointing to data/contracts/ relative to the environment.py file location
7. Use glob to find all files matching the pattern {task_id}_*.json in that directory
8. If no files are found, raise a FileNotFoundError with a descriptive message
9. Use random.choice() to pick one file
10. Open and parse the JSON file into self._contract
11. Call self._make_observation(done=False) and return the result
Returns: ContractObservation

### step(action) method
Parameters: action (ContractAction)
What it does:
1. If self._done is already True, call self._make_observation(done=True, score=self._score) and return it immediately without re-grading
2. Call self._grade(action) which returns a tuple of (score, feedback, contradictions_found)
3. Set self._score to the returned score
4. Set self._contradictions_found to the returned contradictions_found
5. Set self._done to True
6. Build and return a ContractObservation with done=True, the score, and the feedback
Returns: ContractObservation

### state property
No parameters (Python property)
What it does:
1. Get n_total from len(self._contract["contradictions"]) if self._contract is not None else 0
2. Return a ContractState object with all current episode metadata
Returns: ContractState

### _make_observation(done, score=None, feedback=None) private method
Parameters: done (bool), score (Optional[float]), feedback (Optional[str])
What it does:
1. Build a list of Clause objects from self._contract["clauses"]
2. Return a ContractObservation with contract_text, clauses list, task_id, num_contradictions, instructions, done, score, feedback
Note: never include the "contradictions" or "traps" fields from the contract dict in the observation
Returns: ContractObservation

### _instructions() private method
No parameters
What it does:
1. Get n from len(self._contract["contradictions"])
2. Return a natural language string that:
   - Tells the agent to read the contract carefully
   - Says there are exactly n internal contradictions
   - Defines what a contradiction is: pairs of clauses within the same document that directly conflict
   - Tells the agent to find all n of them
   - Tells the agent to provide clause_a_id, clause_b_id, and a brief explanation for each
   - Warns the agent NOT to flag clauses that apply to different contexts or that explicitly override each other
Returns: str

### _grade(action) private method
Parameters: action (ContractAction)
What it does:
1. Build true_pairs as a Python set by iterating over self._contract["contradictions"] and for each entry creating tuple(sorted([c["clause_a_id"], c["clause_b_id"]])) — sorting makes order irrelevant
2. Build found_pairs the same way by iterating over action.findings and creating tuple(sorted([f.clause_a_id, f.clause_b_id]))
3. Compute true_positives = len(found_pairs intersection true_pairs)
4. Compute false_positives = len(found_pairs minus true_pairs)
5. Compute raw = true_positives divided by len(true_pairs), but if true_pairs is empty set raw to 1.0
6. Compute score = max(0.0, min(1.0, raw - 0.1 * false_positives))
7. Round score to 4 decimal places
8. Build feedback string: "Correctly identified: X/Y contradictions. False positives: Z. Score: S"
9. Return tuple of (score, feedback, true_positives)
Returns: tuple of (float, str, int)

---

## server/app.py — FastAPI Application

### Application setup
Create a FastAPI app instance with title "ContractFix OpenEnv".
Add CORS middleware allowing all origins, all methods, all headers.
This is needed for any frontend or cross-origin client to connect.

### GET /health endpoint
No parameters.
Returns JSON: {"status": "ok"}
HTTP status: 200
This endpoint is pinged by the OpenEnv validator to confirm the server is alive.
Without this returning 200, the submission will be disqualified.

### POST /reset endpoint
Query parameter: task_id (str), defaults to "easy"
What it does:
1. Create a new ContractFixEnv instance
2. Call env.reset(task_id=task_id)
3. Return the ContractObservation
This is a stateless REST endpoint. Each call creates a fresh environment.
For stateful sessions use the WebSocket endpoint.

### POST /step endpoint
Request body: ContractAction
Query parameter: task_id (str), defaults to "easy"
What it does:
1. Create a new ContractFixEnv instance
2. Call env.reset(task_id=task_id) to load a contract
3. Call env.step(action)
4. Return the scored ContractObservation
Note: for the REST endpoint, reset and step happen in the same request since there is no session state. This is acceptable for the validator. Real training should use WebSocket.

### GET /state endpoint
Query parameter: task_id (str), defaults to "easy"
What it does:
1. Create a new ContractFixEnv instance
2. Call env.reset(task_id=task_id)
3. Return env.state

### WebSocket /ws endpoint
This is the primary endpoint for real training sessions.
What it does:
1. Accept the WebSocket connection
2. Create ONE ContractFixEnv instance per connection — this is the stateful session
3. Enter a loop receiving messages
4. Parse each message as JSON
5. If type is "reset": call env.reset(task_id), send back observation JSON
6. If type is "step": parse the action field as ContractAction, call env.step(action), send back observation JSON
7. If type is "state": send back env.state JSON
8. If type is unknown: send back an error JSON
9. Handle WebSocketDisconnect gracefully by breaking the loop
The key design: one env instance per WebSocket connection. This preserves state across reset and step calls within the same session.

---

## inference.py — Baseline Inference Script

### Purpose
This script runs the baseline agent against all three tasks and prints scores.
It is run by the hackathon judges to verify the environment works end to end.
It must complete in under 20 minutes and produce reproducible scores.

### Environment variables it reads
- API_BASE_URL: base URL for OpenAI-compatible LLM API, defaults to https://api.openai.com/v1
- MODEL_NAME: model name, defaults to gpt-4o-mini
- OPENAI_API_KEY: API key, required by OpenAI client
- ENV_BASE_URL: URL of the running ContractFix server, defaults to http://localhost:7860

### System prompt for the LLM
The system prompt must:
- Identify the agent as a contract review specialist
- Explain that the task is to find internal contradictions — pairs of clauses that conflict within the same document
- Give a clear definition of what IS a contradiction: same obligation, different numbers or parties or scope
- Give a clear definition of what is NOT a contradiction: different notice periods for different termination types, explicit override clauses using "notwithstanding", complementary scope clauses
- Instruct the model to respond ONLY with a valid JSON object with a findings array
- Show the exact JSON format with clause_a_id, clause_b_id, explanation fields
- Say that if no contradictions are found, return an empty findings array

### User message construction
For each episode, build the user message by combining:
1. The instructions string from the observation
2. A header showing which task this is
3. The full contract_text from the observation
4. A structured clause list section that lists every clause as [clause_id] Title: text

### Running one episode
The run_episode function takes task_id and env_base_url as parameters.
It calls /reset to get the observation using urllib.request (no third-party HTTP library).
It passes the observation to the LLM via the OpenAI client.
It parses the LLM response JSON, stripping any markdown code fences if present.
It wraps the parsed data in a ContractAction.
It calls /step with the action using urllib.request.
It returns the score from the response.
Wrap the LLM call in try/except — if it fails, submit an empty findings list and return 0.0.

### Main block
Run the three tasks in order: easy, medium, hard.
Print progress for each task including the score and time taken.
Print a final summary table with all three scores and the mean.

---

## client.py — HTTP Client

### ContractFixClient class
Initialization takes base_url defaulting to http://localhost:7860.

### reset(task_id) method
Sends POST to /reset?task_id={task_id} with no body.
Parses response JSON into ContractObservation and returns it.
Use urllib.request, not requests library.

### step(action) method
Sends POST to /step with the ContractAction serialized as JSON body.
Parses response JSON into ContractObservation and returns it.

### state() method
Sends GET to /state.
Parses response JSON into ContractState and returns it.

### health() method
Sends GET to /health.
Returns True if status code is 200, False otherwise.
Wrap in try/except to handle connection errors.

---

## openenv.yaml — Manifest File

The manifest must include:
- name: contractfix
- version: "1.0.0"
- description: multi-line description of what the environment does
- tasks: list of 3 task objects, each with id, description, min_score 0.0, max_score 1.0
- action_space: ContractAction
- observation_space: ContractObservation
- resources: vcpu 2, memory_gb 8

---

## Dockerfile

Must use python:3.11-slim as base image.
Set WORKDIR to /app.
Copy all project files.
Install these packages and only these: fastapi, uvicorn, pydantic, openai, websockets, python-multipart.
Do not install any ML libraries, torch, transformers, or anything heavy.
Expose port 7860 — this is mandatory for Hugging Face Spaces.
CMD must run uvicorn on host 0.0.0.0 port 7860.
The server module path is server.app:app.

---

## requirements.txt

Must include:
- fastapi with version pin >=0.110.0
- uvicorn with version pin >=0.29.0
- pydantic with version pin >=2.0.0
- openai with version pin >=1.0.0
- websockets with version pin >=12.0
- python-multipart with version pin >=0.0.9

No other dependencies. Keep it minimal for the 2 vCPU / 8 GB constraint.

---

## pyproject.toml

Standard pyproject.toml with:
- project name: contractfix
- version: 1.0.0
- description
- requires-python: >=3.11
- dependencies matching requirements.txt

---

## Grader Logic — The Heart of the Environment

The grader is the most important part. It must be completely deterministic.
It must never call an LLM. It must never do string matching on the explanation field.
It only checks clause ID pairs.

### Why sorted tuples?
(clause_03, clause_07) and (clause_07, clause_03) should be treated as the same finding.
Sorting both IDs alphabetically before making the tuple ensures order independence.

### Why a set?
The agent might submit the same clause pair twice (e.g., find the same contradiction
from two different angles). Using a set deduplicates these automatically.
Duplicate findings should not count as multiple true positives or false positives.

### Penalty calibration
The false positive penalty of 0.1 per wrong finding is deliberately calibrated so that:
- It is always better to include a finding than to omit it (unless it causes more than 10× damage)
- It penalizes agents that blindly flag every possible clause pair
- A perfect agent with no false positives gets full credit for what it found

---

## Validation Checklist (run before submitting)

- GET /health returns HTTP 200 with JSON body
- POST /reset?task_id=easy returns a valid ContractObservation JSON
- POST /reset?task_id=medium returns a valid ContractObservation JSON
- POST /reset?task_id=hard returns a valid ContractObservation JSON
- POST /step with a ContractAction returns a ContractObservation with a score between 0.0 and 1.0
- python inference.py runs to completion without errors
- python inference.py prints exactly 3 scores, each between 0.0 and 1.0
- python inference.py completes in under 20 minutes
- docker build -t contractfix . succeeds without errors
- docker run -p 7860:7860 contractfix starts and responds to curl http://localhost:7860/health
- openenv.yaml contains name, version, description, 3 tasks, action_space, observation_space, resources
- All Pydantic models are fully typed with no bare dict or Any fields
- All 6 contract JSON files exist in data/contracts/
- Each contract JSON has contract_id, task_id, title, contract_text, clauses array, contradictions array

---

## Hard Constraints — Never Violate These

1. Max resources: vcpu=2, memory=8gb — never add heavy dependencies
2. All LLM calls must use the OpenAI client (from openai import OpenAI) — never use any other LLM library
3. Environment variables for LLM: API_BASE_URL, MODEL_NAME, HF_TOKEN
4. Server port must be 7860 for Hugging Face Spaces compatibility
5. inference.py must complete in under 20 minutes
6. Exactly 3 tasks: easy, medium, hard — all scores must be in [0.0, 1.0]
7. The grader must be completely deterministic — never call an LLM during grading
8. Contracts must be pre-generated — never call an LLM during reset() or step()
9. The /health endpoint must exist and return HTTP 200

---

## Common Mistakes to Avoid

Mistake 1: Importing server.environment with a wrong path.
Fix: Use relative imports within the server package or ensure PYTHONPATH includes the project root.

Mistake 2: Contract files not found at runtime because the path is wrong.
Fix: Always build the contracts directory path relative to the environment.py file using pathlib.Path(__file__).parent.parent / "data" / "contracts"

Mistake 3: Grader failing because clause IDs don't match exactly.
Fix: IDs in the JSON files must exactly match what is in the clauses array. Do not add spaces or change capitalization.

Mistake 4: Dockerfile failing because uvicorn cannot find the app module.
Fix: The CMD must be uvicorn server.app:app with the working directory set to /app where all files are copied.

Mistake 5: inference.py crashing because environment variables are not set.
Fix: Always use os.environ.get() with sensible defaults for API_BASE_URL and MODEL_NAME.

Mistake 6: LLM response cannot be parsed because it includes markdown code fences.
Fix: Always strip ```json and ``` from the LLM response before calling json.loads().

Mistake 7: step() called on the REST endpoint without first calling reset().
Fix: The REST /step endpoint must call reset() internally before calling step() since it is stateless.

---

## Prompt for Starting Claude Code Session

Paste the following as your first message in a fresh Claude Code session in an empty directory:

---

I am building an OpenEnv environment called ContractFix for the Meta PyTorch OpenEnv Hackathon.
I have attached two files: README.md and SPEC.md.

README.md is the public-facing documentation for judges and the validator.
SPEC.md is the complete internal build specification describing every component, every function,
every data structure, and every workflow in exhaustive detail.

Your job is to build the entire ContractFix project from scratch following SPEC.md exactly.
Do not write incomplete implementations. Do not skip any file. Do not ask questions — make
reasonable decisions and keep building.

Work through these phases in order without stopping:

PHASE 1 — Create the directory structure
Create all directories and empty files as specified in SPEC.md file structure section.

PHASE 2 — Write models.py
Implement all 5 Pydantic models exactly as described: Clause, Finding, ContractAction,
ContractObservation, ContractState. All fields must be fully typed.

PHASE 3 — Generate all 6 contract JSON files
Generate each contract file following the content requirements in SPEC.md exactly.
For each contract: define the contradictions first, then write the clause prose around them.
Write realistic, complete contract language for all clauses — not placeholder text.
Each clause must have meaningful legal prose that reads like a real contract.
The easy contracts need 8 complete clauses.
The medium contracts need 25 complete clauses.
The hard contracts need 60 complete clauses with traps.
All clause IDs must exactly match the contradiction metadata.

PHASE 4 — Write server/environment.py
Implement ContractFixEnv with all methods as described in SPEC.md:
reset(), step(), state property, _make_observation(), _instructions(), _grade().
Follow the grader logic exactly — sorted tuples, set intersection, false positive penalty.

PHASE 5 — Write server/app.py
Implement FastAPI application with all endpoints:
GET /health, POST /reset, POST /step, GET /state, WebSocket /ws.
Add CORS middleware.

PHASE 6 — Write inference.py
Implement the full baseline inference script with the system prompt, user message builder,
run_episode function, and main block running all 3 tasks.
Use only urllib.request for HTTP calls. Use OpenAI client for LLM calls.

PHASE 7 — Write client.py
Implement ContractFixClient with reset(), step(), state(), health() methods.

PHASE 8 — Write all config files
Write openenv.yaml, Dockerfile, requirements.txt, pyproject.toml, server/__init__.py.

PHASE 9 — Run and verify locally
Install requirements, start the server, test all 3 endpoints with curl.
Run inference.py and verify 3 scores print in [0.0, 1.0].
Fix any errors found.

PHASE 10 — Docker build and test
Run docker build, run the container, test /health and /reset inside the container.
Fix any errors. Print the final readiness report.

Print this readiness report at the end:

CONTRACTFIX — SUBMISSION READINESS
====================================
All 6 contract JSON files created:   YES / NO
server starts without errors:        YES / NO
/health returns 200:                 YES / NO
/reset easy works:                   YES / NO
/reset medium works:                 YES / NO
/reset hard works:                   YES / NO
inference.py runs clean:             YES / NO
  easy score:                        [score]
  medium score:                      [score]
  hard score:                        [score]
openenv.yaml valid structure:        YES / NO
Dockerfile builds successfully:      YES / NO
Docker /health passes:               YES / NO
Ready to push to HF Spaces:         YES / NO

Begin now. Work through all 10 phases without stopping.

---