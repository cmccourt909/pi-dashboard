#!/usr/bin/env pwsh
$ErrorActionPreference = "Stop"
Write-Host "=== PI Health Dashboard Deploy ==="

# Pull latest code
git pull

# Build new images in the background (no downtime yet)
Write-Host "Building images..."
docker compose build

# Recreate containers with new images — Docker Compose handles graceful restart
Write-Host "Rolling out new containers..."
docker compose up -d --remove-orphans

# Wait for health checks to pass
Write-Host "Waiting for services to become healthy..."
$timeout = 60
$elapsed = 0
while ($elapsed -lt $timeout) {
    $status = docker compose ps --format json | ConvertFrom-Json | Select-Object -ExpandProperty Health -ErrorAction SilentlyContinue
    $unhealthy = $status | Where-Object { $_ -match "unhealthy|starting" }
    if ($unhealthy) {
        Start-Sleep -Seconds 3
        $elapsed += 3
    } else {
        break
    }
}

# Show final status
docker compose ps
Write-Host ""

# Check for any unhealthy services
$healthOutput = docker compose ps --format json | ConvertFrom-Json | Select-Object -ExpandProperty Health -ErrorAction SilentlyContinue
if ($healthOutput -contains "unhealthy") {
    Write-Warning "Some services are unhealthy. Check logs with: docker compose logs"
    exit 1
}

Write-Host "=== Deploy complete ==="
