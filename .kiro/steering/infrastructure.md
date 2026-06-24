---
inclusion: auto
---

# Waypoint Infrastructure Context

## Architecture

- **Frontend**: Next.js 16 standalone on Azure Container Apps (pi-dashboard-uat-frontend)
- **Backend**: FastAPI on Azure Container Apps (pi-dashboard-uat-backend, internal ingress)
- **Database**: PostgreSQL Flexible Server (Burstable B1ms)
- **AI**: Azure OpenAI Service (GPT-4o-mini, GlobalStandard SKU)
- **Auth**: Entra ID EasyAuth sidecar on frontend container
- **Region**: UK South (planning move to East US)
- **Domain**: runwaypoint.app (managed via Cloudflare DNS, cert via Azure managed certificate)

## API Proxy Pattern

The frontend does NOT use `next.config.js` rewrites (they bake at build time in standalone mode).
Instead, API routing is handled by:
- `app/api/[...path]/route.ts` — catch-all proxy, reads `BACKEND_URL` at runtime
- `app/api/seed-demo/route.ts` — dedicated route for seed endpoint
- `app/api/health/route.ts` — local health check (not proxied)
- `app/api/parse-sync/route.ts` — local AI parsing (not proxied)
- `app/api/enrich/status/route.ts` — proxied to backend

## Known Issues

1. **Custom domain resets on deploy** — Bicep redeploys can invalidate the runwaypoint.app cert binding. Domain is managed manually in portal. Run `scripts/setup-custom-domain.ps1` after deploy if needed.
2. **az containerapp commands fail locally** — SSL connection reset (10054) from local machine. Use Azure Portal or `az rest` for Container Apps operations.
3. **EasyAuth intercepts API calls** — Any new API endpoint must be added to `excludedPaths` in the Bicep frontendAuth config, otherwise EasyAuth returns HTML login page instead of proxying.

## Environment Variables

### Backend container:
- `DB_URL` — PostgreSQL connection string (secret)
- `UPLOAD_API_KEY` — key for upload/seed endpoints (secret, currently: waypoint-uat-2026)
- `CORS_ORIGINS` — comma-separated allowed origins
- `AZURE_OPENAI_ENDPOINT` — Azure OpenAI service URL
- `AZURE_OPENAI_DEPLOYMENT` — model deployment name (gpt-4o-mini)
- `AZURE_CLIENT_ID` — Managed Identity client ID for OpenAI auth

### Frontend container:
- `BACKEND_URL` — backend internal FQDN (https://pi-dashboard-uat-backend.<env>.<region>.azurecontainerapps.io)
- `NODE_ENV` — production
- `PORT` — 3000
- `HOSTNAME` — forced to 0.0.0.0 via CMD (Azure overrides ENV)

## Deploy Pipeline

Push to `main` triggers `.github/workflows/deploy-azure.yml`:
1. Bicep infrastructure deploy (creates/updates all Azure resources)
2. Docker build + push (backend and frontend images to ACR)
3. Container app update (points to new image tags)
4. Health check (curl backend /health endpoint)

## Key Files

- `infra/azure/main.bicep` — all Azure infrastructure
- `.github/workflows/deploy-azure.yml` — CI/CD pipeline
- `dashboard/Dockerfile.frontend` — frontend container build
- `Dockerfile.backend` — backend container build
- `app/api/main.py` — FastAPI entrypoint (runs migrations on startup)
- `app/api/routers/enrich.py` — AI enrichment with caching/retry
