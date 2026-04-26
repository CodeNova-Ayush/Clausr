#!/bin/bash
uvicorn server.app:app --port 7860 > server.log 2>&1 &
SERVER_PID=$!
sleep 3

echo "--- /health ---"
curl -s http://localhost:7860/health

echo -e "\n\n--- /reset?task_id=easy ---"
EASY_RESP=$(curl -s -X POST "http://localhost:7860/reset?task_id=easy")
echo "$EASY_RESP"

echo -e "\n\n--- /reset?task_id=medium ---"
curl -s -X POST "http://localhost:7860/reset?task_id=medium"

echo -e "\n\n--- /reset?task_id=hard ---"
curl -s -X POST "http://localhost:7860/reset?task_id=hard"

echo -e "\n\n--- /execution/reset?task_id=execution_easy ---"
curl -s -X POST "http://localhost:7860/execution/reset?task_id=execution_easy"

echo -e "\n\n--- /execution/reset?task_id=execution_medium ---"
curl -s -X POST "http://localhost:7860/execution/reset?task_id=execution_medium"

echo -e "\n\n--- /execution/reset?task_id=execution_hard ---"
curl -s -X POST "http://localhost:7860/execution/reset?task_id=execution_hard"

echo -e "\n\n--- /lexmind/reset?task_id=lexmind_easy ---"
curl -s -X POST "http://localhost:7860/lexmind/reset?task_id=lexmind_easy"

echo -e "\n\n--- /lexmind/reset?task_id=lexmind_medium ---"
curl -s -X POST "http://localhost:7860/lexmind/reset?task_id=lexmind_medium"

echo -e "\n\n--- /lexmind/reset?task_id=lexmind_hard ---"
curl -s -X POST "http://localhost:7860/lexmind/reset?task_id=lexmind_hard"

echo -e "\n\n--- /adversarial/reset?task_id=adversarial_easy ---"
curl -s -X POST "http://localhost:7860/adversarial/reset?task_id=adversarial_easy"

echo -e "\n\n--- /adversarial/reset?task_id=adversarial_medium ---"
curl -s -X POST "http://localhost:7860/adversarial/reset?task_id=adversarial_medium"

echo -e "\n\n--- /adversarial/reset?task_id=adversarial_hard ---"
curl -s -X POST "http://localhost:7860/adversarial/reset?task_id=adversarial_hard"

echo -e "\n\n--- /curriculum/register ---"
curl -s -X POST "http://localhost:7860/curriculum/register" -H "Content-Type: application/json" -d '{"agent_id": "test_agent_001"}'

echo -e "\n\n--- /constitution/reset?task_id=constitution_easy ---"
curl -s -X POST "http://localhost:7860/constitution/reset?task_id=constitution_easy"

echo -e "\n\n--- /constitution/reset?task_id=constitution_medium ---"
curl -s -X POST "http://localhost:7860/constitution/reset?task_id=constitution_medium"

echo -e "\n\n--- /constitution/reset?task_id=constitution_hard ---"
curl -s -X POST "http://localhost:7860/constitution/reset?task_id=constitution_hard"

echo -e "\n\n--- /fingerprint ---"
curl -s -X POST "http://localhost:7860/fingerprint" -H "Content-Type: application/json" -d '{"clause_texts": ["Payment is due within 30 days of invoice.", "All invoices must be settled within 14 days of receipt.", "Either party may terminate upon 60 days written notice.", "Termination requires 90 days advance notification."]}'

echo -e "\n\n--- /federated/reset?task_id=federated_easy ---"
curl -s -X POST "http://localhost:7860/federated/reset?task_id=federated_easy"

echo -e "\n\n--- /federated/reset?task_id=federated_medium ---"
curl -s -X POST "http://localhost:7860/federated/reset?task_id=federated_medium"

echo -e "\n\n--- /federated/reset?task_id=federated_hard ---"
curl -s -X POST "http://localhost:7860/federated/reset?task_id=federated_hard"

echo -e "\n\n--- /timemachine/reset?task_id=timemachine_easy ---"
curl -s -X POST "http://localhost:7860/timemachine/reset?task_id=timemachine_easy"

echo -e "\n\n--- /timemachine/reset?task_id=timemachine_medium ---"
curl -s -X POST "http://localhost:7860/timemachine/reset?task_id=timemachine_medium"

echo -e "\n\n--- /timemachine/reset?task_id=timemachine_hard ---"
curl -s -X POST "http://localhost:7860/timemachine/reset?task_id=timemachine_hard"

echo -e "\n\n--- STEP 3: STEP ENDPOINT TEST ---"
# Extract episode_id and clause_ids
EPISODE_ID=$(echo "$EASY_RESP" | grep -o '"episode_id":"[^"]*' | cut -d'"' -f4)
CLAUSE_A=$(echo "$EASY_RESP" | grep -o '"id":"[^"]*' | head -n1 | cut -d'"' -f4)
CLAUSE_B=$(echo "$EASY_RESP" | grep -o '"id":"[^"]*' | head -n2 | tail -n1 | cut -d'"' -f4)

curl -s -X POST "http://localhost:7860/step" \
  -H "Content-Type: application/json" \
  -d "{\"episode_id\": \"$EPISODE_ID\", \"findings\": [{\"clause_a_id\": \"$CLAUSE_A\", \"clause_b_id\": \"$CLAUSE_B\", \"explanation\": \"test finding\"}]}"

kill $SERVER_PID
