#!/bin/bash
set -e
echo "=== PI Health Dashboard Deploy ==="

# Pull latest code
git pull

# Build new images in the background (no downtime yet)
echo "Building images..."
docker compose build

# Recreate containers with new images — Docker Compose handles
# graceful restart so traffic continues flowing during rollover
echo "Rolling out new containers..."
docker compose up -d --remove-orphans

# Wait for health checks to pass
echo "Waiting for services to become healthy..."
timeout=60
elapsed=0
while [ $elapsed -lt $timeout ]; do
  if docker compose ps | grep -q "unhealthy\|starting"; then
    sleep 3
    elapsed=$((elapsed + 3))
  else
    break
  fi
done

# Show final status
docker compose ps
echo ""

# Check for any unhealthy services
if docker compose ps | grep -q "unhealthy"; then
  echo "⚠ WARNING: Some services are unhealthy. Check logs with: docker compose logs"
  exit 1
fi

echo "=== Deploy complete ==="
