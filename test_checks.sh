echo "=== CHECK 1 ==="
curl -s https://binarycoder-clausr.hf.space/health
echo -e "\n=== CHECK 2 ==="
curl -s -X POST "https://binarycoder-clausr.hf.space/reset?task_id=easy" | head -c 50 && echo "..."
curl -s -X POST "https://binarycoder-clausr.hf.space/reset?task_id=medium" | head -c 50 && echo "..."
curl -s -X POST "https://binarycoder-clausr.hf.space/reset?task_id=hard" | head -c 50 && echo "..."
echo -e "\n=== CHECK 3 ==="
curl -s -X POST "https://binarycoder-clausr.hf.space/step" -H "Content-Type: application/json" -d '{"findings":[]}' | jq '{score: .score, done: .done}'
echo -e "\n=== CHECK 4 ==="
curl -s https://binarycoder-clausr.hf.space/state
echo -e "\n=== CHECK 5 & 6 ==="
source venv/bin/activate
python3 -c "
import yaml
y = yaml.safe_load(open('openenv.yaml'))
tasks = [t['id'] for t in y.get('tasks', [])]
assert 'easy' in tasks, 'MISSING easy task'
assert 'medium' in tasks, 'MISSING medium task'
assert 'hard' in tasks, 'MISSING hard task'
assert y.get('action_space'), 'MISSING action_space'
assert y.get('observation_space'), 'MISSING observation_space'
r = y.get('resources', {})
assert r.get('vcpu', 99) <= 2, 'vcpu exceeds limit'
assert r.get('memory_gb', 99) <= 8, 'memory exceeds limit'
for t in y['tasks']:
    assert t.get('min_score') == 0.0, f'{t[\"id\"]} min_score must be 0.0'
    assert t.get('max_score') == 1.0, f'{t[\"id\"]} max_score must be 1.0'
print('✅ openenv.yaml fully valid')
"
python3 -c "
from models import Clause, Finding, ContractAction, ContractObservation, ContractState
a = ContractAction(findings=[])
print('✅ ContractAction:', a.model_dump_json())
print('✅ ContractObservation fields:', list(ContractObservation.model_fields.keys()))
print('✅ ContractState fields:', list(ContractState.model_fields.keys()))
"
echo -e "\n=== CHECK 7 ==="
docker build -t clausr-final . 2>&1 | tail -10
echo -e "\n=== CHECK 8 ==="
docker run -d -p 7861:7860 --name clausr-test clausr-final
sleep 5
curl -s http://localhost:7861/health
docker stop clausr-test && docker rm clausr-test
echo -e "\n=== CHECK 9 ==="
python3 -c "
c = open('inference.py').read()
checks = {
  'Named inference.py in root': True,
  'Uses OpenAI client': 'from openai import OpenAI' in c,
  'API_BASE_URL env var': 'API_BASE_URL' in c,
  'MODEL_NAME env var': 'MODEL_NAME' in c,
  'HF_TOKEN env var': 'HF_TOKEN' in c,
  '[START] log format': '[START]' in c,
  '[STEP] log format': '[STEP]' in c,
  '[END] log format': '[END]' in c,
  'No hardcoded API keys': 'sk-' not in c,
  'API_BASE_URL has default': 'getenv(\"API_BASE_URL\",' in c or 'getenv(\"API_BASE_URL\", ' in c,
  'MODEL_NAME has default': 'getenv(\"MODEL_NAME\",' in c or 'getenv(\"MODEL_NAME\", ' in c,
  'HF_TOKEN no default': 'getenv(\"HF_TOKEN\", ' not in c,
}
all_ok = True
for k, v in checks.items():
    print(f'  {\"✅\" if v else \"❌\"} {k}')
    if not v: all_ok = False
print('✅ inference.py READY' if all_ok else '❌ FIX ABOVE BEFORE SUBMITTING')
"
echo -e "\n=== CHECK 12 ==="
python3 -c "
import yaml
y = yaml.safe_load(open('openenv.yaml'))
r = y.get('resources', {})
vcpu = r.get('vcpu', '?')
mem = r.get('memory_gb', '?')
print(f'vcpu={vcpu} (limit=2): {\"✅\" if int(vcpu)<=2 else \"❌\"}')
print(f'memory_gb={mem} (limit=8): {\"✅\" if int(mem)<=8 else \"❌\"}')
"
