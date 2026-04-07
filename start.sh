#!/bin/bash
npx tsx api-server.ts &
API_PID=$!

# Wait for API server to be ready
for i in $(seq 1 20); do
  if curl -s http://localhost:5001/api/leaderboard > /dev/null 2>&1; then
    break
  fi
  sleep 0.5
done

npx vite

kill $API_PID 2>/dev/null
