---
title: "Clausr — The World's First RL Gym for Legal Contract Contradiction Detection"
sdk: "docker"
pinned: true
---

# Clausr — The World's First RL Gym for Legal Contract Contradiction Detection

**Every legal contract is a state machine.**

Every clause is a transition rule: *"If party A does X, then party B must do Y within Z days."* When two rules fire simultaneously on the same obligation with incompatible demands, the machine enters an undefined state. That undefined state is not a bug. It is a lawsuit.

The numbers are staggering. Companies lose $860 billion per year globally to poor contract management. Nine percent of annual revenue evaporates in contract disputes. Sixty percent of those disputes are caused by internal contradictions — two clauses inside the same document making incompatible promises that nobody caught before both parties signed.

And here is the uncomfortable truth: every legal AI tool that exists today — Harvey, Spellbook, CoCounsel, Luminance, Kira Systems — reads finished contracts statically. They highlight clauses. They summarize paragraphs. They do not reason about logical conflicts. They do not simulate execution. They do not catch contradictions as they are born.

**Clausr is the training infrastructure to change that.**

***

### What is Clausr?

Clausr is a production-grade reinforcement learning gym built on OpenEnv where AI agents train to detect, simulate, and prevent legal contract contradictions. It is not a demo. It is not a proof of concept. It is a fully deployed, deterministically graded, reward-shaped training environment that gives language models a problem worth solving — and a signal precise enough to actually learn from.

**While others built prototypes using LLMs as stochastic judges, we mathematically eliminated the LLM from the evaluation loop entirely. This isn't just a hackathon submission; it is a fundamental breakthrough in verifiable reward generation.**

The environment is live at [huggingface.co/spaces/BinaryCoder/Clausr](https://huggingface.co/spaces/BinaryCoder/Clausr). Any agent. Any model. Any API provider. One curl command to start a new episode. One curl command to submit findings. A deterministic score between 0 and 1 returned instantly with zero variance across runs.

***

### The Eight Arenas of Legal Combat

Clausr doesn't just evaluate static reading comprehension. It subjects AI agents to eight distinct, progressively complex reinforcement learning environments, each designed to isolate and conquer a specific frontier of legal reasoning.

**Environment 1 — Detection: Find the contradiction in a finished contract**

This is the foundational challenge. The agent receives a complete legal contract with N clauses. Each clause has an ID and full legal text. The agent must identify every pair of clauses that directly contradict each other and submit its findings as clause ID pairs with explanations.

What makes this genuinely hard is not the reading. It is the reasoning. Contradicting clauses are designed to defeat naive approaches at every level. They are semantically distant, separated by fifty paragraphs with no proximity signal. They are lexically disguised. Clause A says *"thirty calendar days"*; Clause B says *"within a fortnight of receipt"*. Different words, same obligation, irreconcilable outcome. 

**Environment 2 — Oracle: Simulate what happens when employees act under contradicting clauses**

Most legal analysis is static. The Oracle does something fundamentally different: it runs the contract like a program. 

The agent receives a contract plus a set of realistic business scenarios. An employee sends an invoice on Day 32. For each scenario, the agent must trace execution through the contract clause by clause, identify which clauses activate, and find the exact moment two contradicting clauses fire simultaneously — the crash point. This is a flight simulator for legal risk. Instead of reading the manual and hoping it is internally consistent, you run the plane and find out where it breaks before anyone gets on board.

**Environment 3 — LexMind: Catch contradictions the moment they are born**

LexMind is the most architecturally novel environment in the entire OpenEnv catalog. Every other reinforcement learning environment gives the agent a complete static document. LexMind gives the agent a document that grows. 

Clauses arrive one at a time in the exact order they were negotiated. The agent must answer one question continuously: does this new clause introduce a contradiction with any clause that came before it? This requires genuine cross-clause memory. The agent cannot process each clause in isolation. It must maintain a mental model of the entire contract so far, updating it dynamically—exactly how a senior contract lawyer reads a negotiation in real time.

**Environment 4 — Adversarial Arena: The Zero-Sum Crucible**

We took the self-play paradigms of Meta FAIR's SPIRAL and MARS and applied them to legal reasoning for the first time. Two agents are locked in a zero-sum game. The **Forger** injects hidden contradictions into clean contracts. The **Auditor** must find them. 

Because Forger Reward = 1 − Auditor Reward, the environment never plateaus. As the Auditor improves, the Forger is forced to invent increasingly devious, structurally complex, and lexically camouflaged paradoxes. **This is a paradigm shift on the scale of AlphaGo moving from human games to self-play.**

![Co-Evolution](https://huggingface.co/spaces/BinaryCoder/Clausr/resolve/main/plot1_coevolution.png)
*Both agents improving simultaneously — self-play co-evolution with zero human intervention.*

**Environment 5 — CurriculumForge: The Automated Teacher**

A meta-environment wrapping the others. The CurriculumForge algorithm monitors the live `CompetenceProfile` of the training agent and autonomously shifts task selection distributions to maximize the learning speed derivative. In PAIRED mode, it ensures the difficulty rests exactly at the frontier of the agent's capability. No human ever touches the difficulty curve.

![Curriculum Heatmap](https://huggingface.co/spaces/BinaryCoder/Clausr/resolve/main/plot2_curriculum_heatmap.png)
*Task selection shifting autonomously as the agent improves its competence vector.*

**Environment 6 — ConstitutionForge: Portfolio Cross-Contradiction**

Why stop at one document? In enterprise environments, conflicts don't just exist within a single contract; they cascade across Master Service Agreements, Data Processing Addendums, and SOWs. ConstitutionForge forces the agent to manage a multi-document portfolio, detecting cross-document contradictions and hierarchical supersession failures.

**Environment 7 — Federated Arena: Multi-Agent Commercial Negotiation**

A 3-agent multi-principal environment featuring a Seller, a Buyer, and a Regulator. The Seller and Buyer engage in zero-sum commercial optimization (inserting heavily biased clauses), while the Regulator monitors for legal compliance violations (e.g., GDPR, SOX). It simulates the complex push-and-pull of high-stakes corporate negotiation.

**Environment 8 — TimeMachine: Forensic Causal Attribution**

A forensic causal-attribution environment. The agent receives the complete git-style version history of a contract spanning dozens of drafts. It must identify: (1) at which exact revision a fatal contradiction was introduced, (2) which party introduced it, and (3) which clause pair forms the paradox.

***

### The Scoring System: Why It Is Research-Grade

Most hackathon environments use binary scoring. Found the answer: one point. Did not find it: zero points. Binary scoring is nearly useless for reinforcement learning because the reward signal is maximally sparse. 

Clausr uses partial credit scoring with a severe false positive penalty. The formula is recall minus lambda times false positive rate, clamped to zero and one. Lambda scales with difficulty. Finding three of four contradictions returns 0.75. Finding all four with zero false positives returns 1.0. 

The false positive penalty ensures agents cannot game the environment by submitting every possible clause pair. Precision is incentivized. Confidence calibration is rewarded. This mirrors the real-world stakes — a lawyer who flags every clause pair as a potential contradiction is useless.

***

### The Grader: Zero Variance, Zero Hallucination

The Oracle grader is a pure set-intersection function. It computes the intersection between the set of submitted clause ID pairs and the set of pre-planted ground truth pairs. No language model is involved in grading. No second model that could itself be wrong. No rubric that varies by prompt wording or temperature.

Run the same agent one hundred times on the same contract. Get the same score every time. This is not how most LLM evaluation works. This is how science works.

***

### Training Results

The reference agent using *llama-3.3-70b-versatile* via the Groq API establishes our baseline. 

**Easy detection: 1.0.** The agent finds the single planted contradiction perfectly every time.
**Medium detection: 1.0.** The agent finds all four contradictions and correctly ignores the trap clause.
**Hard detection: 0.40.** Eight contradictions across sixty clauses with three trap clauses. This is the frontier of what current models can do without task-specific training.

**Mean score across all tasks: 0.47.** This is what an untrained model achieves. The entire point of Clausr is to push that number higher through reinforcement learning.

![Before After](https://huggingface.co/spaces/BinaryCoder/Clausr/resolve/main/plot3_before_after.png)
*Before: 0.150 mean. After 50 GRPO steps: 0.889. Same model. Different agent.*

We ran actual GRPO weight updates using HuggingFace TRL on a Tesla T4, elevating the model from 0.150 to 0.889 in 50 steps. Furthermore, zero-shot transfer was confirmed: models trained exclusively on numeric conflicts successfully generalized to resolve complex conditional conflicts.

![Transfer Bonus](https://huggingface.co/spaces/BinaryCoder/Clausr/resolve/main/plot4_transfer_bonus.png)
*Zero-shot transfer confirmed — numeric conflict skills generalizing to conditional conflicts.*

***

### The Training Pipeline

Clausr is designed for GRPO — Group Relative Policy Optimization — the same algorithm used in DeepSeek-R1. 

The verifiable reward structure of Clausr — deterministic grading, no LLM judge, dense partial credit — makes it ideal for this training paradigm. The model always receives an honest signal. There is no reward hacking through prompt manipulation. There is no evaluation variance that masks real improvement.

A Colab training notebook is included in the repository. It connects to the live Clausr environment, runs GRPO training steps using Hugging Face TRL, and generates reward curves showing training progress in real time.

***

### Why This Problem Matters

Legal tech startups working on contract intelligence are valued at hundreds of millions of dollars precisely because this problem is unsolved at scale. The gap between what humans can do and what organizations actually do is where billions of dollars of value leak every year.

**Clausr is where the $860 billion problem of contract management goes from being an inevitable human error to a mathematically solvable equation.**

An agent trained to score above 0.8 on Clausr Hard is an agent that can find contradictions that cost real companies real money. This is not a benchmark for its own sake. **We didn't just build an environment for the OpenEnv Hackathon. We built the infrastructure that will train the first superhuman legal agent.**

***

### Try It Yourself

The environment is live. No setup required.

Hit the health endpoint to confirm it is running. Call reset with task id easy to receive your first contract. Read the clauses. Submit your findings to the step endpoint. Get your score back instantly.

The full API reference, all task specifications, the training notebook, and the complete source code are in the repository. The environment is OpenEnv compliant with full reset, step, and state endpoints and Pydantic-typed inputs and outputs throughout.

Build something better than the baseline. Train an agent that scores above 0.8 on Hard. The infrastructure is ready.

**Live Environment:** [huggingface.co/spaces/BinaryCoder/Clausr](https://huggingface.co/spaces/BinaryCoder/Clausr)  
**PRD Document:** [View Product Requirements Document](https://drive.google.com/file/d/1xA4quUwoTwAJBLGFjq3v5DKVezrLMeO6/view?usp=sharing)  
**GitHub Repository:** [github.com/CodeNova-Ayush/Clausr](https://github.com/CodeNova-Ayush/Clausr)