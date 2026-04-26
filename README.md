---
title: Clausr
emoji: 🛡️
colorFrom: indigo
colorTo: purple
sdk: docker
pinned: false
---

<div align="center">

# Clausr

## Find the conflict before it finds you.

[![HF Space](https://img.shields.io/badge/HF%20Space-Live-16a34a?style=for-the-badge)](https://huggingface.co/spaces/BinaryCoder/clausr)
[![Mean Score](https://img.shields.io/badge/Mean%20Score-0.8360-2563eb?style=for-the-badge)](#8-benchmark-results)
[![OpenEnv](https://img.shields.io/badge/OpenEnv-Compliant-7c3aed?style=for-the-badge)](openenv.yaml)

**The world's first reinforcement learning gym that trains AI agents to detect, simulate, and prevent legal contract contradictions — across three environments, nine tasks, and a deterministic grader with zero evaluation variance.**

</div>

---

## 2. Important links

- **Live environment:** [https://huggingface.co/spaces/BinaryCoder/clausr](https://huggingface.co/spaces/BinaryCoder/clausr)
- **Blog post / discussion:** [https://huggingface.co/spaces/BinaryCoder/Clausr/discussions/1](https://huggingface.co/spaces/BinaryCoder/Clausr/discussions/1)
- **Training notebook:** [`clausr_training.ipynb`](clausr_training.ipynb)

---

## 3. The problem

Contract contradictions are not formatting problems. They are failure modes in the operating system of commerce. A single agreement can tell a customer to pay in 30 days, tell finance that payment is not processable for 60 days, and tell legal that penalties begin somewhere in between. In large contract portfolios, these conflicts compound into delayed revenue, failed obligations, insurance disputes, regulatory exposure, and litigation. Industry estimates put contract-value leakage and dispute impact at enormous scale; Clausr focuses on the contradiction class of those failures, the kind that can stay invisible until a business action triggers two incompatible obligations at once.

The hardest contradictions are internal. They are not found by asking whether one clause is "risky" in isolation. They appear when two remote clauses describe the same obligation with incompatible numbers, parties, time windows, rights, definitions, or conditions. A reviewer may read each clause and agree with it; the failure emerges only when both clauses are enforced together. This is why contract disputes so often trace back to internal inconsistency: the document looked complete, but the logic graph was broken.

Existing legal AI tools such as Harvey, Spellbook, and general contract copilots are primarily built for reading, drafting, summarizing, and static review. Those are valuable workflows, but they do not provide reinforcement learning infrastructure for agents to practice causal contract reasoning against deterministic ground truth. Clausr turns this into a trainable environment: agents act, the environment grades, and the reward is reproducible. That is the missing substrate for improving models on legal contradiction detection rather than merely prompting them to comment on it.

---

## 4. What Clausr is

Clausr is a production-grade OpenEnv reinforcement learning gym for legal contract contradiction detection. It ships a FastAPI backend, Pydantic-typed observations and actions, deterministic graders, generated legal datasets, a reference inference runner, Docker deployment, a React/Vite interface, and a GRPO training notebook.

The benchmark exposes **three environments** and **nine tasks**:

| Environment | Task IDs | Core skill |
|---|---|---|
| Detection | `easy`, `medium`, `hard` | Find contradictory clause pairs in a completed contract. |
| Oracle Execution | `execution_easy`, `execution_medium`, `execution_hard` | Simulate business scenarios and detect contract crash points. |
| LexMind | `lexmind_easy`, `lexmind_medium`, `lexmind_hard` | Monitor a contract as it grows clause by clause and catch contradictions at insertion time. |

The grader is 100% deterministic. It does not call an LLM. It does not judge prose. It checks structured IDs against ground truth using set intersection and typed reward rules. Running the same submitted action against the same contract returns the same score every time.

Any agent, any model, and any OpenAI-compatible provider can connect to the live endpoint with a curl command or with `inference.py`. The environment is intentionally simple to call and hard to solve.

---

## 5. The three environments explained in deep detail

### Environment 1: Detection

Detection is the classic OpenEnv contract-review task. The agent receives a completed legal agreement with a list of clauses and the number of contradictions hidden inside. It must return all contradictory clause pairs:

```json
{
  "findings": [
    {
      "clause_a_id": "clause_03",
      "clause_b_id": "clause_07",
      "explanation": "Confidentiality lasts two years in one clause and thirty-six months after termination in another."
    }
  ]
}
```

The five contradiction types are:

| Type | What it means | Real example from Clausr-style contracts |
|---|---|---|
| Numeric | Same obligation, incompatible numeric value | Net 30 payment versus a 60-day accounts-payable cycle. |
| Temporal | Same event, incompatible timing | 30-day convenience termination versus a 180-day minimum termination notice. |
| Conditional | Same outcome governed by incompatible triggers | Refund available if defects remain uncured versus deemed acceptance waiving all refund rights. |
| Party obligation | Same duty assigned to different parties | Vendor must maintain insurance versus client is solely responsible for all insurance. |
| Definition / scope | Same term or right defined inconsistently | Business Day excludes Saturday while a business-hours SLA includes Saturday. |

Difficulty tiers:

| Tier | Clauses | Contradictions | Trap design |
|---|---:|---:|---|
| Easy | 8 | 1 | No traps; one direct conflict. |
| Medium | 25 | 4 | Includes near-conflict metadata and realistic clean clauses. |
| Hard | 60 | 8 | Three trap pairs designed to look suspicious but resolve cleanly. |

The hard tier is designed to defeat naive keyword matching and embedding similarity. Some real contradictions use different vocabulary, while some traps use highly similar vocabulary but different legal contexts. For example, a 14-day cure period for termination for cause and a 90-day notice period for termination without cause look similar but are not the same obligation. A `notwithstanding` clause may intentionally override another clause. A disaster-recovery data center outside the primary territory may be complementary rather than contradictory. Good agents must reason about legal scope, not just token overlap.

### Environment 2: Oracle Execution

The Oracle environment turns contracts into executable systems. Instead of asking, "Which clauses conflict in the abstract?", it asks, "What happens when a real employee, vendor, customer, or compliance officer performs an action under this contract?"

A **crash point** occurs when a scenario activates two clauses at the same time and those clauses impose incompatible demands. For example: an employee sends an invoice on day 32. One clause says invoices are payable Net 30 and late interest accrues after that point. Another clause says the client's accounts-payable workflow requires 60 days before payment can be issued. Both clauses fire. One demands payment now; the other says payment cannot happen yet. That is a contract execution crash.

Clausr models blast radius through scenario descriptions: disputed invoices, data loss, audit failure, insurance gaps, source-code access, termination disputes, regulatory exposure, or financial penalties. The agent must not simply find textual contradictions. It must trace the causal path from business action to triggered clauses to incompatible obligations.

This is the first environment of its kind in this project: a contract execution simulator where legal contradictions are not static labels but runtime failures. To score well, the agent must learn causal legal reasoning: identify which clauses activate, decide whether they overlap, reject clean scenarios with only one clause or intentional overrides, and submit the exact crash pair when there is a real collision.

### Environment 3: LexMind

LexMind is the incremental observation environment. The document grows one clause at a time. At each drafting event, the agent must decide whether the newly added clause introduces a contradiction with any clause already accepted into the draft.

This is different from static review. The agent cannot treat the final document as a bag of clauses. It must maintain institutional memory: what was accepted earlier, which obligations already exist, which party owns which duty, which payment terms are already live, which data rights have already been allocated, and which clauses are overrides rather than new conflicts.

LexMind tests cross-clause working memory. A new clause at event 15 may contradict clause 6 from the first round. A termination redline in round 2 may collide with a renewal clause from the initial draft. A data analytics license may conflict with a data-ownership restriction inserted many events earlier. The agent must preserve the working state of the contract and compare each new event against that state.

The hard tier introduces override and supersession behavior. Clauses may intentionally resolve prior conflicts or narrow the scope of earlier language. The agent must detect that an override clause is not itself a new contradiction when it clearly supersedes the earlier obligation. This is the kind of incremental observation and institutional memory task that static contract readers do not exercise.

---

## 6. Scoring system

Detection uses the exact formula:

```text
score = clamp(recall - lambda * false_positive_rate, 0.0, 1.0)
```

Where:

```text
recall = correct_findings / total_contradictions
false_positive_rate = false_positives / max(total_submitted_findings, 1)
```

Lambda by difficulty:

| Difficulty | Lambda |
|---|---:|
| Easy | 0.10 |
| Medium | 0.15 |
| Hard | 0.20 |

Example scores:

| Situation | Tier | Score intuition |
|---|---|---:|
| All contradictions found, zero false positives | Any | 1.00 |
| All contradictions found, one false positive among one wrong extra finding | Easy | 0.90 |
| Three of four found, zero false positives | Medium | 0.75 |
| Two of four found, one false positive among three submissions | Medium | 0.45 |
| Eight of eight found, two false positives among ten submissions | Hard | 0.96 |
| Zero found, many guesses | Any | 0.00 after clamp |

Partial credit is critical for RL. A binary pass/fail score would turn a 60-clause contract with eight hidden contradictions into an almost useless sparse reward. Clausr provides dense signal: finding three of four contradictions is meaningfully better than finding one of four, and finding seven of eight is nearly solved. That gradient makes policy improvement possible.

The false-positive penalty prevents gaming. An agent cannot simply submit every plausible pair. Precision matters because every wrong pair lowers the score. The best policy must balance recall and restraint.

---

## 7. The grader

The grader is a pure set intersection function. It builds a set of ground-truth pairs:

```python
true_pairs = {tuple(sorted([clause_a_id, clause_b_id]))}
```

It builds the submitted set the same way, so pair order does not matter. Then it computes:

- true positives: submitted pairs intersecting ground truth
- false positives: submitted pairs not in ground truth
- score: deterministic formula or environment-specific reward rule

Ground truth is seeded before contract prose is generated. The data files contain private contradiction metadata used only by the grader. The agent sees the public contract text, clause IDs, scenario descriptions, or drafting events, but never the ground-truth arrays.

Running the same agent action 1,000 times returns the same score 1,000 times. There is no LLM-as-judge. There is no stochastic evaluator. There is no hidden rubric drift. This makes Clausr suitable for serious RL research because reward is stable, auditable, and reproducible.

---

## 8. Benchmark results

Real scores from running `inference.py` with the reference benchmark configuration `MODEL_NAME=llama-3.3-70b-versatile`:

| Task | Score |
|---|---:|
| easy | 1.0000 |
| medium | 1.0000 |
| hard | 1.0000 |
| execution_easy | 0.5333 |
| execution_medium | 0.6500 |
| execution_hard | 0.6143 |
| lexmind_easy | 0.9990 |
| lexmind_medium | 0.8636 |
| lexmind_hard | 0.8636 |
| **MEAN** | **0.8360** |

Model comparison:

| Model | Status | Expected / observed performance |
|---|---|---:|
| GPT-4o | Estimate | >0.85 |
| llama-3.3-70b-versatile | Observed in benchmark table | 0.8360 |
| Claude Haiku class models | Estimate | 0.65-0.80 |
| 7B-13B instruction models | Estimate | 0.30-0.60 |
| Small local baselines | Estimate | <0.30 |

Only the llama-3.3-70b-versatile number above is reported as the benchmark result. Other rows are estimates based on expected reasoning capacity and are included to set expectations for experimentation.

---

## 9. Training results

| Metric | Before training | After 50 GRPO steps | Improvement |
|---|---:|---:|---:|
| Mean reward | 0.150 | 0.889 | +0.739 |

<p align="center">
  <img alt="Clausr GRPO training reward curve" src="training_curve_final.png" />
</p>

*Training reward curve over 50 GRPO steps. The x-axis is training step; the y-axis is episode reward.*

The improvement demonstrates that Clausr provides dense gradient signal suitable for real RL training. Agents are not waiting for rare binary wins. They receive shaped reward from deterministic contract outcomes, allowing policy updates to distinguish "slightly better legal reasoning" from "no improvement."

---

## 10. Training pipeline

Clausr is designed for GRPO-style training on verifiable rewards. GRPO, popularized by systems such as DeepSeek-R1, works especially well when the environment can score completions without a learned reward model. Clausr provides exactly that: a deterministic endpoint that returns a scalar reward from a structured action.

The training loop:

1. Sample an episode from `/reset`.
2. Render the observation into a prompt.
3. Generate `N` completions from the policy.
4. Parse each completion into an action.
5. Submit each action to `/step`.
6. Receive deterministic rewards.
7. Compute group-relative advantage.
8. Update the policy.

Notebook: [`clausr_training.ipynb`](clausr_training.ipynb)

---

## 11. Quick start

All commands below use the live Space.

### 1. Health

```bash
curl https://binarycoder-clausr.hf.space/health
```

Expected response:

```json
{"status":"ok"}
```

### 2. Reset easy task

```bash
curl -X POST "https://binarycoder-clausr.hf.space/reset?task_id=easy"
```

Expected response shape:

```json
{
  "episode_id": "uuid",
  "contract_id": "easy_001",
  "task_id": "easy",
  "clauses": [
    {"id": "clause_01", "title": "Parties", "text": "..."}
  ],
  "num_contradictions": 1,
  "instructions": "..."
}
```

### 3. Submit a finding

```bash
curl -X POST "https://binarycoder-clausr.hf.space/step?task_id=easy&contract_id=easy_001" \
  -H "Content-Type: application/json" \
  -d '{
    "findings": [
      {
        "clause_a_id": "clause_03",
        "clause_b_id": "clause_07",
        "explanation": "The confidentiality duration is two years in one clause and thirty-six months after termination in another."
      }
    ]
  }'
```

Expected response shape:

```json
{
  "score": 1.0,
  "reward": 1.0,
  "done": true,
  "feedback": "Correctly identified: 1/1 contradictions. False positives: 0...",
  "contradictions_found": 1,
  "contradictions_total": 1,
  "false_positives": 0
}
```

### 4. Check state

```bash
curl "https://binarycoder-clausr.hf.space/state?task_id=easy"
```

Expected response shape:

```json
{
  "episode_id": "uuid",
  "task_id": "easy",
  "score": 0.001,
  "contradictions_found": 0,
  "contradictions_total": 1,
  "done": false
}
```

---

## 12. API reference

| Method | Path | Parameters | Returns |
|---|---|---|---|
| GET | `/health` | none | Server health JSON. |
| POST | `/reset` | `task_id=easy|medium|hard` | `ContractObservation` with contract clauses and task instructions. |
| POST | `/step` | `task_id`, optional `contract_id` | `ContractStepResult` with score, reward, done, feedback, found count, total count, false positives. |
| GET | `/state` | `task_id` | `ContractState` metadata for a freshly loaded task. |
| POST | `/execution/reset` | `task_id=execution_easy|execution_medium|execution_hard` | `ExecutionObservation` with clauses and business scenarios. |
| POST | `/execution/step` | `task_id`, optional `contract_id` | Scored `ExecutionObservation`. |
| POST | `/lexmind/reset` | `task_id=lexmind_easy|lexmind_medium|lexmind_hard` | `LexMindObservation` with drafting sequence and contract memory. |
| POST | `/lexmind/step` | `task_id`, optional `contract_id` | Scored `LexMindObservation`. |

---

## 13. Pydantic models

Key model shapes:

```python
class Clause(BaseModel):
    id: str
    title: str
    text: str

class Finding(BaseModel):
    clause_a_id: str
    clause_b_id: str
    explanation: str

class ContractAction(BaseModel):
    findings: list[Finding]

class ContractObservation(BaseModel):
    episode_id: str | None
    contract_id: str | None
    task_id: str
    clauses: list[Clause]
    num_contradictions: int
    instructions: str
    done: bool

class ContractStepResult(ContractObservation):
    score: float
    reward: float
    done: bool
    feedback: str
    contradictions_found: int
    contradictions_total: int
    false_positives: int
```

Execution and LexMind add typed scenario/event-specific actions:

```python
class ExecutionAction(BaseModel):
    traces: list[ExecutionTrace]

class LexMindEpisodeAction(BaseModel):
    steps: list[LexMindStepAction]
```

---

## 14. Supported providers

`inference.py` uses the OpenAI SDK. Configure providers with environment variables:

| Provider | `API_BASE_URL` | `MODEL_NAME` | `OPENAI_API_KEY` |
|---|---|---|---|
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` or `gpt-4o` | OpenAI API key |
| Groq | `https://api.groq.com/openai/v1` | `llama-3.3-70b-versatile` | Groq API key |
| Anthropic via gateway | OpenAI-compatible gateway URL | Claude model exposed by gateway | Gateway key |
| Mistral | `https://api.mistral.ai/v1` | `mistral-large-latest` | Mistral API key |
| Together AI | `https://api.together.xyz/v1` | `meta-llama/Llama-3.3-70B-Instruct-Turbo` | Together API key |

Example:

```bash
export API_BASE_URL=https://api.groq.com/openai/v1
export MODEL_NAME=llama-3.3-70b-versatile
export OPENAI_API_KEY=...
python3 inference.py
```

---

## 15. Architecture diagram

```text
                         ┌──────────────────────────────┐
                         │      LexMind / Agent         │
                         │  OpenAI SDK + JSON actions   │
                         └───────────────┬──────────────┘
                                         │
                                         ▼
┌────────────────────────────────────────────────────────────────────┐
│                         FastAPI server                              │
│                                                                    │
│  GET /health     POST /reset        POST /step       GET /state    │
│  POST /execution/reset              POST /execution/step           │
│  POST /lexmind/reset                POST /lexmind/step             │
└──────────────────────────────┬─────────────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│                       Environment logic                             │
│                                                                    │
│  ContractFixEnv             ContractExecutionEnv       LexMindEnv   │
│  ┌────────────────┐         ┌───────────────────┐     ┌──────────┐ │
│  │ Contract data  │         │ Scenario traces   │     │ Drafting │ │
│  │ Ground truth   │         │ Crash detection   │     │ memory   │ │
│  └───────┬────────┘         └─────────┬─────────┘     └────┬─────┘ │
│          ▼                            ▼                    ▼       │
│  ContractGenerator             OracleGrader          RewardShaper  │
│  OracleGrader                  deterministic         deterministic │
│  RewardShaper                  crash scoring         event scoring │
└──────────────────────────────┬─────────────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│                         Pydantic models                             │
│  Clause · Finding · ContractAction · ContractObservation · Results  │
└──────────────────────────────┬─────────────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│                         openenv.yaml                                │
│       9 tasks · action spaces · observation spaces · 2 vCPU / 8 GB  │
└────────────────────────────────────────────────────────────────────┘
```

---

## 16. Project structure

```text
.
├── .dockerignore                         # Keeps transient artifacts out of Docker builds.
├── .gitattributes                        # Repository attribute rules.
├── .gitignore                            # Ignores caches, logs, checkpoints, and local env files.
├── Dockerfile                            # HF Space / Docker runtime image.
├── Dockerfile.save                       # Historical Dockerfile backup.
├── README.md                             # Judge-facing project documentation.
├── SPEC.md                               # Original build/design specification.
├── add_runners.py                        # Legacy helper for inference runners.
├── build_adversarial_data.py             # Data builder for adversarial contracts.
├── build_constitution_data.py            # Data builder for portfolio contracts.
├── build_data.py                         # Data builder for detection contracts.
├── checks_output.txt                     # Historical validation output.
├── clausr_training.ipynb                 # Colab GRPO training notebook.
├── clausr_training_colab.ipynb           # Colab notebook copy used in earlier submission flow.
├── client.py                             # Python client wrapper.
├── data/contracts/*.json                 # Ground-truth contract datasets for all environments.
├── finalize_fixes.py                     # Legacy patch helper.
├── finish_inference_fixes.py             # Legacy patch helper.
├── fix_inference.py                      # Legacy patch helper.
├── fix_inference_clean.py                # Legacy patch helper.
├── frontend/                             # React/Vite visual interface.
├── generate_plots.py                     # Plot generation utility.
├── inference.py                          # Reference 9-task inference runner.
├── inference_test.py                     # Historical inference test script.
├── keep_alive.sh                         # Optional HF Space keep-alive ping script.
├── manual_test.py                        # Manual endpoint test helper.
├── models.py                             # Pydantic model definitions.
├── openenv.yaml                          # OpenEnv manifest for nine tasks.
├── patch_extract.py                      # Legacy patch helper.
├── patch_inference.py                    # Legacy patch helper.
├── pyproject.toml                        # Python package metadata.
├── reapply_fixes.py                      # Legacy patch helper.
├── requirements.txt                      # Runtime Python dependencies.
├── run_audit.sh                          # Audit script helper.
├── safe_finalize.py                      # Legacy finalization helper.
├── server/__init__.py                    # Server package marker.
├── server/app.py                         # FastAPI app and endpoint registry.
├── server/app.py.save                    # Historical app backup.
├── server/environment.py                 # Detection environment and deterministic grader.
├── server/execution_environment.py       # Oracle execution simulator.
├── server/lexmind_environment.py         # Incremental LexMind environment.
├── server/adversarial_environment.py     # Adversarial forging/auditing environment.
├── server/constitution_environment.py    # Cross-contract portfolio environment.
├── server/curriculum_environment.py      # Adaptive curriculum meta-environment.
├── server/federated_environment.py       # Multi-agent federated negotiation environment.
├── server/fingerprint_engine.py          # ContractDNA risk fingerprinting engine.
├── server/timemachine_environment.py     # Forensic version-attribution environment.
├── test_checks.sh                        # Shell validation helper.
├── test_constitution.py                  # Constitution environment test.
├── test_easy.py                          # Easy task test.
├── test_endpoints.sh                     # Endpoint smoke test.
├── train_grpo.py                         # Lightweight GRPO smoke-training script.
├── training_curve.png                    # Training reward curve artifact.
├── training_curve_final.png              # README-embedded final training curve.
└── uv.lock                               # Dependency lock file.
```

Frontend highlights:

```text
frontend/src/main.jsx                     # Route registry.
frontend/src/pages/*.jsx                  # Landing, app, compare, graph, oracle, LexMind pages.
frontend/src/components/app/*.jsx         # Contract review interface components.
frontend/src/components/landing/*.jsx     # Landing page sections.
frontend/src/utils/*.js                   # API and agent helpers.
```

---

## 17. Why Clausr stands out

The problem is real and high stakes. Contract contradiction detection is not a toy benchmark; it is a core failure mode in legal operations, procurement, SaaS contracting, finance, insurance, and regulated industries. When an agreement contains incompatible obligations, the cost appears later as operational delay, disputed payment, failed audit, litigation, or regulatory exposure.

The adversarial design defeats naive approaches. Hard contracts include traps that look lexically similar but are legally clean, while real conflicts may be semantically distant. Keyword matching over-flags traps. Embedding similarity misses cross-topic logic. A capable agent must understand legal scope, triggering conditions, party roles, and override language.

Partial credit scoring is research grade. Clausr does not collapse a long-horizon legal reasoning task into a binary win/loss. It rewards each correct discovery, penalizes false positives, and gives dense signal across difficulty tiers. That makes it useful for training, not just evaluation.

Deterministic evaluation matters for serious RL work. If the reward model changes its mind, policy optimization becomes noise chasing. Clausr's reward is reproducible and auditable. Every score comes from structured IDs and ground truth, not from another model's opinion.

---

## 18. Keep-alive note

The Hugging Face Space may sleep after inactivity. Wake it with:

```bash
curl https://binarycoder-clausr.hf.space/health
```

If the first request is slow, wait a few seconds and call it again.
