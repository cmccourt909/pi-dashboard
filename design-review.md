# PI Health Dashboard — Design Review

**Date:** June 4, 2026  
**Scope:** Full-stack architecture, data flow, API design, security, scalability, extensibility

---

## Executive Summary

The system is architecturally sound for its current single-user, single-server deployment. The backend's 4-layer separation (models → ingest → engine → API) is clean, the rule engine is elegantly designed, and the frontend rendering strategy is pragmatic. However, there are **critical scaling limits**, **data integrity gaps**, and **security assumptions** that will become problems as the system grows beyond ~5k issues or moves toward a multi-user production deployment.

**Top-line risks:**
- The "load everything into memory" engine strategy is the fundamental scaling constraint
- SQLite + in-process cache prevents any multi-worker or horizontal scaling
- The frontend `Finding` type doesn't match the backend schema (silent rendering bugs)
- No automated test coverage anywhere

---

## 1. Architecture & Separation of Concerns

**What works well:**
- Backend layers are clean: models define schema, ingest populates it, engine analyzes it, routers expose it
- Rules are pure functions that never touch the DB — excellent testability design
- The `Context` pattern pre-computes lookup indices so rules run in O(n)

**Design issues:**

| Issue | Impact | Recommendation |
|-------|--------|----------------|
| Roadmap router duplicates query logic from `queries.py` | Two parallel computation paths for the same data, risk of divergence | Consolidate feature aggregation into `queries.py` |
| Roadmap uses raw SQL for `target_start_date`/`target_end_date` | Columns exist in DB but not in SQLAlchemy model — invisible to ORM operations | Add columns to the `Issue` model properly |
| `/api/parse-sync` in Next.js holds Anthropic credentials | Business logic (LLM prompting) lives in the frontend server instead of the backend | Move to a backend endpoint |
| Upload path bypasses raw snapshot audit trail | File imports can't be re-derived later, breaking the "everything from snapshots" principle | Write upload source data to `raw_issue_snapshot` |

---

## 2. Data Flow & State Management

```
Jira API ──→ ingest.py ──→ raw_snapshot + normalized tables
                                        ↑
CSV/XLSX ──→ upload.py ────────────────→│ (no snapshots!)
                                        │
                                        ▼
                    engine.py: load ALL into Context (every 30s)
                                        │
                                        ▼
                    rules/checks.py: yield Finding[]
                                        │
                                        ▼
                    API endpoints ──→ Next.js ──→ Browser
```

**Critical coupling:** Every read endpoint triggers `run_site()` which loads the *entire dataset*. After cache expiry, a burst of requests (dashboard auto-refresh hits 3 endpoints simultaneously) will each independently recompute.

**Consistency gap:** `_write_roadmap_dates()` in the upload router opens a *separate connection* to write dates via raw SQL. If the upload transaction rolls back, roadmap dates persist — a data consistency violation.

**Cache key problem:** The cache key is `f"{site_id}:{today}"`. At midnight, a guaranteed cold-miss hits globally, causing a thundering herd.

---

## 3. API Design

The surface is compact, consistent, and well-scoped:

| Endpoint | Observation |
|----------|-------------|
| `/api/pis` | Clean, returns `PISummary[]` with embedded sprint data |
| `/api/features` | Returns ALL stories for ALL features in one response — no pagination |
| `/api/findings` | Good — supports `severity` and `category` query params |
| `/api/roadmap` | Returns a composite object that heavily overlaps with `/api/features` + `/api/pis` |
| `/api/upload` | Well-structured with proper auth |

**Schema inconsistency:** The roadmap endpoint uses `story_total`/`story_done` while the features endpoint uses `total_stories`/`done_stories`. The frontend has to accommodate both shapes with fallback logic:
```typescript
progress: f.pct_complete ?? f.progress ?? 0
```

---

## 4. Risk Engine Design

**This is the system's best-designed component.**

- Pure function rules that consume a pre-loaded `Context` — no side effects, trivially testable
- Decorator-based registration (`@register(id=..., description=...)`) — adding a rule requires zero wiring
- Error isolation — a failing rule emits a warning Finding rather than crashing the run
- Deterministic sort ordering via `sort_key()` — stable output for diffing

**Scaling ceiling:** `build_context()` loads ALL issues, sprints, links, and memberships into Python lists. At 50k issues + 100k links, this is ~200MB of Python objects rebuilt every 30 seconds. The fix is to **materialize findings into a table on ingest**, not recompute on read.

---

## 5. Frontend Architecture

**Rendering strategy is pragmatic but inconsistently wired:**

| Page | Type | Data Source |
|------|------|-------------|
| Home (`/`) | Server component | `API_BASE` (env var) |
| PI detail | Server component | `API_BASE` (env var) |
| Features | Client component | Relative `/api/...` (Next.js rewrite) |
| Roadmap | Client component | Relative `/api/...` |
| Forecast | Client component | Relative `/api/...` |
| Admin | Client component | `API_BASE` (env var!) |

**Docker hazard:** Server components use `API_BASE` (defaults to `http://localhost:8000`). Inside Docker, the Next.js server can't reach `localhost:8000` — it needs `http://backend:8000`. But the admin page (client component) also uses `API_BASE` directly, which would be the backend's internal Docker hostname, unreachable from the browser.

**Type drift:** The frontend `Finding` interface has fields that don't exist in the backend:
```typescript
// lib/api.ts — frontend expects these
id, description, affected_entity, entity_type, metric_value, metric_threshold

// Backend FindingOut actually produces
rule_id, severity, category, title, detail, recommendation, issue_keys
```
The home page renders `f.description` and `f.affected_entity` — both `undefined` at runtime.

---

## 6. Error Handling & Resilience

| Layer | Handling | Gap |
|-------|----------|-----|
| Rule engine | ✅ Per-rule exception isolation | None |
| Upload router | ✅ Structured HTTP errors | No file-size limit |
| PI/Features/Findings routers | ❌ No try/catch | `run_site()` throws RuntimeError if no Site exists → 500 with stack trace |
| Roadmap router | ⚠️ Silent catch on roadmap dates | Partial data returned without indication |
| Frontend fetch | ✅ Try/catch with error display | Mock fallback on forecast page can mislead users |

**Recommendation:** Add a try/except in routers that call `run_site()` and return a structured error:
```python
try:
    _, findings = run_site()
except RuntimeError as e:
    raise HTTPException(status_code=503, detail=str(e))
```

---

## 7. Deployment & Operations

**Current gaps for production:**

| Gap | Risk | Fix |
|-----|------|-----|
| No TLS | Basic auth credentials sent in cleartext | Add cert to nginx or put behind LB |
| SQLite volume mount | Corruption under concurrent access, no backups | Migrate to PostgreSQL |
| No metrics | Can't detect slow engine runs, cache misses, error rates | Add `/metrics` endpoint (Prometheus) |
| No structured logging | Can't correlate requests across services | JSON logs with request IDs |
| No rollback | Bad deploy requires manual intervention | Tag images, keep N-1, auto-rollback on health failure |
| `DB_URL` vs `DATABASE_URL` mismatch | Docker container may create empty database | docker-compose.yml sets `DATABASE_URL` but code reads `DB_URL` |

---

## 8. Security Model

Beyond the P0 fixes already applied:

| Concern | Detail |
|---------|--------|
| Backend API has no auth | All read endpoints are open if nginx is bypassed |
| Upload has no file-size limit | Memory exhaustion via large pandas DataFrames |
| `allow_headers=["*"]` in CORS | Weakens CSRF protections if cookie auth is ever added |
| Anthropic errors may leak headers | `/api/parse-sync` returns raw error text from Anthropic |
| ENV mismatch creates empty DB | Container may serve empty data appearing "healthy" |

---

## 9. Scalability — What Breaks First

1. **~5k issues:** Engine recomputation takes 2-5s after cache expiry. Users see loading delays.
2. **~10k issues:** Python memory usage spikes. Multiple simultaneous cache-misses cause OOM risk.
3. **Any concurrent writes:** SQLite "database is locked" errors during parallel uploads/ingests.
4. **Multiple workers:** In-process cache produces stale/inconsistent reads across workers.
5. **~200 features:** Frontend Monte Carlo (2000 sims × 200 features) causes UI jank on tab switch.

**Path to scale:** PostgreSQL → materialized findings → pagination → shared cache (Redis) → event-driven invalidation.

---

## 10. Extensibility

| Task | Difficulty | Notes |
|------|-----------|-------|
| Add a new rule | ⭐ Trivial | Write function, add decorator. Best extensibility story. |
| Add a new data source | ⭐⭐ Moderate | Schema is abstract enough. Write parallel ingester to same tables. |
| Add a new view/page | ⭐⭐ Moderate | Next.js app router pattern is established. |
| Add notifications (Slack/email) | ⭐⭐⭐ Hard | No event system. Must add post-ingest hooks or poll. |
| Add multi-tenancy | ⭐⭐⭐⭐ Very Hard | Org/Site hierarchy exists but nothing is scoped through the API. |

---

## Prioritized Recommendations

### P0 — Fix Now (Data Correctness)
1. **Add `target_start_date`/`target_end_date` to the `Issue` model** — remove raw SQL
2. **Fix `DB_URL` env var in docker-compose.yml** (currently sets `DATABASE_URL`)
3. **Fix frontend `Finding` type to match `FindingOut` schema** — currently renders `undefined`

### P1 — Next Sprint (Scaling & Reliability)
4. **Materialize findings on ingest** — store in a `finding` table, serve directly on reads
5. **Migrate to PostgreSQL** — enables concurrent access, proper pooling, backups
6. **Add try/except to routers** calling `run_site()` — prevent unhandled 500s
7. **Add pagination** to features endpoint stories

### P2 — Short-Term (Security & Ops)
8. Add TLS to nginx (or deploy behind a TLS-terminating load balancer)
9. Add file-size limit to upload endpoint (e.g., 10MB)
10. Move Anthropic API call from Next.js route to backend
11. Add structured JSON logging with request correlation IDs

### P3 — Medium-Term (Quality & Observability)
12. Write tests for the rule engine (pure functions = trivial to test)
13. Add a `/metrics` endpoint (request latency, engine time, cache hit rate)
14. Add deploy rollback mechanism (image tagging, N-1 retention)

---

## Appendix: File Map

**Backend (`app/`)**
- `models.py` — SQLAlchemy ORM: Organization, Site, ProgramIncrement, Project, Sprint, Issue, IssueLink, FeatureMembership, RawIssueSnapshot
- `ingest.py` — Jira Cloud API paginated ingester (CLI tool)
- `engine.py` — Risk engine: builds Context, runs rules, manages 30s TTL cache
- `rules/__init__.py` — Finding/Context/Rule types, rule registry
- `rules/checks.py` — 8 rule implementations across 4 categories
- `api/main.py` — FastAPI app with CORS and router registration
- `api/deps.py` — Session dependency injection
- `api/schemas.py` — Pydantic response models
- `api/queries.py` — PI and Feature summary computation
- `api/routers/pis.py` — GET /api/pis
- `api/routers/features.py` — GET /api/features
- `api/routers/findings.py` — GET /api/findings
- `api/routers/roadmap.py` — GET /api/roadmap (composite endpoint)
- `api/routers/upload.py` — POST /api/upload (CSV/XLSX ingestion)

**Frontend (`dashboard/`)**
- `app/layout.tsx` — Root layout with nav, auto-refresh, error boundary
- `app/page.tsx` — Home page (server component): PI cards + findings panel
- `app/pi/[name]/page.tsx` — PI detail (server component)
- `app/features/page.tsx` — Features list (client)
- `app/roadmap/page.tsx` — Gantt roadmap (client)
- `app/forecast/page.tsx` — Monte Carlo forecast (client)
- `app/admin/page.tsx` — File upload UI (client)
- `app/sync/page.tsx` — AI-powered meeting note parser (client)
- `app/api/parse-sync/route.ts` — Next.js API route proxying to Anthropic
- `lib/api.ts` — API client, types, fetch helpers
- `components/` — AutoRefresh, ErrorBoundary, HealthBadge, NavLinks, PICard, ProgressBar

**Infrastructure**
- `docker-compose.yml` — 3-service stack (backend, frontend, nginx) with health checks
- `Dockerfile.backend` — Python 3.11 slim
- `dashboard/Dockerfile.frontend` — Node 20 Alpine multi-stage
- `deploy.sh` — Zero-downtime deploy with health check wait
