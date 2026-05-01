#!/bin/bash
set -e
echo "=== PI Health Dashboard Deploy ==="
git pull
docker compose down
docker compose build --no-cache
docker compose up -d
sleep 5
docker compose ps
echo "=== Deploy complete ==="
