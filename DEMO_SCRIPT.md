# Clausr Live Presentation Script

## Opening 30 seconds

"Companies lose **$860 billion per year** to poor contract management, and a major reason is invisible contradiction: one clause says one thing, another clause quietly makes that promise impossible to keep. Clausr is an OpenEnv reinforcement learning gym that trains AI agents to detect, simulate, and prevent those contradictions before they become lawsuits. I am going to show the live HuggingFace Space running now at `https://huggingface.co/spaces/BinaryCoder/clausr`."

Show the live Space page and the API endpoint.

## Demo 60 seconds

1. Run health:

   ```bash
   curl https://binarycoder-clausr.hf.space/health
   ```

   Say: "Green status means the environment is live and judge-runnable."

2. Run reset:

   ```bash
   curl -X POST "https://binarycoder-clausr.hf.space/reset?task_id=easy"
   ```

   Say: "The agent receives contract clauses, IDs, instructions, and the number of hidden contradictions."

3. Explain contradiction:

   "A contradiction is not a risky clause in isolation. In this demo, clause 01 can establish one operating rule while clause 04 can introduce an incompatible rule over the same obligation. Clausr rewards the agent only when it names the exact conflicting pair and avoids false positives."

4. Run step with a known correct easy finding:

   ```bash
   curl -X POST "https://binarycoder-clausr.hf.space/step?task_id=easy&contract_id=easy_001" \
     -H "Content-Type: application/json" \
     -d '{"findings":[{"clause_a_id":"clause_03","clause_b_id":"clause_07","explanation":"Both clauses govern confidentiality duration, but one states two years from disclosure while the other states thirty-six months from termination, creating incompatible protection periods."}]}'
   ```

   Say: "The deterministic grader returns score 1.0, reward 1.0, and zero false positives."

5. Show `training_curve_final.png`.

   Say: "Training reward improves from 0.15 to 0.89 over 50 GRPO steps, so the environment provides a real learning signal."

## Key talking points 30 seconds

1. "LexMind is the first incremental observation environment in the entire OpenEnv catalog: the contract grows one clause at a time and the agent must keep memory of everything already accepted."
2. "The Oracle is the world's first contract execution simulator as an RL environment: it treats a contract like a program and finds the business action that makes two clauses crash simultaneously."
3. "The grader has zero variance because it never calls an LLM; every reward is a deterministic set-intersection over structured clause IDs."

## Closing 30 seconds

"This matters because legal AI should not only summarize documents after risk is already embedded. It should train agents to prevent contradictions while contracts are drafted, reviewed, and executed. Clausr makes that capability measurable, trainable, and reproducible on OpenEnv. The call to action is simple: use the Space, run the Colab, and train better agents for legal reasoning before the next hidden conflict becomes a real-world dispute."

Target total time: under 2 minutes 30 seconds.
