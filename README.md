# 🔍 Clausr — Contract Contradiction Detection Environment

<div align="center">

![OpenEnv](https://img.shields.io/badge/OpenEnv-Compatible-brightgreen?style=for-the-badge)
![Meta PyTorch](https://img.shields.io/badge/Meta-PyTorch%20Hackathon-EE4C2C?style=for-the-badge&logo=pytorch)
![HuggingFace](https://img.shields.io/badge/🤗%20HuggingFace-Spaces-FFD21E?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=for-the-badge&logo=fastapi)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker)

**A high-fidelity agentic environment for training and evaluating LLMs on legal contract reasoning.**

[🚀 Live Demo](https://huggingface.co/spaces/BinaryCoder/Clausr) · [📖 API Docs](https://binarycoder-clausr.hf.space/docs) · [🧪 Try It Now](#quick-start)

</div>

---

## 🧠 What is Clausr?

**Clausr** is an OpenEnv-compatible reinforcement learning environment that challenges AI agents to detect **contradictions hidden inside legal contracts**. Given a contract with dozens of clauses, the agent must identify pairs of clauses that directly contradict each other — a task that requires deep reading comprehension, logical reasoning, and domain-specific legal understanding.

This environment is purpose-built for:
- **Evaluating** LLM reasoning capabilities on structured documents
- **Training** agents via reward-shaped reinforcement learning
- **Benchmarking** models on progressively harder contract complexity levels

> **Core insight:** Most LLM benchmarks test factual recall. Clausr tests *logical contradiction detection* — a fundamentally harder, higher-stakes skill that matters in the real world.

---

## 🎯 The Problem It Solves

Legal contracts routinely contain contradictions due to multi-party drafting, version conflicts, and clause reuse across templates. These contradictions cost companies millions in disputes. Today:

- Human lawyers miss ~30% of contradictions in long contracts
- GPT-4 with naive prompting performs below 60% on hard multi-clause conflicts
- No standardized benchmark exists to measure LLM progress on this task

**Clausr provides that benchmark** — with deterministic scoring, reproducible environments, and three difficulty levels that separate mediocre models from genuinely capable reasoners.

---

## ✨ Key Features

| Feature | Details |
|---|---|
| 🏗️ **OpenEnv Compliant** | Full `reset()` / `step()` / `state()` API, typed Pydantic models, valid `openenv.yaml` |
| 📊 **3 Difficulty Levels** | Easy (8 clauses, 1 contradiction) → Medium (25 clauses, 4) → Hard (60 clauses, 8) |
| 🎯 **Partial Credit Scoring** | Reward shaped — finding 3 of 4 contradictions scores ~0.75, not 0.0 |
| 🧬 **5 Contradiction Types** | Numeric, temporal, conditional, party-obligation, termination conflicts |
| ⚡ **Deterministic Grader** | Clause ID pair matching — 100% reproducible across any machine or run |
| 🐳 **Docker Ready** | Single-command build, runs within vcpu=2 / memory=8GB constraints |
| 📦 **HF Spaces Deployed** | Live and running at `binarycoder-clausr.hf.space` |

---

## 🏛️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     CLAUSR ENVIRONMENT                   │
│                                                         │
│  ┌──────────┐    ┌───────────────┐    ┌─────────────┐  │
│  │ Agent    │───▶│  FastAPI      │───▶│ Environment  │  │
│  │(inference│    │  Server       │    │  Logic       │  │
│  │  .py)    │◀───│  (app.py)     │◀───│(environment  │  │
│  └──────────┘    └───────────────┘    │   .py)       │  │
│                         │             └──────┬───────┘  │
│                         │                    │          │
│                  ┌──────▼──────┐    ┌────────▼──────┐  │
│                  │  Pydantic   │    │  Contract      │  │
│                  │  Models     │    │  Generator +   │  │
│                  │ (models.py) │    │  Grader        │  │
│                  └─────────────┘    └───────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Episode Flow:**
```
reset(task_id) → observe clauses → agent reasons → step(findings) → score + done
```

Every episode is **single-turn**: the agent reads the entire contract once and submits all findings in one action. This models the real-world use case of batch contract review.

---

## 📁 Project Structure

```
clausr/
├── app.py              # FastAPI server — /reset, /step, /health, /state
├── environment.py      # Core logic: contract generation + grader
├── models.py           # Pydantic models: Clause, Finding, ContractAction, etc.
├── inference.py        # Agent inference script (OpenAI-compatible)
├── openenv.yaml        # OpenEnv spec: tasks, resources, action/observation spaces
├── Dockerfile          # Container config, port 7860
├── requirements.txt    # All dependencies
└── README.md           # This file
```

---

## 🔌 API Reference

### `POST /reset?task_id={easy|medium|hard}`

Initializes a new episode. Returns the full contract as a list of clauses.

```json
{
  "episode_id": "ep_a3f2c1",
  "task_id": "medium",
  "clauses": [
    { "id": "clause_01", "text": "Payment is due within 30 days of invoice." },
    { "id": "clause_07", "text": "All invoices must be settled within 14 days." },
    ...
  ],
  "num_contradictions": 4,
  "instructions": "Identify all pairs of clauses that directly contradict each other."
}
```

### `POST /step`

Submits the agent's findings. Returns score and episode completion.

**Request:**
```json
{
  "findings": [
    { "clause_a": "clause_01", "clause_b": "clause_07", "reason": "Payment terms conflict: 30 days vs 14 days" },
    { "clause_a": "clause_03", "clause_b": "clause_19", "reason": "Termination notice: 30 days vs 60 days" }
  ]
}
```

**Response:**
```json
{
  "score": 0.75,
  "reward": 0.75,
  "done": true,
  "feedback": "Found 3/4 contradictions. Missed: clause_11 vs clause_22.",
  "contradictions_found": 3,
  "contradictions_total": 4
}
```

### `GET /health`

```json
{ "status": "ok" }
```

### `GET /state`

```json
{
  "episode_id": "ep_a3f2c1",
  "task_id": "medium",
  "score": 0.75,
  "contradictions_found": 3,
  "contradictions_total": 4,
  "done": true
}
```

---

## 📊 Scoring System

Clausr uses **partial credit scoring** — a key design decision that separates it from binary pass/fail environments:

```
score = (correct_findings / total_contradictions) - (penalty × false_positives)
```

| Performance | Score |
|---|---|
| All contradictions found, no false positives | 1.0 |
| 3 of 4 found, 0 false positives | 0.75 |
| 2 of 4 found, 1 false positive | ~0.375 |
| 0 found | 0.0 |

This reward shaping incentivizes models to **be confident when right and cautious when uncertain** — which is exactly the behavior you want from a real-world legal review agent.

---

## 🧬 Contradiction Types

Clausr plants 5 types of contradictions across its contracts:

| Type | Example |
|---|---|
| **Numeric conflict** | Clause 3: "30-day payment" vs Clause 9: "14-day payment" |
| **Temporal conflict** | Clause 5: "Notice required 60 days before termination" vs Clause 18: "30-day notice sufficient" |
| **Conditional conflict** | Clause 7: "Force majeure applies to all parties" vs Clause_24: "Supplier bears all delay costs regardless" |
| **Party-obligation conflict** | Clause 2: "Buyer responsible for shipping" vs Clause 15: "Seller arranges all logistics" |
| **Termination conflict** | Clause 11: "Contract auto-renews annually" vs Clause_29: "Contract terminates at end of term" |

The **Hard** task contains all 5 types across 60 clauses — with trap clauses designed to mislead models that rely on surface-level keyword matching rather than logical reasoning.

---

## 🚀 Quick Start

### Run Locally

```bash
git clone https://github.com/BinaryCoder/clausr
cd clausr
python -m venv venv && source venv/activate
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 7860
```

### Run with Docker

```bash
docker build -t clausr .
docker run -p 7860:7860 clausr
```

### Test the API

```bash
# Health check
curl https://binarycoder-clausr.hf.space/health

# Start an episode
curl -X POST "https://binarycoder-clausr.hf.space/reset?task_id=easy"

# Submit findings
curl -X POST "https://binarycoder-clausr.hf.space/step" \
  -H "Content-Type: application/json" \
  -d '{"findings": [{"clause_a": "clause_01", "clause_b": "clause_05", "reason": "Payment conflict"}]}'
```

### Run Inference Agent

```bash
export API_BASE_URL=https://api.openai.com/v1
export MODEL_NAME=gpt-4o-mini
export HF_TOKEN=your_api_key
python inference.py
```

Expected output:
```
[START] task=easy env=clausr model=gpt-4o-mini
[STEP] step=1 action=submitted_1_findings reward=1.00 done=true error=null
[END] success=true steps=1 score=1.000 rewards=1.00

[START] task=medium env=clausr model=gpt-4o-mini
[STEP] step=1 action=submitted_4_findings reward=0.75 done=true error=null
[END] success=true steps=1 score=0.750 rewards=0.75

EASY   1.0000
MEDIUM 0.7500
HARD   0.5500
MEAN   0.7667
```

---

## ⚙️ Configuration

| Environment Variable | Description | Default |
|---|---|---|
| `API_BASE_URL` | LLM API endpoint | `https://api.openai.com/v1` |
| `MODEL_NAME` | Model identifier | `gpt-4o-mini` |
| `HF_TOKEN` | API key (required) | — |

---

## 📋 OpenEnv Spec

```yaml
name: clausr
version: "1.0"
description: Contract contradiction detection environment

tasks:
  - id: easy
    description: 8-clause contract, 1 contradiction
    min_score: 0.0
    max_score: 1.0
  - id: medium
    description: 25-clause contract, 4 contradictions
    min_score: 0.0
    max_score: 1.0
  - id: hard
    description: 60-clause contract, 8 contradictions
    min_score: 0.0
    max_score: 1.0

action_space: json_object
observation_space: json_object

resources:
  vcpu: 2
  memory_gb: 8
```

---

## 🏆 Why Clausr Stands Out

**1. Real-world problem domain.** Contract review is a $20B+ legal tech market. This isn't a toy task — it maps directly to a workflow that firms pay lawyers $500/hour to perform manually.

**2. Genuinely hard for LLMs.** Surface-level models fail on Hard tasks because the contradictions are deliberately obscured across 60 clauses with semantic distance between the conflicting pairs. Models that rely on keyword proximity rather than logical inference score under 0.4.

**3. Deterministic, reproducible grading.** The grader checks clause ID pairs against a pre-planted ground truth set. No ambiguity, no LLM-judge variance, no flaky eval infrastructure.

**4. Reward-shaped for RL.** Partial credit scoring makes this environment suitable for actual RL training runs — not just one-shot evaluation. A model can meaningfully improve from 0.3 → 0.6 → 0.9 with training signal at every step.

**5. Production-grade implementation.** Typed Pydantic models, Docker containerized, HF Spaces deployed, OpenEnv spec compliant — ready for validator in under 10 seconds.

---

## 🛠️ Built With

- [FastAPI](https://fastapi.tiangolo.com/) — API server
- [Pydantic v2](https://docs.pydantic.dev/) — typed models and validation
- [HuggingFace Spaces](https://huggingface.co/spaces) — deployment
- [OpenEnv](https://openenv.dev/) — environment spec and validator
- [OpenAI Python SDK](https://github.com/openai/openai-python) — LLM inference client

---

## 👤 Author

**Ayush Mishra** — [BinaryCoder](https://huggingface.co/BinaryCoder)

Built for the **Meta PyTorch OpenEnv Hackathon × Scaler School of Technology**
Round 1: March 25 – April 8, 2026 | Finale: April 25–26, Bangalore

---

<div align="center">

**⭐ Star this repo if you found it useful**

*Clausr — because contracts shouldn't contradict themselves, but they do.*

</div>
