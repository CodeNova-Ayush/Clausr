---
title: "Clausr: The World's First RL Gym for Legal Contract Contradiction Detection"
emoji: "⚖️"
colorFrom: "purple"
colorTo: "blue"
sdk: "docker"
pinned: true
---

# ⚡ Clausr — The World's First RL Gym for Legal Contract Contradiction Detection

🔴 **Live Demo:** [Hugging Face Space](https://huggingface.co/spaces/BinaryCoder/Clausr)  
💻 **Source Code:** [GitHub Repository](https://github.com/CodeNova-Ayush/Clausr)  
📓 **Training Notebook:** [clausr_training_colab.ipynb](https://huggingface.co/spaces/BinaryCoder/Clausr/blob/main/clausr_training_colab.ipynb)  
📄 **PRD Link:** [View Product Requirements Document](https://drive.google.com/file/d/1xA4quUwoTwAJBLGFjq3v5DKVezrLMeO6/view?usp=sharing)  

---

## 🏛️ Every legal contract is a state machine.

Every clause is a transition rule: *"If party A does X, then party B must do Y within Z days."* 

When two rules fire simultaneously on the same obligation with incompatible demands, the machine enters an undefined state. That undefined state is not a bug. **It is a lawsuit.**

The numbers are staggering. Companies lose **$860 billion per year globally** to poor contract management. Nine percent of annual revenue evaporates in contract disputes. Sixty percent of those disputes are caused by internal contradictions — two clauses inside the same document making incompatible promises that nobody caught before both parties signed.

And here is the uncomfortable truth: every legal AI tool that exists today — *Harvey, Spellbook, CoCounsel, Luminance, Kira Systems* — reads finished contracts **statically**. 
- They highlight clauses. 
- They summarize paragraphs. 
- **They do not reason about logical conflicts.** 
- **They do not simulate execution.** 
- **They do not catch contradictions as they are born.**

**Clausr is the training infrastructure to change that.**

---

## 🚀 What is Clausr?

Clausr is a production-grade reinforcement learning gym built natively on **OpenEnv** where AI agents train to detect, simulate, and prevent legal contract contradictions. 

It is not a demo. It is not a proof of concept. It is a fully deployed, deterministically graded, reward-shaped training environment that gives language models a problem worth solving — and a signal precise enough to actually learn from.

The environment is live. Any agent. Any model. Any API provider. 
- **One curl command to start a new episode.** 
- **One curl command to submit findings.** 
- **A deterministic score between 0 and 1 returned instantly with zero variance across runs.**

---

## 🎯 The Three Environments

### ① Environment 1 — Detection: *Find the contradiction in a finished contract*
This is the foundational challenge. The agent receives a complete legal contract with N clauses. Each clause has an ID and full legal text. The agent must identify every pair of clauses that directly contradict each other and submit its findings as clause ID pairs with explanations.

What makes this genuinely hard is not the reading. It is the reasoning. Contradicting clauses are designed to defeat naive approaches at every level:
- **They are semantically distant.** The conflicting clauses can be fifty paragraphs apart with no proximity signal to guide the agent.
- **They are lexically disguised.** Clause A says *"thirty calendar days."* Clause B says *"within a fortnight of receipt."* Different words, different reference dates, same obligation, irreconcilable outcome.
- **They are logically non-obvious.** Neither clause is wrong alone. Only when both are enforced simultaneously does the machine crash.

Three difficulty tiers push agents to their limits:
* **Easy:** 8 clauses, 1 planted contradiction — a calibration task to verify the agent can reason at all.
* **Medium:** 25 clauses, 4 contradictions across three contradiction types, and 1 trap clause deliberately designed to look like a contradiction but resolve cleanly under careful reading.
* **Hard:** 60 clauses, 8 contradictions spanning all five contradiction types, and 3 trap clauses engineered to defeat keyword matching and embedding similarity approaches alike.

*(The five contradiction types: numeric conflicts, temporal conflicts, conditional conflicts, party-obligation conflicts, and termination conflicts).*

### ② Environment 2 — Oracle: *Simulate what happens when employees act under contradicting clauses*
This is where Clausr goes beyond anything that exists in legal AI today. Most legal analysis is static. A human or an AI reads the document and flags potential issues. 

**The Oracle does something fundamentally different. It runs the contract like a program.**

The agent receives a contract plus a set of realistic business scenarios. An employee sends an invoice on Day 32. A supplier ships goods before approval. A party exercises a termination right during a force majeure event. For each scenario, the agent must trace execution through the contract clause by clause, identify which clauses activate, and find the exact moment two contradicting clauses fire simultaneously — **the crash point.**

**This is a flight simulator for legal risk.** Instead of reading the manual and hoping it is internally consistent, you run the plane and find out where it breaks before anyone gets on board.

The scoring reflects the nuance of this task. Correctly identifying a crash scenario and the exact contradicting clause pair earns full credit. Correctly identifying that a scenario resolves cleanly earns partial credit. Missing a crash or raising a false alarm incurs a penalty. The reward signal is dense enough to train on and precise enough to mean something.

### ③ Environment 3 — LexMind: *Catch contradictions the moment they are born*
LexMind is the most architecturally novel environment in the entire OpenEnv catalog. Every other reinforcement learning environment gives the agent a complete static document. 

**LexMind gives the agent a document that grows.** Clauses arrive one at a time in the exact order they were negotiated, authored alternately by the Drafter and the Counterparty across multiple negotiation rounds.

After each new clause arrives, the agent must answer one question: *does this clause introduce a contradiction with any clause that came before it?* If yes, which pair? If a later clause resolves a contradiction through an explicit override, the agent must detect that resolution too.

This requires **genuine cross-clause memory**. The agent cannot process each clause in isolation. It must maintain a mental model of the entire contract so far, update that model with each new clause, and reason about whether the new rule conflicts with any existing rule. This is exactly how a senior contract lawyer reads a negotiation in real time.

The incremental observation architecture — where the agent's context grows episode by episode rather than being presented all at once — is a research contribution in itself. No other submission in this hackathon has this structure.

---

## 📐 The Scoring System: Why It Is Research-Grade

Most hackathon environments use binary scoring. Found the answer: 1 point. Did not find it: 0 points. Binary scoring is nearly useless for reinforcement learning because the reward signal is maximally sparse. An agent that improves from finding zero contradictions to finding one gets the same reward as an agent that finds none at all. There is no gradient to follow.

**Clausr uses partial credit scoring with a false positive penalty.** 
`score = max(0.0, recall − (λ × false_positive_rate))`

`λ` scales with difficulty: 0.10 on Easy, 0.15 on Medium, 0.20 on Hard. 

This gives agents a dense, informative signal at every step of training. Finding one of four contradictions returns 0.25. Finding two returns 0.50. Finding three returns 0.75. Finding all four with zero false positives returns 1.0. **The agent always knows exactly how much it improved.**

The false positive penalty is equally important. It means agents cannot game the environment by submitting every possible clause pair and hoping for partial credit. Precision is incentivized. Confidence calibration is rewarded. This mirrors exactly the real-world stakes — a lawyer who flags every clause pair as a potential contradiction is useless.

---

## ⚖️ The Grader: Zero Variance, Zero Hallucination

The Oracle grader is a pure mathematical set-intersection function. It computes the intersection between the set of submitted clause ID pairs and the set of pre-planted ground truth pairs. 

- **No language model is involved in grading.** 
- **No second model that could itself be wrong.** 
- **No rubric that varies by prompt wording or temperature.**

Run the same agent one hundred times on the same contract. Get the same score every time. This is not how most LLM evaluation works. **This is how science works.**

Ground truth is seeded before contract prose is generated. Contradictions are planted first as structured definitions — clause seven says thirty days, clause nineteen says sixty days for the same obligation — and contract text is generated around those anchors. This guarantees every contradiction is genuine, non-degenerate, and auditable. You can inspect exactly which contradictions were found and missed after every episode.

---

## 📊 Training Results

The reference agent using `llama-3.3-70b-versatile` via the Groq API achieves the following scores across all nine tasks:

* **Easy Detection (1.0):** The agent finds the single planted contradiction perfectly every time.
* **Medium Detection (1.0):** The agent finds all four contradictions and correctly ignores the trap clause.
* **Hard Detection (0.40):** Eight contradictions across sixty clauses with three trap clauses — this is the frontier of what current models can do without task-specific training. The trap clauses defeat approaches that rely on semantic similarity. Only genuine logical cross-referencing scores above 0.5 on this tier.
* **Oracle Execution (0.53 - 0.65):** Reflects the additional reasoning required to trace clause activation sequences through realistic business scenarios.
* **LexMind Incremental:** Represents the hardest challenge — maintaining a growing mental model of a negotiation in progress requires capabilities that current base models have not been specifically trained for. This is precisely why it is the most valuable environment to train on.

**Mean score across all nine tasks: 0.47** with the base reference agent. This is the baseline. This is what an untrained model achieves. The entire point of Clausr is to push that number higher through reinforcement learning — and the partial credit scoring system provides exactly the gradient signal needed to do it.

---

## 🧬 The Training Pipeline

Clausr is designed specifically for **GRPO (Group Relative Policy Optimization)** — the exact algorithm used in DeepSeek-R1, the model that demonstrated that reinforcement learning on verifiable reward environments produces dramatic capability improvements even in small models.

The training loop is straightforward:
1. Sample a contract from the Clausr dataset.
2. Generate N completions with the current model.
3. Submit each completion to the step endpoint.
4. Receive a reward score between 0 and 1.
5. Compute group-relative advantage across the N completions.
6. Update model weights via policy gradient. 
7. Repeat.

The verifiable reward structure of Clausr — deterministic grading, no LLM judge, dense partial credit — makes it ideal for this training paradigm. The model always receives an honest signal. There is no reward hacking through prompt manipulation. There is no evaluation variance that masks real improvement.

A Colab training notebook is included in the repository. It connects to the live Clausr environment, runs GRPO training steps using Hugging Face TRL, and generates reward curves showing training progress in real time.

---

## 🌎 Why This Problem Matters

Legal tech startups working on contract intelligence are valued at hundreds of millions of dollars precisely because this problem is unsolved at scale. The gap between what humans can do — reading every clause of every contract with full logical attention — and what organizations actually do — signing documents that have never been fully cross-referenced — is where billions of dollars of value leak every year.

**Clausr is the training infrastructure to close that gap.** 

An agent trained to score above 0.8 on Clausr Hard is an agent that can find contradictions that cost real companies real money. That agent can run on every contract before signing. That agent can monitor every negotiation in real time. That agent can simulate every business scenario before an employee acts on contradicting instructions.

This is not a benchmark for its own sake. This is a tool for building something that matters.

---

## 💻 Try It Yourself

The environment is live. No setup required.

Hit the health endpoint to confirm it is running:
```bash
curl https://binarycoder-clausr.hf.space/health
```

Call reset with task id `easy` to receive your first contract:
```bash
curl -X POST "https://binarycoder-clausr.hf.space/reset?task_id=easy"
```

Submit your findings to the step endpoint and get your score instantly:
```bash
curl -X POST "https://binarycoder-clausr.hf.space/step?task_id=easy&contract_id=easy_001" \
  -H "Content-Type: application/json" \
  -d '{"findings":[{"clause_a_id":"clause_01","clause_b_id":"clause_14","explanation":"Payment conflict: 30 days vs 60 days"}]}'
```

The full API reference, all nine task specifications, the training notebook, and the complete source code are in the repository. The environment is OpenEnv compliant with full reset, step, and state endpoints and Pydantic-typed inputs and outputs throughout.

**Build something better than the baseline. Train an agent that scores above 0.8 on Hard. The infrastructure is ready.**

📄 **[View the full PRD here](https://drive.google.com/file/d/1xA4quUwoTwAJBLGFjq3v5DKVezrLMeO6/view?usp=sharing)**