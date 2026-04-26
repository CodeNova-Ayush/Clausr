# Reward Shaping Design Document

This document explains the technical decisions behind Clausr's reward logic. It is specifically written to outline how Clausr optimizes for reinforcement learning, gradient signal, and auditable reproducibility in contract contradiction detection.

## 1. Why Partial Credit Over Binary Scoring
In standard contract-review benchmarks, tasks are often scored on a strict pass/fail basis. For an 8-contradiction contract, finding 7 out of 8 would yield a score of 0. This creates an extremely sparse reward signal, which is fatal for RL algorithms like GRPO that require dense gradient signals to optimize policy.

Clausr instead uses a continuous **recall** metric combined with a **false positive penalty**.
`score = max(0.0, min(1.0, recall - lambda * false_positive_rate))`

This dense signal allows the agent to distinguish between "slightly better legal reasoning" (finding 3 contradictions) and "no improvement" (finding 1 contradiction).

## 2. The Scaling False Positive Penalty
We use a $\lambda$ (lambda) penalty that scales with difficulty:
- **Easy:** $\lambda = 0.10$
- **Medium:** $\lambda = 0.15$
- **Hard:** $\lambda = 0.20$

**Why?** In the hard tier, the environment injects intentional legal "traps" — clauses that look contradictory but are actually resolved by overrides (e.g., "Notwithstanding clause X"). A naive agent will flag these traps and achieve high recall by simply guessing everything. A higher $\lambda$ forces the agent to learn restraint and precise legal reasoning rather than rewarding an over-active flagging policy.

## 3. Explanation Quality Scoring
A recent addition to Clausr awards up to 10% bonus points for the **quality** of the explanation. Agents must correctly name the specific conflicting values and explain the consequences of enforcing both. This incentivizes models to not just output IDs, but to perform proper Chain-of-Thought reasoning.

## 4. Why We Never Call an LLM for Grading
LLMs as judges suffer from stochastic variance, rubric drift, and prompt sensitivity. If a reward model changes its mind between episodes, policy optimization becomes noise chasing.

Clausr graders are **100% deterministic set intersections**:
```python
true_positives = len(found_pairs & true_pairs)
false_positives = len(found_pairs - true_pairs)
```
Every score comes from structured IDs mapped against an immutable ground truth. Running the same action 1,000 times returns the exact same score 1,000 times, making it robust for rigorous RL research.

## 5. Execution Environment Clean Scenario Scoring
In the execution environment, correctly identifying a scenario that does *not* trigger a contradiction is rewarded with `1.0` (previously penalized at `0.3`). This ensures that an agent capable of perfectly tracing clean business actions can achieve a perfect 1.0 mean score, fixing a previous issue where execution agents were artificially capped at ~0.53 despite perfect reasoning.
