with open("inference.py", "r") as f:
    code = f.read()

# Replace the TASKS list with just "easy"
import re
code = re.sub(r'TASKS = \[.*?\]', 'TASKS = ["easy"]', code, flags=re.DOTALL)

with open("inference.py", "w") as f:
    f.write(code)
