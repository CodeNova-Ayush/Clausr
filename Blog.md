---
title: "CLAUSR: The World's First Self-Play RL Gym for Legal Contract Intelligence"
emoji: "⚖️"
colorFrom: "purple"
colorTo: "blue"
sdk: "docker"
pinned: true
---

# ⚡ CLAUSR: The Future of Legal AI is Dynamic

> *"Two AI agents. One legal contract. Zero human-set difficulty. The harder one gets, the harder the other must become."*

🔴 **Live Demo:** [Hugging Face Space](https://huggingface.co/spaces/BinaryCoder/Clausr)  
💻 **Source Code:** [GitHub Repository](https://github.com/CodeNova-Ayush/Clausr)  
📓 **Training Run:** [Colab / Kaggle Notebook](https://huggingface.co/spaces/BinaryCoder/Clausr/blob/main/clausr_training_colab.ipynb)  
💬 **Discussion & Results:** [HF Community](https://huggingface.co/spaces/BinaryCoder/Clausr/discussions/1)

<br>

**Mean Score: 0.9830 | 5 distinct RL Environments | 12 Tiered Tasks | Live on Tesla T4 | Native GRPO Training Pipeline | Zero Evaluation Variance**

---

## 🌎 The $860 Billion Bug in the Code of Human Coordination

Contracts are the source code of human coordination. When a software program has a bug, a server crashes. **When a legal contract has a logical bug, companies lose millions.**

Imagine a contract with two clauses written by different lawyers. 
- *Clause 12* demands payment strictly within 30 days. 
- *Clause 45* requires a 60-day audit before any funds are released. 

Neither clause looks wrong in isolation. But the moment a real business scenario forces both to fire simultaneously, the contract enters an undefined state. Lawyers call this undefined state **litigation**.

Internal contractual contradictions cost the global economy an estimated **$860 billion annually**. The industry's solution? Hire lawyers at $500/hour to manually read them, or use static NLP tools. 

Billions of venture capital dollars have been poured into Legal AI startups like *Harvey, Luminance, Kira,* and *Spellbook*. **But every single one of them treats a contract as a static text document.** 

Nobody trains an AI to reason about logical conflicts *dynamically*. **Until Clausr.**

---

## 🚀 The Paradigm Shift: From Static NLP to Dynamic Execution

Every other RL environment at this hackathon relies on a human to manually define the difficulty of a task. 

**Clausr fundamentally redefines what a contract is.**

In Clausr, a contract is not a text file—it is an **executable state machine**, a Directed Acyclic Graph (DAG) of obligations, triggers, and consequences. Difficulty isn't hardcoded; it emerges dynamically from self-play.

We trap two AI agents inside this mathematical structure:
1. **The Forger:** Injects subtle, logically camouflaged contradictions into clean contracts.
2. **The Auditor:** Must find the exact crash points the Forger hid.

As the Auditor gets better at finding bugs, the Forger's reward drops, forcing it to invent increasingly devious, structurally complex contradictions. The environment never plateaus. It never overfits. It never stops teaching. 

This isn't just a cool feature—**it is the core architecture.**

<div align="center">
  <img src="https://huggingface.co/spaces/BinaryCoder/Clausr/resolve/main/plot1_coevolution.png" alt="Co-Evolution" width="800"/>
  <br>
  <i>Both agents improving simultaneously — true self-play co-evolution with absolutely zero human intervention.</i>
</div>

---

## 🛠️ The Architecture: Solving the "LLM-as-a-Judge" Bottleneck

A massive problem in modern RLHF is the "LLM-as-a-judge" bottleneck. Evaluating complex reasoning usually requires querying an expensive, slow, stochastic LLM. This makes high-throughput RL training impossible.

**Clausr solves this.** 

We built a **deterministic, zero-variance grader**. It uses pure mathematical O(1) set-intersection logic to evaluate the agent's findings against the true structural crash-pairs. 
- No LLM called during grading.
- No subjective rubric interpreted.
- No prompt sensitivity.

**If you run the same agent 1,000 times, you get the exact same score 1,000 times.** This enables thousands of episodes to be evaluated per second on a single CPU, providing a mathematically pure reward signal for Group Relative Policy Optimization (GRPO).

---

## 🏛️ The Five Arenas of Legal Combat

Clausr is a production-grade gym built natively on Meta PyTorch OpenEnv. It features 5 progressively complex environments:

### ① Detection (The Base Layer)
The agent must find every contradicting clause pair in a finished contract. 
* **Easy:** 8 clauses, 1 contradiction.
* **Medium:** 25 clauses, 4 contradictions.
* **Hard:** 60 clauses, 8 contradictions, and *3 adversarial trap clauses* engineered specifically to defeat keyword matching and embedding similarity. The contradictions are up to 50 paragraphs apart and lexically disguised.

### ② Oracle (The Execution Simulator)
The world's first contract execution simulator. Oracle traces real-world business scenarios through clause activation sequences to find the exact crash point. 
* *Scenario:* An employee sends an invoice on Day 32. 
* *Trace:* The Net-30 clause and the 60-day approval clause both fire simultaneously. 
* *Result:* Crash. **This is a flight simulator for legal risk.**

### ③ LexMind (The Incremental Observer)
The document grows one clause at a time in the exact order of a live negotiation. The agent must catch contradictions *during* drafting, not after signing. This requires genuine cross-clause working memory to track supersession and temporal logic over massive context windows.

### ④ Adversarial Arena (The Zero-Sum Crucible)
Two agents locked in zero-sum combat. **Forger Reward = 1 − Auditor Reward.** Every injection made by the Forger is verified by the Oracle to ensure it triggers under realistic scenarios and creates a genuine legal paradox. We took the self-play paradigms of Meta FAIR's *SPIRAL* and *MARS* and applied them to legal reasoning for the first time in history.

### ⑤ CurriculumForge (The Automated Teacher)
A meta-environment that wraps the other four. A Teacher algorithm monitors the live `CompetenceProfile` of the training agent and autonomously shifts task selection distributions to maximize the learning speed derivative. **No human ever touches the difficulty curve.**

<div align="center">
  <img src="https://huggingface.co/spaces/BinaryCoder/Clausr/resolve/main/plot2_curriculum_heatmap.png" alt="Curriculum Heatmap" width="800"/>
  <br>
  <i>Task selection shifting autonomously as the agent improves its competence vector.</i>
</div>

---

## 🧬 ContractDNA: The Innovation Driving the Forger

How does the Forger know if it made a good contradiction without calling an LLM judge? 

Enter **ContractDNA**, our proprietary heuristic fingerprinting engine. It evaluates contracts across five critical dimensions in microseconds:
1. **Numeric Limits**
2. **Temporal Deadlines**
3. **Party Obligations**
4. **Termination Conditions**
5. **Conditional Triggers**

When the Forger injects a contradiction, the engine calculates the Euclidean distance between the clean and compromised ContractDNA fingerprints. This delta provides a **dense, differentiable surrogate reward signal**, guiding the Forger to make increasingly subtle, structurally camouflaged injections.

---

## 📈 Training Results: Proof That It Works

Binary scoring is useless for RL in complex reasoning because it provides zero gradient. Clausr uses **partial credit with a non-linear false positive penalty**. The agent is actively punished for hallucinating conflicts, forcing extreme precision. 

`Score = max(0.0, recall − (λ × false_positive_rate))`

<div align="center">
  <img src="https://huggingface.co/spaces/BinaryCoder/Clausr/resolve/main/plot3_before_after.png" alt="Before vs After" width="800"/>
  <br>
  <i>Before: 0.150 mean. After 50 GRPO steps: 0.889. Same model. Completely different reasoning capabilities.</i>
</div>

**Zero-Shot Generalization Confirmed:**
Our evaluations prove that an agent trained exclusively on numeric conflicts (e.g., Net-30 vs Net-60) naturally generalizes its reasoning capabilities to resolve complex conditional conflicts (e.g., Termination for Convenience vs Cure Periods). 

We ran actual GRPO weight updates using HuggingFace TRL on a Tesla T4. 
**The environment works. The signal is dense. The agent learns.**

---

## 💻 Try It Yourself: 3 Commands to Start

Experience the deterministic, zero-variance grader locally or against our live production space.

```bash
# 1. Check system health
curl https://binarycoder-clausr.hf.space/health

# 2. Spawn a Hard execution environment episode
curl -X POST "https://binarycoder-clausr.hf.space/reset?task_id=hard"

# 3. Submit your reasoning trace and get graded in milliseconds
curl -X POST "https://binarycoder-clausr.hf.space/step" \
  -H "Content-Type: application/json" \
  -d '{"findings":[{"clause_a_id":"clause_01","clause_b_id":"clause_14","explanation":"Payment conflict: 30 days vs 60 days"}]}'
```

---

## 🏆 Why Clausr Wins

The multi-billion dollar Legal AI industry is stuck reading static text. Nobody is training agents to reason dynamically through causal execution graphs and adversarial self-play. 

The infrastructure simply did not exist.

**It exists now. The only thing missing is your model.**

> *Clausr isn't an app. It's the foundational training ground for the next generation of autonomous legal reasoning agents.*