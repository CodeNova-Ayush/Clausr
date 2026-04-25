import sys
import subprocess
import os

def install_deps():
    print("Installing dependencies...")
    # We install the requested libraries, plus a few typical dependencies like matplotlib and pandas for the script.
    subprocess.check_call([
        sys.executable, "-m", "pip", "install", "-q", 
        "trl", "transformers", "datasets", "peft", "unsloth", 
        "matplotlib", "requests", "pandas", "tensorboard", "accelerate"
    ])

if __name__ == "__main__":
    if "--skip-install" not in sys.argv:
        install_deps()
    
    import requests
    import json
    import torch
    import matplotlib.pyplot as plt
    import pandas as pd
    from datasets import Dataset
    from transformers import AutoTokenizer, AutoModelForCausalLM
    from trl import GRPOTrainer, GRPOConfig

    print("Loading model and tokenizer...")
    # 2. Loads Qwen/Qwen2.5-0.5B-Instruct
    model_id = "Qwen/Qwen2.5-0.5B-Instruct"
    
    try:
        from unsloth import FastLanguageModel
        max_seq_length = 512
        model, tokenizer = FastLanguageModel.from_pretrained(
            model_name = model_id,
            max_seq_length = max_seq_length,
            dtype = None,
            load_in_4bit = True,
        )
        model = FastLanguageModel.get_peft_model(
            model,
            r = 16,
            target_modules = ["q_proj", "k_proj", "v_proj", "o_proj",
                              "gate_proj", "up_proj", "down_proj"],
            lora_alpha = 16,
            lora_dropout = 0,
            bias = "none",
            use_gradient_checkpointing = "unsloth",
            random_state = 3407,
            use_rslora = False,
            loftq_config = None,
        )
    except ImportError:
        print("Unsloth not found or failed to load, falling back to standard Transformers/PEFT...")
        from peft import LoraConfig, get_peft_model
        model = AutoModelForCausalLM.from_pretrained(
            model_id,
            torch_dtype=torch.bfloat16,
            device_map="auto"
        )
        tokenizer = AutoTokenizer.from_pretrained(model_id)
        peft_config = LoraConfig(
            r=16,
            lora_alpha=32,
            target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
            lora_dropout=0.05,
            bias="none",
            task_type="CAUSAL_LM"
        )
        model = get_peft_model(model, peft_config)

    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    # 3. Defines a custom reward function
    def clausr_reward(prompts, completions, **kwargs):
        rewards = []
        for prompt, completion in zip(prompts, completions):
            # Extract actual text from completion
            # In TRL GRPOTrainer, completions can be a list of strings or list of message dicts depending on setup
            text = completion[0]['content'] if isinstance(completion, list) else completion
            
            try:
                # Call http://localhost:7860/reset?task_id=easy
                requests.post("http://localhost:7860/reset?task_id=easy", timeout=2)
                
                # Sends the model's completion to http://localhost:7860/step
                resp = requests.post("http://localhost:7860/step", json={"action": text}, timeout=5)
                if resp.status_code == 200:
                    data = resp.json()
                    # Returns the score from the response as the reward (float 0.0 to 1.0)
                    score = float(data.get("reward", data.get("score", 0.0)))
                else:
                    score = 0.0
            except Exception as e:
                # If server is not running or error occurs, reward is 0
                score = 0.0
            rewards.append(score)
        return rewards

    # 4. Creates a small dataset of 50 prompts
    def create_dataset():
        sample_clauses = [
            "1: The vendor provides services on Monday. 2: The vendor shall not work on Mondays.",
            "1: Payment is due in 30 days. 2: Payment must be completed immediately.",
            "1: Confidentiality lasts for 2 years. 2: Confidentiality is perpetual.",
            "1: Either party can terminate with 30 days notice. 2: Contract is non-terminable.",
            "1: Disputes settled in NY. 2: All litigation must occur in CA."
        ]
        
        # Repeat to make 50 prompts
        clauses_list = sample_clauses * 10
        
        data = []
        for clauses in clauses_list:
            prompt_text = (
                f"You are a legal contract analyst. Here are the clauses: {clauses}. "
                "Find all contradictions. Respond with JSON: "
                '{"findings": [{"clause_a_id", "clause_b_id", "explanation"}]}'
            )
            data.append({"prompt": [{"role": "user", "content": prompt_text}]})
            
        return Dataset.from_list(data)

    dataset = create_dataset()

    # Helper function for before/after comparison
    def evaluate(model, tokenizer, num_samples=5):
        print(f"Evaluating {num_samples} samples...")
        eval_prompts = dataset["prompt"][:num_samples]
        
        total_score = 0.0
        for p in eval_prompts:
            text = tokenizer.apply_chat_template(p, tokenize=False, add_generation_prompt=True)
            inputs = tokenizer(text, return_tensors="pt").to(model.device)
            with torch.no_grad():
                outputs = model.generate(**inputs, max_new_tokens=256, pad_token_id=tokenizer.pad_token_id)
            completion = tokenizer.decode(outputs[0][inputs.input_ids.shape[1]:], skip_special_tokens=True)
            
            try:
                requests.post("http://localhost:7860/reset?task_id=easy", timeout=2)
                resp = requests.post("http://localhost:7860/step", json={"action": completion}, timeout=5)
                if resp.status_code == 200:
                    data = resp.json()
                    score = float(data.get("reward", data.get("score", 0.0)))
                else:
                    score = 0.0
            except:
                score = 0.0
            total_score += score
            
        return total_score / num_samples

    print("\n--- Computing BEFORE Score ---")
    before_score = evaluate(model, tokenizer)
    print(f"Before Score: {before_score:.4f}")

    # 5. Uses GRPOTrainer from TRL
    training_args = GRPOConfig(
        output_dir="clausr-grpo-output",
        num_train_epochs=1,
        max_completion_length=256,
        num_generations=4,
        report_to="tensorboard",
        logging_steps=1,
        per_device_train_batch_size=1,
        gradient_accumulation_steps=4,
        remove_unused_columns=False,
    )

    trainer = GRPOTrainer(
        model=model,
        reward_funcs=[clausr_reward],
        args=training_args,
        train_dataset=dataset,
    )

    print("\n--- Starting Training ---")
    trainer.train()

    print("\n--- Computing AFTER Score ---")
    after_score = evaluate(model, tokenizer)
    print(f"After Score: {after_score:.4f}")

    # 6. Saves reward curve plot as plot_training_reward.png
    history = trainer.state.log_history
    rewards = []
    steps = []
    for log in history:
        # TRL GRPO logs rewards typically under keys like 'reward' or 'reward/clausr_reward'
        reward_keys = [k for k in log.keys() if 'reward' in k.lower() and isinstance(log[k], (int, float))]
        if reward_keys:
            # take the first matching key
            rewards.append(log[reward_keys[0]])
            steps.append(log.get('step', len(steps)))

    if rewards:
        plt.figure(figsize=(10, 6))
        plt.plot(steps, rewards, marker='o', linestyle='-', color='b')
        plt.title('Training Reward over Steps')
        plt.xlabel('Step')
        plt.ylabel('Reward')
        plt.grid(True)
        plt.savefig('plot_training_reward.png')
        print("\nSaved reward curve to plot_training_reward.png")
    else:
        print("\nNo reward logs found to plot.")

    # 7. Prints before score and after score comparison table
    print("\n" + "="*40)
    print("      PERFORMANCE COMPARISON      ")
    print("="*40)
    df = pd.DataFrame({
        "Metric": ["Average Reward"],
        "Before Training": [f"{before_score:.4f}"],
        "After Training": [f"{after_score:.4f}"]
    })
    print(df.to_string(index=False))
    print("="*40 + "\n")
