#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# PI Health Dashboard — Azure Service Principal Setup
#
# Creates a service principal for GitHub Actions deployment and outputs
# the credentials needed for GitHub Secrets.
#
# Prerequisites:
#   - Azure CLI installed (https://docs.microsoft.com/en-us/cli/azure/install-azure-cli)
#   - Logged in to Azure (az login)
#   - Owner or User Access Administrator role on the target subscription
#
# Usage:
#   cd infra/azure
#   ./setup-credentials.sh
#   ./setup-credentials.sh --subscription <subscription-id-or-name>
#   ./setup-credentials.sh --name <custom-sp-name>
#
# The script will output the four values you need to add as GitHub Secrets.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ─── Defaults ─────────────────────────────────────────────────────────────────

SP_NAME="sp-pi-dashboard-deploy"
SUBSCRIPTION=""
ROLE="Contributor"

# ─── Parse Arguments ──────────────────────────────────────────────────────────

while [[ $# -gt 0 ]]; do
  case $1 in
    --subscription|-s) SUBSCRIPTION="$2"; shift 2 ;;
    --name|-n) SP_NAME="$2"; shift 2 ;;
    --role|-r) ROLE="$2"; shift 2 ;;
    --help|-h)
      echo "Usage: $0 [--subscription <id-or-name>] [--name <sp-name>] [--role <role>]"
      echo ""
      echo "Options:"
      echo "  --subscription, -s   Azure subscription ID or name (default: current)"
      echo "  --name, -n           Service principal display name (default: sp-pi-dashboard-deploy)"
      echo "  --role, -r           Role to assign (default: Contributor)"
      echo ""
      echo "Example:"
      echo "  ./setup-credentials.sh --subscription 'My Subscription' --name sp-pi-dashboard-uat"
      exit 0
      ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# ─── Pre-flight Checks ───────────────────────────────────────────────────────

echo ""
echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║  Azure Service Principal Setup for GitHub Actions                  ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""

# Check Azure CLI is installed
if ! command -v az &>/dev/null; then
  echo "❌ Azure CLI not found. Install it from:"
  echo "   https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
  exit 1
fi

# Check Azure CLI is logged in
echo "▸ Checking Azure CLI login..."
if ! az account show &>/dev/null 2>&1; then
  echo "  Not logged in. Running 'az login'..."
  az login
fi

# Get or set the subscription
if [ -n "$SUBSCRIPTION" ]; then
  echo "▸ Setting subscription to: ${SUBSCRIPTION}"
  az account set --subscription "$SUBSCRIPTION"
fi

# Retrieve current subscription details
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
SUBSCRIPTION_NAME=$(az account show --query name -o tsv)
TENANT_ID=$(az account show --query tenantId -o tsv)

echo "  ✓ Logged in"
echo "    Subscription: ${SUBSCRIPTION_NAME}"
echo "    Subscription ID: ${SUBSCRIPTION_ID}"
echo "    Tenant ID: ${TENANT_ID}"
echo ""

# ─── Check if SP already exists ──────────────────────────────────────────────

echo "▸ Checking if service principal '${SP_NAME}' already exists..."
EXISTING_APP_ID=$(az ad app list --display-name "$SP_NAME" --query "[0].appId" -o tsv 2>/dev/null || echo "")

if [ -n "$EXISTING_APP_ID" ] && [ "$EXISTING_APP_ID" != "None" ]; then
  echo "  ⚠  Service principal '${SP_NAME}' already exists (appId: ${EXISTING_APP_ID})"
  echo ""
  echo -n "  Do you want to reset its credentials? (y/N): "
  read -r RESET_ANSWER
  if [[ "$RESET_ANSWER" =~ ^[Yy]$ ]]; then
    echo "  Resetting credentials..."
    SP_OUTPUT=$(az ad app credential reset --id "$EXISTING_APP_ID" --query "{password: password}" -o json)
    CLIENT_SECRET=$(echo "$SP_OUTPUT" | python3 -c "import json,sys; print(json.load(sys.stdin)['password'])")
    CLIENT_ID="$EXISTING_APP_ID"
  else
    echo "  Aborting. Use --name to specify a different name."
    exit 0
  fi
else
  # ─── Create Service Principal ───────────────────────────────────────────────
  echo "  Not found. Creating new service principal..."
  echo ""
  echo "▸ Creating service principal '${SP_NAME}' with ${ROLE} role..."

  SP_OUTPUT=$(az ad sp create-for-rbac \
    --name "$SP_NAME" \
    --role "$ROLE" \
    --scopes "/subscriptions/${SUBSCRIPTION_ID}" \
    --query "{appId: appId, password: password, tenant: tenant}" \
    -o json)

  CLIENT_ID=$(echo "$SP_OUTPUT" | python3 -c "import json,sys; print(json.load(sys.stdin)['appId'])")
  CLIENT_SECRET=$(echo "$SP_OUTPUT" | python3 -c "import json,sys; print(json.load(sys.stdin)['password'])")

  echo "  ✓ Service principal created"
fi

# ─── Output Credentials ──────────────────────────────────────────────────────

echo ""
echo ""
echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║  GitHub Secrets — Add these to your repository                     ║"
echo "║  Settings → Secrets and variables → Actions → New repository secret║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""
echo "┌────────────────────────┬──────────────────────────────────────────────┐"
printf "│ %-22s │ %-44s │\n" "Secret Name" "Value"
echo "├────────────────────────┼──────────────────────────────────────────────┤"
printf "│ %-22s │ %-44s │\n" "AZURE_CLIENT_ID" "$CLIENT_ID"
printf "│ %-22s │ %-44s │\n" "AZURE_TENANT_ID" "$TENANT_ID"
printf "│ %-22s │ %-44s │\n" "AZURE_SUBSCRIPTION_ID" "$SUBSCRIPTION_ID"
printf "│ %-22s │ %-44s │\n" "AZURE_CLIENT_SECRET" "$CLIENT_SECRET"
echo "└────────────────────────┴──────────────────────────────────────────────┘"
echo ""
echo ""
echo "┌──────────────────────────────────────────────────────────────────────┐"
echo "│  ⚠  IMPORTANT: Copy AZURE_CLIENT_SECRET now!                        │"
echo "│  It cannot be retrieved again after this session.                    │"
echo "└──────────────────────────────────────────────────────────────────────┘"
echo ""
echo ""
echo "  Quick copy (for GitHub CLI users):"
echo ""
echo "    gh secret set AZURE_CLIENT_ID --body '${CLIENT_ID}'"
echo "    gh secret set AZURE_TENANT_ID --body '${TENANT_ID}'"
echo "    gh secret set AZURE_SUBSCRIPTION_ID --body '${SUBSCRIPTION_ID}'"
echo "    gh secret set AZURE_CLIENT_SECRET --body '${CLIENT_SECRET}'"
echo ""
echo ""
echo "  Don't forget to also add these application secrets:"
echo ""
echo "    gh secret set DB_ADMIN_PASSWORD --body '<your-db-password>'"
echo "    gh secret set UPLOAD_API_KEY --body '<your-upload-key>'"
echo "    gh secret set ANTHROPIC_API_KEY --body '<your-anthropic-key>'  # optional"
echo ""
echo ""
echo "  And these repository variables (Settings → Variables → Actions):"
echo ""
echo "    AZURE_RESOURCE_GROUP = rg-pi-dashboard-uat"
echo "    AZURE_LOCATION       = uksouth"
echo "    ENVIRONMENT_NAME     = uat"
echo ""
