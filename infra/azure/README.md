# PI Health Dashboard — Azure Infrastructure

Deploy the PI Health Dashboard to **Azure Container Apps** using Bicep infrastructure-as-code.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  Azure Resource Group (rg-pi-dashboard-uat)                         │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Container Apps Environment (Consumption Plan)                │  │
│  │                                                               │  │
│  │  ┌─────────────────────┐      ┌────────────────────────────┐ │  │
│  │  │  Frontend (Next.js) │─────▶│  Backend (FastAPI)         │ │  │
│  │  │  External ingress   │      │  Internal ingress          │ │  │
│  │  │  :3000              │      │  :8000                     │ │  │
│  │  │  0–2 replicas       │      │  0–2 replicas              │ │  │
│  │  └─────────────────────┘      └─────────────┬──────────────┘ │  │
│  │         ▲                                    │                │  │
│  └─────────┼────────────────────────────────────┼────────────────┘  │
│            │                                    ▼                    │
│  ┌─────────┴─────────┐              ┌───────────────────────────┐  │
│  │  ACR (Basic)      │              │  PostgreSQL Flexible      │  │
│  │  Docker images    │              │  Server (B1ms)            │  │
│  └───────────────────┘              │  1 vCPU / 2 GiB / 32 GB  │  │
│                                     └───────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Log Analytics Workspace (30-day retention)                   │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## Estimated Monthly Cost (UAT)

| Resource | SKU | Cost |
|----------|-----|------|
| Container Apps (frontend + backend) | Consumption, scale-to-zero | ~$0–5 (mostly free grant) |
| PostgreSQL Flexible Server | Burstable B1ms | ~$15–25 |
| Container Registry | Basic | ~$5 |
| Log Analytics | 30-day, PerGB | ~$0–2 |
| **Total** | | **~$20–35/month** |

With scale-to-zero and light UAT usage, compute costs are typically covered by the Azure free grant (180,000 vCPU-seconds + 360,000 GiB-seconds per subscription per month).

## Prerequisites

- [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli) v2.50+
- [Docker](https://docs.docker.com/get-docker/) (for local builds)
- An Azure subscription with Contributor access
- A service principal for CI/CD (see [Setup](#cicd-setup))

## Files

```
infra/azure/
├── main.bicep                  # Main infrastructure template
├── parameters.uat.bicepparam   # UAT environment parameters
├── deploy.sh                   # Manual deployment script
└── README.md                   # This file

.github/workflows/
└── deploy-azure.yml            # GitHub Actions CI/CD pipeline

docker-compose.azure-dev.yml    # Local dev with PostgreSQL (matches Azure)
```

## Quick Start

### First-Time Deployment (Manual)

```bash
# 1. Login to Azure
az login

# 2. Run the deployment script
cd infra/azure
./deploy.sh --env uat --location uksouth

# The script will:
#   - Prompt for secrets (DB password, upload key)
#   - Create the resource group
#   - Deploy all Azure resources via Bicep
#   - Build & push Docker images to ACR
#   - Update the Container Apps
#   - Run database migrations
```

### Local Development (with PostgreSQL)

To develop locally using PostgreSQL (matching the Azure environment):

```bash
# Start all services with PostgreSQL
docker compose -f docker-compose.azure-dev.yml up -d

# Frontend: http://localhost:3000
# Backend:  http://localhost:8000
# Postgres: localhost:5432 (user: pidashboardadmin, pass: localdev123)

# Run migrations
docker compose -f docker-compose.azure-dev.yml exec backend python -m app.models

# Tear down (remove data)
docker compose -f docker-compose.azure-dev.yml down -v
```

## CI/CD Setup

### 1. Create a Service Principal

```bash
# Create SP with Contributor role on the subscription (or scope to resource group)
az ad sp create-for-rbac \
  --name "sp-pi-dashboard-deploy" \
  --role Contributor \
  --scopes /subscriptions/<SUBSCRIPTION_ID> \
  --sdk-auth

# Copy the JSON output — this is your AZURE_CREDENTIALS secret
```

### 2. Configure GitHub Secrets

Go to **Settings → Secrets and variables → Actions** and add:

| Secret | Description |
|--------|-------------|
| `AZURE_CREDENTIALS` | Service principal JSON from step 1 |
| `AZURE_SUBSCRIPTION_ID` | Your Azure subscription ID |
| `DB_ADMIN_PASSWORD` | PostgreSQL admin password (use a strong password) |
| `UPLOAD_API_KEY` | Secret key for the `/api/upload` endpoint |
| `ANTHROPIC_API_KEY` | _(Optional)_ For AI-powered sync document parsing |

### 3. Configure GitHub Variables

Go to **Settings → Variables → Actions** and add:

| Variable | Value |
|----------|-------|
| `AZURE_RESOURCE_GROUP` | `rg-pi-dashboard-uat` |
| `AZURE_LOCATION` | `uksouth` |
| `ENVIRONMENT_NAME` | `uat` |

### 4. Trigger Deployment

Push to `main` or use **Actions → Deploy to Azure → Run workflow**.

## Parameters Reference

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `environmentName` | string | — | Environment name (`uat`, `prod`) |
| `location` | string | Resource group location | Azure region |
| `projectName` | string | `pi-dashboard` | Resource name prefix |
| `dbAdminLogin` | string | `pidashboardadmin` | PostgreSQL admin username |
| `dbAdminPassword` | secure | — | PostgreSQL admin password |
| `uploadApiKey` | secure | — | Backend upload auth key |
| `anthropicApiKey` | secure | `''` | Anthropic API key (optional) |
| `corsOrigins` | string | `''` | Extra CORS origins (auto-includes frontend URL) |
| `imageTag` | string | `latest` | Docker image tag |
| `backendMinReplicas` | int | `0` | Min backend replicas (0 = scale-to-zero) |
| `backendMaxReplicas` | int | `3` | Max backend replicas |
| `frontendMinReplicas` | int | `0` | Min frontend replicas (0 = scale-to-zero) |
| `frontendMaxReplicas` | int | `3` | Max frontend replicas |

## Operations

### View Logs

```bash
# Backend logs (streaming)
az containerapp logs show \
  --resource-group rg-pi-dashboard-uat \
  --name pi-dashboard-uat-backend \
  --follow

# Frontend logs
az containerapp logs show \
  --resource-group rg-pi-dashboard-uat \
  --name pi-dashboard-uat-frontend \
  --follow
```

### Scale Manually

```bash
# Keep backend always running (avoid cold starts)
az containerapp update \
  --resource-group rg-pi-dashboard-uat \
  --name pi-dashboard-uat-backend \
  --min-replicas 1

# Scale back to zero
az containerapp update \
  --resource-group rg-pi-dashboard-uat \
  --name pi-dashboard-uat-backend \
  --min-replicas 0
```

### Connect to Database

```bash
# Get the server FQDN
az postgres flexible-server show \
  --resource-group rg-pi-dashboard-uat \
  --name pi-dashboard-uat-db \
  --query fullyQualifiedDomainName -o tsv

# Connect (requires firewall rule for your IP)
az postgres flexible-server firewall-rule create \
  --resource-group rg-pi-dashboard-uat \
  --name pi-dashboard-uat-db \
  --rule-name AllowMyIP \
  --start-ip-address <YOUR_IP> \
  --end-ip-address <YOUR_IP>

psql "host=<FQDN> dbname=pidashboard user=pidashboardadmin sslmode=require"
```

### Restart Apps

```bash
az containerapp revision restart \
  --resource-group rg-pi-dashboard-uat \
  --app pi-dashboard-uat-backend

az containerapp revision restart \
  --resource-group rg-pi-dashboard-uat \
  --app pi-dashboard-uat-frontend
```

### Tear Down

```bash
# Delete everything (irreversible!)
az group delete --name rg-pi-dashboard-uat --yes --no-wait
```

## Differences from AWS Deployment

| Aspect | AWS (current) | Azure (new) |
|--------|---------------|-------------|
| Compute | Single EC2 + Docker Compose | Container Apps (serverless) |
| Database | SQLite (file on disk) | PostgreSQL Flexible Server |
| Registry | Docker Hub / ECR | Azure Container Registry |
| Proxy | nginx container | Built-in Container Apps ingress |
| Scaling | Manual (fixed instance) | Auto-scale 0–N replicas |
| SSL | Let's Encrypt + nginx | Automatic (managed by Azure) |
| CI/CD | SSH into EC2 | GitHub Actions + Bicep |
| Cost model | Fixed monthly | Pay-per-use (scale-to-zero) |

## Migrating Data from SQLite

If you have existing data in `app.db` (SQLite), you can migrate it to PostgreSQL:

```bash
# 1. Export from SQLite
sqlite3 app.db .dump > dump.sql

# 2. Convert SQLite SQL to PostgreSQL-compatible format
#    (Replace AUTOINCREMENT with SERIAL, fix quotes, etc.)
#    Or use a tool like pgloader:
pgloader sqlite:///path/to/app.db \
  postgresql://pidashboardadmin:PASSWORD@HOST:5432/pidashboard

# 3. Alternatively, re-ingest from Jira or re-upload CSV/XLSX files
#    via the /admin page after deployment.
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Container App stuck in "Provisioning" | Check ACR image exists: `az acr repository list --name <acr>` |
| Backend can't connect to DB | Verify firewall allows Azure services (0.0.0.0/0.0.0.0 rule) |
| Frontend shows API errors | Check `BACKEND_URL` env var points to backend FQDN |
| Scale-to-zero cold start is slow | Set `--min-replicas 1` for always-on (costs ~$30/mo more) |
| Image too large for ACR Basic | ACR Basic has 10 GiB storage; upgrade to Standard if needed |
| GitHub Actions fails on deploy | Ensure service principal has Contributor on the resource group |
