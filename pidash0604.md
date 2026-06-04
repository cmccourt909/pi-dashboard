# PI Dashboard — Session Summary (June 4, 2026)

## What was accomplished today

### 1. Code Review (P0 / P1 / P2 Issues Fixed)

**Security (P0):**
- Removed `.htpasswd` from git tracking, added to `.gitignore`
- Removed `console.log` that leaked partial Anthropic API key in `parse-sync/route.ts`
- Added API key authentication to upload endpoint (`UPLOAD_API_KEY` env var + `X-Upload-Key` header)

**Performance & Correctness (P1):**
- Fixed `healthToStatus()` to recognize `"amber"` from backend (was only checking `"yellow"`)
- Added 30s TTL cache to `run_site()` engine results with cache invalidation on upload
- Deleted dead `app/api/routes/` directory with broken schema references
- Routers now use FastAPI `Depends(get_session)` instead of manual session creation

**Code Quality (P2):**
- Replaced `__import__("re")` hack with proper top-level import
- Replaced deprecated `datetime.utcnow()` with `datetime.now(timezone.utc)`
- Removed 12 one-time `write-*.js` scaffold scripts
- Made CORS origins configurable via `CORS_ORIGINS` env var

---

### 2. High-Impact Fixes

- **N+1 Query Elimination** — `get_pi_summaries()` and `get_feature_summaries()` now pre-load all data into lookup dicts. Went from O(n×m) DB queries per request to O(1) lookups.
- **Sync Page Wired to Real API** — Removed `MOCK_MODE = true`. Now calls `/api/parse-sync` (Anthropic). Falls back gracefully to mock data if API key isn't configured.
- **Forecast Page Fully Typed** — Removed `// @ts-nocheck` from 813-line monolith. Split into 4 typed modules: `types.ts`, `transforms.ts`, `components.tsx`, `mock-data.ts`. Zero TypeScript errors.

---

### 3. Medium & Low Priority Improvements

- **Docker Health Checks** — All 3 services (backend, frontend, nginx) now have proper health checks with `depends_on: condition: service_healthy`
- **Zero-Downtime Deploys** — `deploy.sh` rewritten: build before restart, rolling update via `docker compose up -d`, health check wait loop
- **README Rewritten** — Full architecture docs, env vars table, API reference, project structure, deployment guide
- **Roadmap Page Refactored** — 711-line monolith split into `types.ts`, `styles.ts`, `gantt-bar.tsx`, `page.tsx`
- **Error Boundary Added** — Wraps all page content, catches render errors gracefully with retry button

---

### 4. Design Review

Full design-level review covering:
- Architecture & separation of concerns
- Data flow & state management
- API design consistency
- Risk engine scalability
- Frontend architecture & type safety
- Error handling gaps
- Deployment & operations
- Security model
- Scalability limits (breaks at ~5k issues)
- Extensibility paths

**Document:** `design-review.md` in repo root

---

### 5. AWS Deployment (Terraform)

**Infrastructure created:**
- EC2 t4g.small instance (Ubuntu 24.04 ARM, ~$12/mo)
- Elastic IP: `35.174.200.75`
- Security group (HTTP/HTTPS/SSH)
- Cloud-init provisioning (Docker, app clone, container startup)
- GitHub Actions workflow for push-to-deploy

**Files added:**
```
infra/
├── main.tf                  # EC2 + security group + elastic IP
├── variables.tf             # Configurable inputs
├── outputs.tf               # Prints IP/URL after deploy
├── terraform.tfvars.example # Template (copy to terraform.tfvars)
├── user-data.sh             # Cloud-init server setup
└── README.md                # Step-by-step deployment guide

.github/workflows/
└── deploy.yml               # Push-to-main auto-deploy via SSH
```

---

### 6. Production Fixes During Deployment

| Issue | Fix |
|-------|-----|
| TypeScript build error in sync page | Changed `parsed` state type to `any` |
| Frontend health check failing | Replaced `wget` with Node.js `fetch()` check |
| Frontend can't reach backend API | Added `getApiBase()` that uses `BACKEND_URL` server-side, relative paths client-side |
| Nginx 403 Forbidden | Removed basic auth from nginx config for UAT |

---

## Current State

- **Live at:** http://35.174.200.75
- **Branch:** `main` (all work merged)
- **PR:** https://github.com/cmccourt909/pi-dashboard/pull/1 (merged)
- **Containers:** backend ✅ healthy, frontend ✅ healthy, nginx ✅ running

---

## New Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `UPLOAD_API_KEY` | Yes (for upload) | Secret key for upload endpoint auth |
| `CORS_ORIGINS` | No | Comma-separated allowed origins (default: `http://localhost:3000`) |
| `BACKEND_URL` | For Docker | Backend URL for server-side rendering (default: `http://localhost:8000`) |
| `ANTHROPIC_API_KEY` | No | For AI-powered sync document parsing |

---

## Next Steps (from Design Review)

**P0 — Data Correctness:**
1. Add `target_start_date`/`target_end_date` to SQLAlchemy `Issue` model
2. Fix `DB_URL` vs `DATABASE_URL` env var mismatch in docker-compose
3. Fix frontend `Finding` type to match backend `FindingOut` schema

**P1 — Scaling:**
4. Materialize findings into DB table on ingest (eliminate per-request recomputation)
5. Migrate to PostgreSQL (enable concurrent access)
6. Add pagination to features endpoint

**P2 — Security & Ops:**
7. Add TLS (Let's Encrypt or load balancer)
8. Add file-size limit to upload endpoint
9. Move Anthropic API call to backend
10. Add structured logging

---

## Useful Commands

| Task | Command |
|------|---------|
| SSH into server | `ssh ubuntu@35.174.200.75` |
| View logs | `ssh ubuntu@35.174.200.75 "cd /opt/pi-dashboard && sudo docker compose logs -f"` |
| Manual deploy | `ssh ubuntu@35.174.200.75 "cd /opt/pi-dashboard && sudo git pull && sudo docker compose up -d --build"` |
| Destroy AWS infra | `cd infra/ && terraform destroy` |
