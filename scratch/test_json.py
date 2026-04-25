import re
import json

raw_text = """Here is the JSON:
[
  {"clause_a_id": "clause_01", "clause_b_id": "clause_02", "explanation": "test"}
]
Some trailing text."""

clean_str = raw_text.replace("```json", "").replace("```", "").strip()
match = re.search(r'\[.*\]', clean_str.replace('\n', ' '), re.DOTALL)
if match:
    clean_str = match.group(0)
    print(f"Matched: '{clean_str}'")

try:
    data = json.loads(clean_str)
    print("Success")
except Exception as e:
    print(f"Failed: {e}")
