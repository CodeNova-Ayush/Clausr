---
title: Clausr
emoji: 🛡️
colorFrom: indigo
colorTo: purple
sdk: docker
pinned: false
tags:
  - openenv
  - openenv-0.2.3
  - rl-environment
  - legal-ai
  - contract-analysis
---

<div align="center">

# 🛡️ Clausr

## Find the conflict before it finds you.

[![HF Space](https://img.shields.io/badge/HF%20Space-Live-16a34a?style=for-the-badge)](https://huggingface.co/spaces/BinaryCoder/clausr)
[![Mean Score](https://img.shields.io/badge/Llama_3.3_70B_Mean_Score-0.9830-2563eb?style=for-the-badge)](#8-benchmark-results)
[![OpenEnv](https://img.shields.io/badge/OpenEnv-Compliant-7c3aed?style=for-the-badge)](openenv.yaml)
[![GRPO](https://img.shields.io/badge/GRPO-Trained-ff69b4?style=for-the-badge)](#9-training-results)

**The world's first reinforcement learning gym that trains AI agents to detect, simulate, and prevent legal contract contradictions — featuring 6 distinct environments, deterministic heuristics, and live GRPO training integration.**

Built for the **Meta PyTorch OpenEnv Hackathon 2026**.

</div>

---

## 📖 1. Executive Summary

### The Problem
Contract contradictions are not formatting problems; they are failure modes in the operating system of commerce. A single agreement can tell a customer to pay in 30 days, tell finance that payment is not processable for 60 days, and tell legal that penalties begin somewhere in between. In large contract portfolios, these conflicts compound into delayed revenue, failed obligations, insurance disputes, regulatory exposure, and litigation. Industry estimates put contract-value leakage and dispute impact at **$860 billion per year globally**.

The hardest contradictions are internal. They are not found by asking whether one clause is "risky" in isolation. They appear when two remote clauses describe the same obligation with incompatible numbers, parties, time windows, rights, definitions, or conditions.

### The Clausr Solution
Existing legal AI tools (Harvey, Spellbook) are built for static reading and drafting. **Clausr provides the missing reinforcement learning infrastructure.** It turns causal contract reasoning into a trainable environment: agents act, the deterministic heuristic environment grades, and the reward is perfectly reproducible without LLM-as-a-judge variance.

---

## 🏛️ 2. Core Environments (OpenEnv Official Track)

Clausr exposes **three core environments** and **nine formal tasks** in its `openenv.yaml` specification. The grader is 100% deterministic, using exact set-intersection of clause IDs against hidden ground truth metadata. 

### Environment 1: Detection
The classic OpenEnv contract-review task. The agent receives a completed legal agreement with hidden contradictions and must return all conflicting pairs.
* **Easy:** 8 clauses, 1 contradiction. Pure signal.
* **Medium:** 25 clauses, 4 contradictions, 1 trap.
* **Hard:** 60 clauses, 8 contradictions, 3 traps. Traps defeat naive embedding similarity (e.g., highly similar vocabulary but different legal contexts like "termination for cause" vs "termination for convenience").

### Environment 2: Oracle Execution
Turns contracts into executable systems. Rather than static review, it asks: *"What happens when a real employee performs an action under this contract?"*
* Agents trace the causal path from business action to triggered clauses.
* They must detect runtime **crash points** where simultaneous clause activations impose mutually exclusive demands.

### Environment 3: LexMind (Incremental Drafting)
The incremental observation environment. The document grows one clause at a time.
* Agents must maintain **institutional memory** of the contract state.
* Tests cross-clause working memory: catching when a new redline collides with a clause accepted 15 events earlier, while correctly allowing intentional "supersession" clauses.

---

## 🚀 3. Extended Architecture (The Hackathon Flex)

Clausr doesn't stop at 3 environments. The backend contains a massive ecosystem of advanced RL training arenas designed to push frontier models to their absolute limits.

* 🧬 **ContractDNA Engine:** An O(1) deterministic heuristic engine that calculates a 5-dimensional risk fingerprint (Numeric, Temporal, Party, Termination, Conditional) of a contract without any LLM calls.
* ⚔️ **Adversarial Arena (`/adversarial`):** A zero-sum sequential game. A **Forger Agent** stealthily injects subtle logical contradictions into clean contracts. An **Auditor Agent** must find them. Used for advanced self-play RL.
* 🎓 **Curriculum Forge (`/curriculum`):** An adaptive meta-environment utilizing Absolute Learning Progress (ALP) to dynamically bias task selection towards the edge of the agent's current competence profile.
* 🏛️ **Constitution Forge (`/constitution`):** Scales contradiction detection from single documents to massive **portfolios**, testing inter-contract dependencies (e.g., MSA vs. SOW conflicts).
* 🤝 **Federated Arena (`/federated`):** Simulates multi-agent, multi-party negotiation where agents propose and accept terms while trying to avoid systemic contradictions.
* ⏱️ **TimeMachine (`/timemachine`):** A forensic environment where agents must attribute a specific contradiction to the exact historical draft version that introduced it.

---

## ⚖️ 4. Deterministic Scoring Mechanics

Clausr uses a highly tuned, RL-ready scoring formula that balances recall with a dynamic false-positive penalty ($\lambda$).

```text
score = clamp(recall - (lambda * false_positive_rate), 0.0, 1.0)
```

| Difficulty | $\lambda$ Penalty | Strategy Implication |
|---|---:|---|
| **Easy** | 0.10 | Encourages exploration. Minor penalty for guessing. |
| **Medium** | 0.15 | Balances exploration with precision. |
| **Hard** | 0.20 | Ruthless precision required. Guessing destroys the score. |

**Why this matters for RL:** Binary pass/fail rewards create sparse, unlearnable landscapes. Clausr provides dense, shaped reward signals. Finding 7 out of 8 contradictions yields a high score, giving the optimizer a smooth gradient toward the optimal policy.

---

## 📊 5. Benchmark Results

Real scores from running the pipeline against **Llama 3.3 70B Versatile** via the Groq API. 

| Task | Score | Execution | LexMind |
|---|---:|---:|---:|
| **Easy** | 0.9500 | 1.0000 | 0.9990 |
| **Medium** | 0.9500 | 1.0000 | 0.9990 |
| **Hard** | 0.9500 | 1.0000 | 0.9990 |

🥇 **Overall Mean Score: 0.9830**

The system achieves near-perfect performance on state-of-the-art >70B parameter models, validating the determinism of the grader and the clarity of the task definitions.

---

## 🧠 6. GRPO Training Performance

Clausr includes a fully functional live GRPO (Group Relative Policy Optimization) training loop (`clausr_grpo_training.py`) using HuggingFace TRL. Small models (e.g., Qwen-0.5B) were trained directly against the Clausr HF Space as a live reward oracle.

| Metric | Before Training | After 50 GRPO Steps | Net Improvement |
|---|---:|---:|---:|
| **Mean Reward** | 0.150 | 0.889 | **+0.739** |

<p align="center">
  <img alt="Clausr GRPO training reward curve" src="training_curve_final.png" width="80%" />
</p>
*Reward curve demonstrating the dense gradient signal provided by Clausr's heuristic grader.*

Before and after GRPO + Prompt Evolution evidence:
* **Detection Easy:** `0.0000` ➔ `0.9500`
* **Execution Hard:** `0.7429` ➔ `1.0000`
* **LexMind Hard:** `0.0909` ➔ `0.9990`
* **GLOBAL MEAN:** `0.3348` ➔ `0.9830`

---

## 🛠️ 7. API Reference & Quick Start

Clausr provides a robust FastAPI backend. All environments share a standardized `/reset` and `/step` Pydantic schema.

### Quick Start (Live Space)

**1. Check Health**
```bash
curl https://binarycoder-clausr.hf.space/health
```

**2. Reset an Environment**
```bash
curl -X POST "https://binarycoder-clausr.hf.space/reset?task_id=easy"
```

**3. Submit an Action**
```bash
curl -X POST "https://binarycoder-clausr.hf.space/step?task_id=easy&contract_id=easy_001" \
  -H "Content-Type: application/json" \
  -d '{
    "findings": [
      {
        "clause_a_id": "clause_03",
        "clause_b_id": "clause_07",
        "explanation": "Conflicting confidentiality durations."
      }
    ]
  }'
```

### Core Endpoints
| Path | Method | Purpose | Returns |
|---|---|---|---|
| `/health` | GET | Check system status | JSON Status |
| `/reset` | POST | Initialize Detection | `ContractObservation` |
| `/step` | POST | Submit Detection finding | `ContractStepResult` |
| `/execution/reset` | POST | Initialize Oracle | `ExecutionObservation` |
| `/lexmind/reset` | POST | Initialize LexMind | `LexMindObservation` |
| `/fingerprint` | POST | ContractDNA analysis | `FingerprintResult` |

---

## 🏗️ 8. Architecture Diagram

```text
                         ┌──────────────────────────────┐
                         │      RL Agent / Inference    │
                         │  OpenAI SDK + JSON actions   │
                         └───────────────┬──────────────┘
                                         │
                                         ▼
┌────────────────────────────────────────────────────────────────────┐
│                         FastAPI Server                              │
│  /reset    /step    /execution/step    /lexmind/step    /fingerprint│
└──────────────────────────────┬─────────────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│                       Environment Engine                            │
│  ┌────────────────┐  ┌───────────────────┐  ┌───────────────────┐  │
│  │ ContractFixEnv │  │ ExecutionOracle   │  │ LexMindEnv        │  │
│  │ (Detection)    │  │ (Causal Tracing)  │  │ (Working Memory)  │  │
│  └───────┬────────┘  └─────────┬─────────┘  └─────────┬─────────┘  │
│          ▼                     ▼                      ▼            │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │               Deterministic Grader & Reward Shaper             │  │
│  │          (Set Intersection + False Positive λ Penalty)         │  │
│  └──────────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬─────────────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│                         openenv.yaml                                │
│       9 core tasks · standard schemas · 2 vCPU / 8 GB limits        │
└────────────────────────────────────────────────────────────────────┘
```

---

## 🔗 9. Important Links
* **Live Deployment:** [Hugging Face Space](https://huggingface.co/spaces/BinaryCoder/clausr)
* **OpenEnv Spec:** [`openenv.yaml`](openenv.yaml)
* **GRPO Training Logic:** [`clausr_grpo_training.py`](clausr_grpo_training.py)
* **Frontend Application:** Beautiful React/Vite web application providing visual state observation for all 6 environments.

---

<div align="center">
  <i>"Clausr transforms static legal review into a dynamic reinforcement learning ecosystem."</i>
</div>

---

## 📎 All Submission Materials

| Material | Link |
|----------|------|
| 🚀 Live Environment | https://huggingface.co/spaces/BinaryCoder/Clausr |
| 📝 Blog Post | https://huggingface.co/spaces/BinaryCoder/Clausr/blob/main/Blog.md |
| 💬 Discussion & Training Results | https://huggingface.co/spaces/BinaryCoder/Clausr/discussions/1 |
| 📓 Training Notebook | https://huggingface.co/spaces/BinaryCoder/Clausr/blob/main/clausr_training_colab.ipynb |
| 🤖 GRPO Training Script | https://huggingface.co/spaces/BinaryCoder/Clausr/blob/main/clausr_grpo_training.py |
| 📊 Training Report | https://huggingface.co/spaces/BinaryCoder/Clausr/blob/main/TRAINING_REPORT.md |
| 🎯 Reward Design | https://huggingface.co/spaces/BinaryCoder/Clausr/blob/main/REWARD_DESIGN.md |
