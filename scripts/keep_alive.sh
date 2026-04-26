#!/bin/bash
echo "Starting keep-alive for HF Space"
while true; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    https://binarycoder-clausr.hf.space/health)
  echo "$(date): HF Space status = $STATUS"
  sleep 300
done
