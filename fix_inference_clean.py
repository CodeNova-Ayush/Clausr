import re

with open("inference.py", "r") as f:
    code = f.read()

# Rate limit patch
rate_limit_patch = """
# ── Monkey-patch OpenAI client for rate/context limits ───────────────────────
_original_create = client.chat.completions.create

def _create_with_retry(*args, **kwargs):
    max_retries = 3
    for attempt in range(max_retries):
        try:
            return _original_create(*args, **kwargs)
        except Exception as e:
            err_str = str(e)
            if '429' in err_str or 'rate_limit_exceeded' in err_str:
                if attempt < max_retries - 1:
                    import time
                    print(f"Rate limited. Sleeping for 20s... (Attempt {attempt+1}/{max_retries})", flush=True)
                    time.sleep(20)
                else:
                    raise e
            elif '413' in err_str or 'too large' in err_str:
                print("Context too large. Truncating input...", flush=True)
                messages = kwargs.get('messages', [])
                for msg in messages:
                    if isinstance(msg.get('content', ''), str) and len(msg['content']) > 4000:
                        msg['content'] = msg['content'][:3000] + "\n...[TRUNCATED due to context limit]"
                if attempt < max_retries - 1:
                    import time
                    time.sleep(5)
                else:
                    raise e
            else:
                raise e
    return _original_create(*args, **kwargs)

client.chat.completions.create = _create_with_retry
"""
code = code.replace("client = OpenAI(\n    api_key=OPENAI_API_KEY or HF_TOKEN or \"dummy\",\n    base_url=API_BASE_URL,\n)", "client = OpenAI(\n    api_key=OPENAI_API_KEY or HF_TOKEN or \"dummy\",\n    base_url=API_BASE_URL,\n)\n" + rate_limit_patch)

# Change 1
normalize_code = """
def normalize_finding(finding_dict):
    if not isinstance(finding_dict, dict):
        return None
    clause_a_keys = ["clause_a_id", "clause_a", "clauseA", "clause_1", "first_clause", "clause_id_a", "clauase_a_id"]
    clause_b_keys = ["clause_b_id", "clause_b", "clauseB", "clause_2", "second_clause", "clause_id_b"]
    explanation_keys = ["explanation", "reason", "description", "conflict", "rationale", "details", "note"]
    
    clause_a_val = clause_b_val = explanation_val = None
    
    for k, v in finding_dict.items():
        k_lower = str(k).lower()
        if not clause_a_val and k_lower in clause_a_keys:
            clause_a_val = v
        elif not clause_b_val and k_lower in clause_b_keys:
            clause_b_val = v
        elif not explanation_val and k_lower in explanation_keys:
            explanation_val = v
            
    if clause_a_val and clause_b_val:
        return {
            "clause_a_id": str(clause_a_val),
            "clause_b_id": str(clause_b_val),
            "explanation": str(explanation_val or "")
        }
    return None

"""
code = code.replace("def extract_json_findings", normalize_code + "def extract_json_findings")

old_extract = """        cleaned_findings = []
        for f in findings:
            if isinstance(f, dict):
                clause_a = f.get("clause_a_id") or f.get("clause_a", "")
                clause_b = f.get("clause_b_id") or f.get("clause_b", "")
                explanation = f.get("explanation", "")
                if clause_a and clause_b:
                    cleaned_findings.append({
                        "clause_a_id": str(clause_a),
                        "clause_b_id": str(clause_b),
                        "explanation": str(explanation)
                    })"""

new_extract = """        cleaned_findings = []
        if isinstance(data, list):
            findings = data
        else:
            findings = data.get("findings", [])
        for f in findings:
            nf = normalize_finding(f)
            if nf:
                cleaned_findings.append(nf)"""
code = code.replace(old_extract, new_extract)

# Change 2
prompt_old = "If no contradictions found, include empty findings list."
prompt_new = 'If no contradictions found, include empty findings list.\nCRITICAL: You must respond with ONLY a JSON array. No explanation before or after. No markdown. No code blocks. The array must contain objects with exactly these three keys: clause_a_id, clause_b_id, explanation. Example format: [{"clause_a_id": "clause_01", "clause_b_id": "clause_07", "explanation": "both clauses address payment terms with different deadlines"}]\nUse the exact clause ID strings as they appear in the contract. Do not invent clause IDs.'
code = code.replace(prompt_old, prompt_new)

# Change 3
def inject_print(match):
    indent = match.group(1)
    return f'{indent}raw = (completion.choices[0].message.content or "").strip()\n{indent}if "easy" in task_id:\n{indent}    print("RAW LLM RESPONSE: " + raw, flush=True)'
code = re.sub(r'([ \t]*)raw = \(completion\.choices\[0\]\.message\.content or ""\)\.strip\(\)', inject_print, code)

# Change 4
code = re.sub(r'findings = json\.loads\(raw\)\.get\("findings", \[\]\)', 'parsed = json.loads(raw)\n                    raw_findings = parsed if isinstance(parsed, list) else parsed.get("findings", [])\n                    findings = [normalize_finding(f) for f in raw_findings if normalize_finding(f)]', code)
code = re.sub(r'action_payload = json\.loads\(raw\)\n\s+if "cross_findings" not in action_payload:\n\s+action_payload = \{"cross_findings": \[\]', 'parsed = json.loads(raw)\n            cf = parsed if isinstance(parsed, list) else parsed.get("cross_findings", [])\n            action_payload = {"cross_findings": [normalize_finding(f) for f in cf if normalize_finding(f)]', code)
code = re.sub(r'attr_data = json\.loads\(raw\)', 'parsed = json.loads(raw)\n            attr_data = parsed\n            nf = normalize_finding(parsed)\n            if nf:\n                attr_data["clause_a_id"] = nf["clause_a_id"]\n                attr_data["clause_b_id"] = nf["clause_b_id"]\n                if "explanation" not in attr_data:\n                    attr_data["explanation"] = nf["explanation"]', code)

# Tasks restriction
code = re.sub(r'TASKS = \[.*?\]', 'TASKS = ["easy"]', code, flags=re.DOTALL)

with open("inference.py", "w") as f:
    f.write(code)
print("done")
