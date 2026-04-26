import re
with open("inference.py", "r") as f:
    code = f.read()

# CHANGE 1: Insert normalize_finding function before extract_json_findings
normalize_code = """
def normalize_finding(finding_dict):
    if not isinstance(finding_dict, dict):
        return None
    clause_a_keys = ["clause_a_id", "clause_a", "clauseA", "clause_1", "first_clause", "clause_id_a", "clauase_a_id"]
    clause_b_keys = ["clause_b_id", "clause_b", "clauseB", "clause_2", "second_clause", "clause_id_b"]
    explanation_keys = ["explanation", "reason", "description", "conflict", "rationale", "details", "note"]
    
    clause_a_val = clause_b_val = explanation_val = None
    
    for k, v in finding_dict.items():
        k_lower = k.lower()
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

# Fix extract_json_findings to use normalize_finding
extract_logic_old = """        cleaned_findings = []
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

extract_logic_new = """        cleaned_findings = []
        if isinstance(data, list):
            findings = data
        else:
            findings = data.get("findings", [])
        for f in findings:
            nf = normalize_finding(f)
            if nf:
                cleaned_findings.append(nf)"""

code = code.replace(extract_logic_old, extract_logic_new)

# CHANGE 2: Prompt update
prompt_old = "If no contradictions found, include empty findings list."
prompt_new = 'If no contradictions found, include empty findings list.\nCRITICAL: You must respond with ONLY a JSON array. No explanation before or after. No markdown. No code blocks. The array must contain objects with exactly these three keys: clause_a_id, clause_b_id, explanation. Example format: [{"clause_a_id": "clause_01", "clause_b_id": "clause_07", "explanation": "both clauses address payment terms with different deadlines"}]\nUse the exact clause ID strings as they appear in the contract. Do not invent clause IDs.'
code = code.replace(prompt_old, prompt_new)

# CHANGE 3: Add debug logging in run_episode
# Right after raw = (completion.choices[0].message.content or "").strip()
raw_assign = 'raw = (completion.choices[0].message.content or "").strip()'
debug_log = 'raw = (completion.choices[0].message.content or "").strip()\n            if task_id == "easy" or task_id == "execution_easy" or task_id == "lexmind_easy":\n                print("RAW LLM RESPONSE: " + raw, flush=True)'
code = code.replace(raw_assign, debug_log)

# Change 4: Apply to all environments
# For adversarial auditor:
adv_auditor_old = """                    findings = json.loads(raw).get("findings", [])
                except Exception:
                    findings = []
                action_payload = {"findings": findings}"""

adv_auditor_new = """                    parsed = json.loads(raw)
                    raw_findings = parsed if isinstance(parsed, list) else parsed.get("findings", [])
                    findings = [normalize_finding(f) for f in raw_findings if normalize_finding(f)]
                except Exception:
                    findings = []
                action_payload = {"findings": findings}"""
code = code.replace(adv_auditor_old, adv_auditor_new)

# For constitution: cross_findings
const_old = """            action_payload = json.loads(raw)
            if "cross_findings" not in action_payload:
                action_payload = {"cross_findings": [], "cascade_chains": []}
        except Exception:"""

const_new = """            parsed = json.loads(raw)
            cf = parsed if isinstance(parsed, list) else parsed.get("cross_findings", [])
            action_payload = {
                "cross_findings": [normalize_finding(f) for f in cf if normalize_finding(f)],
                "cascade_chains": parsed.get("cascade_chains", []) if isinstance(parsed, dict) else []
            }
        except Exception:"""
code = code.replace(const_old, const_new)

# For timemachine: attribution
tm_old = """        try:
            attr_data = json.loads(raw)
        except Exception:
            attr_data = {"""

tm_new = """        try:
            parsed = json.loads(raw)
            attr_data = parsed
            nf = normalize_finding(parsed)
            if nf:
                attr_data["clause_a_id"] = nf["clause_a_id"]
                attr_data["clause_b_id"] = nf["clause_b_id"]
                if "explanation" not in attr_data:
                    attr_data["explanation"] = nf["explanation"]
        except Exception:
            attr_data = {"""
code = code.replace(tm_old, tm_new)

with open("inference.py", "w") as f:
    f.write(code)
print("Updated inference.py successfully.")
