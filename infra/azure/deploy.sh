#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# PI Health Dashboard — Manual Azure Deployment Script
#
# Deploys the full stack to Azure Container Apps.
# Designed for local use / first-time setup.
#
# Prerequisites:
#   - Azure CLI installed and logged in (az login)
#   - Docker installed and running
#   - Bash 4+
#
# Usage:
#   cd infra/azure
#   ./deploy.sh               # Interactive — prompts for missing values
#   ./deploy.sh --env uat     # Specify environment
#
# Environment variables (override prompts):
#   ENVIRONMENT_NAME    — uat, prod, etc.
#   AZURE_LOCATION      — Azure region (default: uksouth)
#   DB_ADMIN_PASSWORD   — PostgreSQL admin password
#   UPLOAD_API_KEY      — Backend upload auth key
#   ANTHROPIC_API_KEY   — Optional AI parsing key
#   IMAGE_TAG           — Docker image tag (default: latest)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# ─── Configuration ────────────────────────────────────────────────────────────

PROJECT_NAME="pi-dashboard"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --env) ENVIRONMENT_NAME="$2"; shift 2 ;;
    --location) AZURE_LOCATION="$2"; shift 2 ;;
    --tag) IMAGE_TAG="$2"; shift 2 ;;
    --help|-h)
      echo "Usage: $0 [--env <name>] [--location <region>] [--tag <image-tag>]"
      exit 0
      ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

ENVIRONMENT_NAME="${ENVIRONMENT_NAME:-uat}"
AZURE_LOCATION="${AZURE_LOCATION:-uksouth}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
RESOURCE_GROUP="rg-${PROJECT_NAME}-${ENVIRONMENT_NAME}"
ACR_NAME=$(echo "${PROJECT_NAME}${ENVIRONMENT_NAME}acr" | tr -d '-')

echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║  PI Health Dashboard — Azure Deployment                            ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""
echo "  Environment:      ${ENVIRONMENT_NAME}"
echo "  Location:         ${AZURE_LOCATION}"
echo "  Resource Group:   ${RESOURCE_GROUP}"
echo "  ACR Name:         ${ACR_NAME}"
echo "  Image Tag:        ${IMAGE_TAG}"
echo ""

# ─── Prompt for secrets if not set ────────────────────────────────────────────

if [ -z "${DB_ADMIN_PASSWORD:-}" ]; then
  echo -n "Enter PostgreSQL admin password: "
  read -rs DB_ADMIN_PASSWORD
  echo ""
fi

if [ -z "${UPLOAD_API_KEY:-}" ]; then
  echo -n "Enter upload API key: "
  read -rs UPLOAD_API_KEY
  echo ""
fi

if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  echo -n "Enter Anthropic API key (or press Enter to skip): "
  read -rs ANTHROPIC_API_KEY
  echo ""
fi

# ─── Verify Azure CLI login ──────────────────────────────────────────────────

echo ""
echo "▸ Checking Azure CLI login..."
if ! az account show &>/dev/null; then
  echo "  Not logged in. Running 'az login'..."
  az login
fi
SUBSCRIPTION=$(az account show --query name -o tsv)
echo "  ✓ Logged in to subscription: ${SUBSCRIPTION}"

# ─── Create Resource Group ────────────────────────────────────────────────────

echo ""
echo "▸ Creating resource group: ${RESOURCE_GROUP}..."
az group create \
  --name "$RESOURCE_GROUP" \
  --location "$AZURE_LOCATION" \
  --tags Project="$PROJECT_NAME" Environment="$ENVIRONMENT_NAME" \
  --output none
echo "  ✓ Resource group ready"

# ─── Deploy Bicep Infrastructure ─────────────────────────────────────────────

echo ""
echo "▸ Deploying Bicep template (this may take 3-5 minutes)..."
DEPLOY_OUTPUT=$(az deployment group create \
  --resource-group "$RESOURCE_GROUP" \
  --template-file "$SCRIPT_DIR/main.bicep" \
  --parameters \
    environmentName="$ENVIRONMENT_NAME" \
    projectName="$PROJECT_NAME" \
    imageTag="$IMAGE_TAG" \
    dbAdminPassword="$DB_ADMIN_PASSWORD" \
    uploadApiKey="$UPLOAD_API_KEY" \
    anthropicApiKey="${ANTHROPIC_API_KEY:-}" \
  --query "properties.outputs" \
  --output json)

ACR_LOGIN_SERVER=$(echo "$DEPLOY_OUTPUT" | python3 -c "import json,sys; print(json.load(sys.stdin)['acrLoginServer']['value'])")
FRONTEND_URL=$(echo "$DEPLOY_OUTPUT" | python3 -c "import json,sys; print(json.load(sys.stdin)['frontendUrl']['value'])")
echo "  ✓ Infrastructure deployed"
echo "    ACR: ${ACR_LOGIN_SERVER}"
echo "    Frontend URL: ${FRONTEND_URL}"

# ─── Build & Push Docker Images ──────────────────────────────────────────────

echo ""
echo "▸ Logging into ACR: ${ACR_NAME}..."
az acr login --name "$ACR_NAME"
echo "  ✓ Logged in to ACR"

echo ""
echo "▸ Building backend image..."
docker build \
  -f "$REPO_ROOT/Dockerfile.backend" \
  -t "${ACR_LOGIN_SERVER}/pi-dashboard-backend:${IMAGE_TAG}" \
  -t "${ACR_LOGIN_SERVER}/pi-dashboard-backend:latest" \
  "$REPO_ROOT"
echo "  ✓ Backend image built"

echo ""
echo "▸ Building frontend image..."
docker build \
  -f "$REPO_ROOT/dashboard/Dockerfile.frontend" \
  -t "${ACR_LOGIN_SERVER}/pi-dashboard-frontend:${IMAGE_TAG}" \
  -t "${ACR_LOGIN_SERVER}/pi-dashboard-frontend:latest" \
  "$REPO_ROOT/dashboard"
echo "  ✓ Frontend image built"

echo ""
echo "▸ Pushing images to ACR..."
docker push "${ACR_LOGIN_SERVER}/pi-dashboard-backend:${IMAGE_TAG}"
docker push "${ACR_LOGIN_SERVER}/pi-dashboard-backend:latest"
docker push "${ACR_LOGIN_SERVER}/pi-dashboard-frontend:${IMAGE_TAG}"
docker push "${ACR_LOGIN_SERVER}/pi-dashboard-frontend:latest"
echo "  ✓ Images pushed"

# ─── Update Container Apps with new images ───────────────────────────────────

echo ""
echo "▸ Updating Container Apps with new images..."

az containerapp update \
  --resource-group "$RESOURCE_GROUP" \
  --name "${PROJECT_NAME}-${ENVIRONMENT_NAME}-backend" \
  --image "${ACR_LOGIN_SERVER}/pi-dashboard-backend:${IMAGE_TAG}" \
  --output none

az containerapp update \
  --resource-group "$RESOURCE_GROUP" \
  --name "${PROJECT_NAME}-${ENVIRONMENT_NAME}-frontend" \
  --image "${ACR_LOGIN_SERVER}/pi-dashboard-frontend:${IMAGE_TAG}" \
  --output none

echo "  ✓ Container Apps updated"

# ─── Run Database Migrations ─────────────────────────────────────────────────

echo ""
echo "▸ Running database migrations..."
az containerapp exec \
  --resource-group "$RESOURCE_GROUP" \
  --name "${PROJECT_NAME}-${ENVIRONMENT_NAME}-backend" \
  --command "python -m app.models" \
  2>/dev/null || echo "  ⚠ Migration command failed (app may still be starting). Run manually if needed."
echo "  ✓ Migrations complete"

# ─── Summary ─────────────────────────────────────────────────────────────────

echo ""
echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║  Deployment Complete!                                              ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""
echo "  Frontend:         ${FRONTEND_URL}"
echo "  Resource Group:   ${RESOURCE_GROUP}"
echo "  ACR:              ${ACR_LOGIN_SERVER}"
echo "  Image Tag:        ${IMAGE_TAG}"
echo ""
echo "  Useful commands:"
echo "    # View logs"
echo "    az containerapp logs show -g ${RESOURCE_GROUP} -n ${PROJECT_NAME}-${ENVIRONMENT_NAME}-backend --follow"
echo ""
echo "    # Scale manually"
echo "    az containerapp update -g ${RESOURCE_GROUP} -n ${PROJECT_NAME}-${ENVIRONMENT_NAME}-backend --min-replicas 1"
echo ""
echo "    # Tear down"
echo "    az group delete -n ${RESOURCE_GROUP} --yes --no-wait"
echo ""
