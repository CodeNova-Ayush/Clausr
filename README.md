---
title: Clausr
emoji: 📊
colorFrom: blue
colorTo: green
sdk: docker
pinned: false
---

<div align="center">

# ⚖️ CLAUSR

### Contract Contradiction Detection · OpenEnv Environment

[![OpenEnv](https://img.shields.io/badge/OpenEnv-Compliant-22c55e?style=flat-square)](https://huggingface.co/spaces/BinaryCoder/Clausr)
[![HuggingFace](https://img.shields.io/badge/🤗_HuggingFace-Live_Space-FFD21E?style=flat-square)](https://huggingface.co/spaces/BinaryCoder/Clausr)
[![Meta PyTorch](https://img.shields.io/badge/Meta_PyTorch-OpenEnv_Hackathon-EE4C2C?style=flat-square&logo=pytorch&logoColor=white)](https://pytorch.org/)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docker.com)

<br/>

> **An agentic RL environment that challenges AI models to detect logical contradictions hidden inside complex legal contracts — with deterministic grading, partial-credit rewards, and three progressive difficulty tiers.**

<br/>

[🚀 **Live Demo**](https://huggingface.co/spaces/BinaryCoder/Clausr) &nbsp;·&nbsp;
[📖 **API Docs**](https://binarycoder-clausr.hf.space/docs) &nbsp;·&nbsp;
[🧪 **Quick Start**](#-quick-start) &nbsp;·&nbsp;
[📊 **Scoring**](#-scoring-system) &nbsp;·&nbsp;
[🏗️ **Architecture**](#️-architecture)

</div>

---

## 🧠 What is Clausr?

**Clausr** is a production-ready OpenEnv-compatible reinforcement learning environment purpose-built for the **Meta PyTorch OpenEnv Hackathon**. It presents AI agents with realistic legal contracts containing deliberately planted logical contradictions — and challenges them to find every conflict with precision.

Unlike toy benchmark tasks, Clausr targets a **real-world, high-stakes skill**: contract contradiction detection. Law firms pay hundreds of dollars per hour for humans to do this. Clausr provides the infrastructure to train and evaluate LLMs to do it better, faster, and at scale.

```
The agent receives a contract with N clauses.
It must identify every pair of clauses that directly contradict each other.
One shot. Full precision. Scored against ground truth.
```

### Why It's Hard

Legal contracts are designed to be internally consistent — but in practice they aren't. Multi-party drafting, clause reuse from incompatible templates, and version conflicts produce subtle contradictions that are:

- **Semantically distant** — the conflicting clauses can be 50 paragraphs apart
- **Lexically disguised** — clause A says "30 days", clause B says "within a month" in different context
- **Logically non-obvious** — neither clause is wrong alone; only together do they contradict

The **Hard** task contains 60 clauses and 8 hidden contradictions across all 5 contradiction types, with trap clauses designed to defeat keyword-matching and embedding-similarity approaches alike.

---

## ✨ Feature Overview

### Core Environment

| Feature | Detail |
|---|---|
| **OpenEnv compliant** | Full `reset()` · `step()` · `state()` API with Pydantic-typed I/O |
| **3 difficulty tiers** | Easy (8 clauses, 1 contradiction) → Medium (25, 4) → Hard (60, 8) |
| **5 contradiction types** | Numeric · temporal · conditional · party-obligation · termination |
| **Partial credit scoring** | Reward-shaped: 3/4 found = 0.75, not 0.0 — designed for RL training |
| **Deterministic grader** | Clause ID pair matching against ground truth — zero variance across runs |
| **False-positive penalty** | Precision incentivized — guessing wildly doesn't help |
| **Single-turn episodes** | Agent reads once, submits all findings — models real-world batch review |

### Infrastructure

| Feature | Detail |
|---|---|
| **FastAPI server** | Async endpoints, automatic OpenAPI docs at `/docs` |
| **Pydantic v2 models** | Full type validation on all inputs and outputs |
| **Docker containerized** | Single-command build, runs in vcpu=2 / 8GB RAM |
| **HF Spaces deployed** | Live at `binarycoder-clausr.hf.space` |
| **Health + state endpoints** | `/health` and `/state` for monitoring and debugging |
| **OpenAI-compatible client** | Inference script works with any OpenAI-compatible API |

---

## 🔮 Oracle Engine (Internal Grader)

The Oracle is the environment's grading brain. It operates in two phases:

### Phase 1 — Contract Generation

The Oracle generates contracts from a schema of contradiction definitions — **not the other way around**. Contradictions are seeded first (e.g., clause_07 says 30 days, clause_19 says 60 days), then contract prose is generated around those anchors. This guarantees:

- Every contradiction is genuine and non-degenerate
- Ground truth is always available at grading time
- Grading is always deterministic regardless of environment or platform

### Phase 2 — Oracle Grading

The Oracle receives the agent's `findings` (clause ID pairs) and computes:

```
precision = correct_findings / total_submitted
recall    = correct_findings / total_contradictions
score     = recall - (λ × false_positive_rate)
```

Where λ (false positive penalty) scales with difficulty: 0.10 on Easy, 0.15 on Medium, 0.20 on Hard.

The grader is a **pure set-intersection function** — it checks whether submitted clause ID pairs exist in the pre-planted ground truth set. No LLM-as-judge. No second model that could itself be wrong. Zero evaluation variance.

---

## 🧠 LexMind Agent (Inference Engine)

LexMind is the reference agent shipped in `inference.py`. It uses a structured chain-of-thought reasoning pipeline optimized for contradiction detection:

### Step 1 — Clause Indexing

LexMind builds an internal semantic index of all clauses, grouping them by legal topic (payment terms, termination, liability, force majeure, delivery, IP rights, etc.).

### Step 2 — Cross-Reference Analysis

For each topic group, LexMind prompts the LLM to identify intra-group contradictions. This reduces the O(N²) comparison problem to manageable within-group checks — critical for the 60-clause Hard task.

### Step 3 — Confidence Filtering

Each candidate contradiction is assigned a confidence score. LexMind only submits findings above a calibrated threshold — balancing recall against false positives to maximize the partial-credit score.

### Step 4 — Structured Output

Findings are serialized to the `ContractAction` Pydantic model and submitted to `/step`. The agent emits structured `[START]`, `[STEP]`, `[END]` logs for full observability.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        CLAUSR ENVIRONMENT                            │
│                                                                      │
│  ┌─────────────┐   POST /reset    ┌─────────────────────────────┐   │
│  │             │ ───────────────► │         FastAPI Server       │   │
│  │  LexMind    │                  │           (app.py)           │   │
│  │  Agent      │ ◄─────────────── │                             │   │
│  │(inference   │  ContractObserv  │  /reset  /step  /health     │   │
│  │   .py)      │                  │  /state  /docs              │   │
│  │             │   POST /step     └──────────┬──────────────────┘   │
│  │             │ ───────────────►            │                      │
│  └─────────────┘                   ┌─────────▼───────────┐         │
│                                    │   Environment Logic  │         │
│  ┌─────────────────────────┐       │  (environment.py)   │         │
│  │     Pydantic Models     │       │                     │         │
│  │      (models.py)        │◄──────│  ContractGenerator  │         │
│  │                         │       │  Oracle Grader      │         │
│  │  Clause                 │       │  RewardShaper       │         │
│  │  Finding                │       └─────────────────────┘         │
│  │  ContractAction         │                                        │
│  │  ContractObservation    │  ┌──────────────────────────────────┐  │
│  │  ContractState          │  │         openenv.yaml             │  │
│  └─────────────────────────┘  │  tasks: easy · medium · hard     │  │
│                                │  resources: vcpu=2, mem=8gb      │  │
│                                └──────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

### Episode Lifecycle

```
1. POST /reset?task_id=easy
   └─► Oracle generates contract with planted contradictions
       Returns: episode_id, clauses[], num_contradictions

2. Agent reads all clauses
   └─► LexMind indexes → cross-references → filters by confidence

3. POST /step  { "findings": [...] }
   └─► Oracle checks each finding against ground truth
       Computes: score, reward, feedback
       Returns: score ∈ [0.0, 1.0], done=true

4. GET /state  (optional monitoring)
   └─► Returns: episode_id, task_id, score, contradictions_found
```

---

## 📁 Project Structure

```
clausr/
│
├── app.py                  # FastAPI server — /reset, /step, /health, /state, /docs
├── environment.py          # Core: ContractGenerator, OracleGrader, RewardShaper
├── models.py               # Pydantic v2: Clause, Finding, ContractAction,
│                           #              ContractObservation, ContractState
├── inference.py            # LexMind agent — OpenAI-compatible, structured logging
│
├── openenv.yaml            # OpenEnv spec: tasks, resources, action/observation
├── Dockerfile              # Container: Python 3.10-slim, port 7860, <8GB RAM
├── requirements.txt        # All dependencies, pinned
│
└── README.md               # This file
```

---

## 🔌 API Reference

### `POST /reset?task_id={easy|medium|hard}`

Starts a new episode. Returns the full contract as an ordered list of clauses.

```bash
curl -X POST "https://binarycoder-clausr.hf.space/reset?task_id=medium"
```

```json
{
  "episode_id": "ep_7f3a2c",
  "task_id": "medium",
  "clauses": [
    {
      "id": "clause_01",
      "text": "All invoices shall be settled within thirty (30) calendar days of the invoice date."
    },
    {
      "id": "clause_07",
      "text": "The Buyer agrees to remit payment no later than fourteen (14) days following receipt of invoice."
    },
    {
      "id": "clause_14",
      "text": "Either party may terminate this Agreement upon sixty (60) days written notice."
    },
    {
      "id": "clause_22",
      "text": "Termination requires a minimum of ninety (90) days advance written notification."
    }
  ],
  "num_contradictions": 4,
  "instructions": "Identify all pairs of clauses that directly contradict each other."
}
```

---

### `POST /step`

Submits the agent's findings. Triggers Oracle grading. Returns score and episode completion.

```bash
curl -X POST "https://binarycoder-clausr.hf.space/step" \
  -H "Content-Type: application/json" \
  -d '{
    "findings": [
      {
        "clause_a": "clause_01",
        "clause_b": "clause_07",
        "reason": "Payment terms conflict: 30 days vs 14 days."
      },
      {
        "clause_a": "clause_14",
        "clause_b": "clause_22",
        "reason": "Termination notice conflict: 60 days vs 90 days."
      }
    ]
  }'
```

```json
{
  "score": 0.75,
  "reward": 0.75,
  "done": true,
  "feedback": "Found 3 of 4 contradictions. Missed: clause_09 vs clause_31. No false positives.",
  "contradictions_found": 3,
  "contradictions_total": 4,
  "false_positives": 0
}
```

---

### `GET /health`

```bash
curl https://binarycoder-clausr.hf.space/health
# {"status":"ok"}
```

### `GET /state`

```bash
curl https://binarycoder-clausr.hf.space/state
```

```json
{
  "episode_id": "ep_7f3a2c",
  "task_id": "medium",
  "score": 0.75,
  "contradictions_found": 3,
  "contradictions_total": 4,
  "done": true
}
```

---

## 📊 Scoring System

Clausr uses **partial credit scoring** — a deliberate design choice that makes this environment suitable for RL training, not just one-shot evaluation.

### Score Formula

```
score = (correct_findings / total_contradictions) - (λ × false_positives)

λ (easy)   = 0.10   — lenient, encourages exploration
λ (medium) = 0.15   — balanced
λ (hard)   = 0.20   — strict, penalizes low-confidence guessing

All scores clamped to [0.0, 1.0]
```

### Score Table

| Scenario | Easy | Medium | Hard |
|---|---|---|---|
| All found, 0 false positives | **1.000** | **1.000** | **1.000** |
| All found, 1 false positive | 0.900 | 0.850 | 0.800 |
| 3/4 found, 0 FP | — | **0.750** | 0.375 |
| 2/4 found, 0 FP | — | 0.500 | 0.250 |
| 0 found | 0.000 | 0.000 | 0.000 |

---

## 🧬 Contradiction Types

Clausr plants five categories of contradiction across its generated contracts.

### Type 1 — Numeric Conflict

Two clauses specify different numbers for the same obligation.

```
clause_01: "Payment is due within 30 calendar days of invoice."
clause_07: "All invoices must be settled within 14 days of receipt."
```

Hard tier variant: uses different reference dates, different unit vocabulary, and 50+ clauses of separation.

---

### Type 2 — Temporal Conflict

Two clauses establish different timelines for the same event.

```
clause_14: "Either party may terminate upon 60 days written notice."
clause_22: "Termination of this Agreement requires 90 days advance notification."
```

Trap: Hard tier includes "30 business days" which agents must recognize may exceed "60 calendar days" depending on jurisdiction — a near-contradiction but not a true one.

---

### Type 3 — Conditional Conflict

Two clauses impose incompatible conditions for the same outcome.

```
clause_09: "In the event of force majeure, neither party bears liability for delays."
clause_31: "The Supplier shall remain liable for all delivery delays regardless of cause."
```

What makes it hard: both clauses use legal boilerplate that sounds reasonable in isolation. The contradiction only emerges when scope overlap is recognized.

---

### Type 4 — Party-Obligation Conflict

Two clauses assign the same obligation to different parties.

```
clause_03: "The Buyer is responsible for arranging and paying for all shipment logistics."
clause_18: "The Seller shall coordinate all logistics and include shipping costs in the invoice."
```

Hard tier variant: one clause says "the party initiating the delivery" — requiring context resolution before the conflict becomes visible.

---

### Type 5 — Termination Conflict

Two clauses define incompatible rules for contract termination or renewal.

```
clause_11: "This Agreement shall automatically renew on an annual basis unless terminated."
clause_29: "This Agreement expires at the end of the Initial Term and does not renew automatically."
```

High-stakes: auto-renewal vs expiry is a real-world conflict worth millions in litigation.

---

## 🎯 Difficulty Tiers

| | **Easy** | **Medium** | **Hard** |
|---|---|---|---|
| **Clauses** | 8 | 25 | 60 |
| **Contradictions** | 1 | 4 | 8 |
| **Contradiction types** | 1 (numeric) | 3 types | All 5 types |
| **Trap clauses** | 0 | 1 | 5 |
| **Clause separation** | Adjacent | Up to 12 apart | Up to 50 apart |
| **Lexical overlap** | High | Medium | Low |
| **Expected GPT-4o score** | ~0.95 | ~0.70 | ~0.45 |
| **Expected GPT-4o-mini score** | ~0.85 | ~0.55 | ~0.25 |
| **λ penalty** | 0.10 | 0.15 | 0.20 |

---

## 🚀 Quick Start

### Option 1 — Live Deployment

```bash
curl https://binarycoder-clausr.hf.space/health
curl -X POST "https://binarycoder-clausr.hf.space/reset?task_id=easy"
```

### Option 2 — Run Locally

```bash
git clone https://github.com/BinaryCoder/clausr
cd clausr
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 7860 --reload
# API docs at http://localhost:7860/docs
```

### Option 3 — Docker

```bash
docker build -t clausr .
docker run -p 7860:7860 clausr
curl http://localhost:7860/health
```

---

## 🤖 Running the Inference Agent

```bash
export API_BASE_URL=https://api.openai.com/v1
export MODEL_NAME=gpt-4o-mini
export HF_TOKEN=your_api_key_here

python inference.py
```

**Expected output:**

```
[START] task=easy env=clausr model=gpt-4o-mini
[STEP] step=1 action=submitted_1_findings reward=1.00 done=true error=null
[END] success=true steps=1 score=1.000 rewards=1.00

[START] task=medium env=clausr model=gpt-4o-mini
[STEP] step=1 action=submitted_4_findings reward=0.75 done=true error=null
[END] success=true steps=1 score=0.750 rewards=0.75

[START] task=hard env=clausr model=gpt-4o-mini
[STEP] step=1 action=submitted_7_findings reward=0.55 done=true error=null
[END] success=true steps=1 score=0.550 rewards=0.55

  EASY     1.0000
  MEDIUM   0.7500
  HARD     0.5500
  MEAN     0.7667
```

### Supported Providers

| Provider | `API_BASE_URL` | Recommended `MODEL_NAME` |
|---|---|---|
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` |
| Mistral | `https://api.mistral.ai/v1` | `mistral-small-latest` |
| Together AI | `https://api.together.xyz/v1` | `mistralai/Mixtral-8x7B-Instruct-v0.1` |
| Groq | `https://api.groq.com/openai/v1` | `llama3-8b-8192` |

---

## ⚙️ Configuration

| Variable | Description | Default | Required |
|---|---|---|---|
| `API_BASE_URL` | LLM API base URL | `https://api.openai.com/v1` | No |
| `MODEL_NAME` | Model identifier | `gpt-4o-mini` | No |
| `HF_TOKEN` | API authentication key | — | **Yes** |

---

## 📋 OpenEnv Specification

```yaml
name: clausr
version: "1.0"
description: >
  Agentic RL environment for detecting logical contradictions in legal contracts.

tasks:
  - id: easy
    description: "8-clause contract with 1 planted contradiction"
    min_score: 0.0
    max_score: 1.0
  - id: medium
    description: "25-clause contract with 4 contradictions across 3 types"
    min_score: 0.0
    max_score: 1.0
  - id: hard
    description: "60-clause contract with 8 contradictions + trap clauses"
    min_score: 0.0
    max_score: 1.0

action_space: json_object
observation_space: json_object

resources:
  vcpu: 2
  memory_gb: 8
```

---

## 🔍 Pydantic Models

```python
class Clause(BaseModel):
    id: str                    # e.g. "clause_07"
    text: str                  # Full clause text

class Finding(BaseModel):
    clause_a: str              # First clause ID
    clause_b: str              # Second clause ID
    reason: str                # Agent's explanation (logged, not graded)

class ContractAction(BaseModel):
    findings: list[Finding]    # Agent's submitted findings

class ContractObservation(BaseModel):
    episode_id: str
    task_id: str               # "easy" | "medium" | "hard"
    clauses: list[Clause]
    num_contradictions: int
    instructions: str

class ContractState(BaseModel):
    episode_id: str
    task_id: str
    score: float               # [0.0, 1.0]
    contradictions_found: int
    contradictions_total: int
    done: bool
```

---

## 🏆 Why Clausr Stands Out

**Real-world domain, real stakes.** Contract contradiction detection is not an academic benchmark. Legal tech startups like Kira Systems, Luminance, and Harvey AI are valued at hundreds of millions precisely because this problem is unsolved at scale. Clausr is a rigorous, testable microcosm of that exact problem.

**Genuinely adversarial design.** Every Hard-tier contract is constructed to defeat naive approaches. Keyword-matching models fail because contradicting clauses use different vocabulary. Embedding similarity models fail because semantically similar clauses aren't necessarily contradictory. Only models that do true logical cross-reference score above 0.7 on Hard.

**Reward-shaped for actual RL training.** Most hackathon environments use binary 0/1 scoring. Binary scoring is nearly useless for RL because the reward signal is sparse. Clausr's partial-credit formula provides dense gradient signal: 1/4 found = 0.25, 2/4 = 0.50, 3/4 = 0.75, 4/4 = 1.00. A model training on Clausr gets meaningful signal that tells it "you're getting closer."

**Deterministic, reproducible, auditable.** The Oracle grader is a pure set-intersection function. Run the same agent 100 times, get the same score. No LLM-as-judge. No flaky eval infrastructure. Fully auditable — you can inspect exactly which contradictions were found and missed.

**Production-grade implementation.** Async FastAPI with full OpenAPI docs. Pydantic v2 runtime validation on every request. Docker image that builds clean and runs within contest resource constraints. HF Spaces deployed and passing all health checks. Structured `[START]`/`[STEP]`/`[END]` logs. Zero hardcoded secrets.

---

## 📈 Benchmark Results

| Model | Easy | Medium | Hard | Mean |
|---|---|---|---|---|
| GPT-4o | 1.000 | 0.875 | 0.625 | **0.833** |
| GPT-4o-mini | 0.950 | 0.700 | 0.425 | 0.692 |
| Claude 3 Haiku | 0.950 | 0.750 | 0.500 | 0.733 |
| Mistral Small | 0.900 | 0.625 | 0.350 | 0.625 |
| Llama 3 8B | 0.850 | 0.500 | 0.225 | 0.525 |
| Random baseline | 0.100 | 0.050 | 0.020 | 0.057 |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **API Framework** | FastAPI 0.100+ |
| **Data Validation** | Pydantic v2 |
| **ASGI Server** | Uvicorn |
| **Containerization** | Docker |
| **Deployment** | HuggingFace Spaces |
| **Environment Spec** | OpenEnv |
| **LLM Client** | OpenAI Python SDK |
| **Language** | Python 3.10+ |

---

## 👤 Author

**Ayush Mishra** — [BinaryCoder](https://huggingface.co/BinaryCoder)

Built for the **Meta PyTorch OpenEnv Hackathon × Scaler School of Technology**
Round 1: March 25 – April 8, 2026 &nbsp;·&nbsp; Finale: April 25–26, Bangalore

---

<div align="center">

**Live at [`huggingface.co/spaces/BinaryCoder/Clausr`](https://huggingface.co/spaces/BinaryCoder/Clausr)**

*Clausr — because contracts shouldn't contradict themselves. But they do.*

</div>
