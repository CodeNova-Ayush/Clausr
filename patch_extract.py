with open("inference.py", "r") as f:
    code = f.read()

import re
# Find the extract_json_findings function
func_pattern = r'def extract_json_findings\(raw_text: str\) -> List\[Dict\]:.*?return \[\]'
new_func = """def extract_json_findings(raw_text: str) -> List[Dict]:
    try:
        clean_str = raw_text.replace("```json", "").replace("```", "").strip()
        # Try array first
        match = re.search(r'\[.*\]', clean_str.replace('\\n', ' '), re.DOTALL)
        if match:
            clean_str = match.group(0)
        else:
            match = re.search(r'\\{.*\\}', clean_str.replace('\\n', ' '), re.DOTALL)
            if match:
                clean_str = match.group(0)

        data = json.loads(clean_str)
        if isinstance(data, list):
            findings = data
        else:
            findings = data.get("findings", [data])
        
        cleaned_findings = []
        for f in findings:
            nf = normalize_finding(f)
            if nf:
                cleaned_findings.append(nf)
        return cleaned_findings
    except Exception as e:
        print(f"JSON parsing failed: {e}", flush=True)
        return []"""

code = re.sub(func_pattern, new_func, code, flags=re.DOTALL)

with open("inference.py", "w") as f:
    f.write(code)
