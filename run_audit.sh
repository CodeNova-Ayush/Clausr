#!/bin/bash
source venv/bin/activate
uvicorn server.app:app --port 7860 > server_audit.log 2>&1 &
SERVER_PID=$!
sleep 3
export OPENAI_API_KEY="" # missing
python3 inference.py > inference_run.log 2>&1
kill $SERVER_PID
