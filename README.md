# PI Health Dashboard

A delivery health tracker for Program Increments (PIs). Ingests Jira data, runs a rule-based risk engine, and surfaces findings through an interactive dashboard with forecasting and roadmap visualization.

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────┐
│   Next.js    │────▶│   FastAPI    │────▶│  SQLite  │
│  (React 19)  │     │  (Python)    │     │  (app.db)│
└──────────────┘     └──────────────┘     └──────────┘
     :3000                :8000
        │                    │
        ▼                    ▼
  Dashboard UI         Risk Engine
  - PI Overview        - 9 rules
  - Features           - Findings
  - Roadmap (Gantt)    - Severity scoring
  - Forecast (MC)      - Sprint/feature analysis
  - Sync (AI parse)
```

**Backend** (`app/`) — FastAPI + SQLAlchemy ORM. Ingests from Jira API or CSV/XLSX uploads. Runs a pure-function rule engine that produces typed Findings.

**Frontend** (`dashboard/`) — Next.js 16 with server-side rendering for the home page, client-side pages for interactive views. Tailwind CSS v4 + CSS custom properties.

**Deployment** — Docker Compose with nginx reverse proxy. Multi-stage builds for both services.

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+
- Docker & Docker Compose (for production)

### Backend

```bash
cd app
pip install -r requirements.txt

# Create the database schema
python -m app.models

# Start the API server
uvicorn app.api.main:app --reload --port 8000
```

### Frontend

```bash
cd dashboard
npm install
npm run dev
```

The dashboard runs at http://localhost:3000 and proxies `/api/*` requests to the backend at http://localhost:8000.

### Docker (Production)

```bash
docker compose build
docker compose up -d
```

The app is served via nginx on port 80.

## Environment Variables

| Variable | Service | Required | Description |
|----------|---------|----------|-------------|
| `DB_URL` | Backend | No | Database URL (default: `sqlite:///app.db`) |
| `UPLOAD_API_KEY` | Backend | Yes | Secret key for upload endpoint auth |
| `CORS_ORIGINS` | Backend | No | Comma-separated allowed origins (default: `http://localhost:3000`) |
| `JIRA_BASE_URL` | Backend | For ingest | Jira instance URL |
| `JIRA_EMAIL` | Backend | For ingest | Jira account email |
| `JIRA_TOKEN` | Backend | For ingest | Jira API token |
| `NEXT_PUBLIC_API_URL` | Frontend | No | Backend URL for client-side fetches (default: `http://localhost:8000`) |
| `BACKEND_URL` | Frontend | No | Backend URL for Next.js rewrites in Docker (default: `http://localhost:8000`) |
| `ANTHROPIC_API_KEY` | Frontend | No | For AI-powered sync document parsing |

## Data Ingestion

There are two ways to get data into the dashboard:

### 1. Jira API Pull (Live)

```bash
python -m app.ingest --projects TSU,PNR,ISC,PGM
```

Connects to Jira, discovers custom fields, and pulls all issues/sprints/links.

### 2. File Upload (CSV/XLSX)

Navigate to `/admin` in the dashboard and upload:
- **Stories CSV** — Jira export of stories with sprint/PI/feature link fields
- **Features XLSX** — Feature-level status and PI assignment
- **Roadmap XLSX** — Advanced Roadmaps export with target dates

Uploads require the `X-Upload-Key` header matching the `UPLOAD_API_KEY` env var.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/api/pis` | PI summaries with sprint breakdowns |
| GET | `/api/features` | Feature summaries with story details |
| GET | `/api/findings` | Risk findings (filterable by severity/category) |
| GET | `/api/roadmap` | Roadmap data for Gantt visualization |
| POST | `/api/upload` | Upload CSV/XLSX files (requires auth) |

## Risk Engine

The engine (`app/engine.py`) loads all data into an in-memory `Context`, then runs registered rules. Each rule is a pure function that yields `Finding` objects.

### Rule Categories

| Category | Rules | Description |
|----------|-------|-------------|
| Hygiene | 3 | Unassigned stories, missing estimates, features without dates |
| Flow | 2 | Stale in-progress work, ghost assignments |
| Dependency | 2 | Unstarted blockers, cross-project chains |
| Trajectory | 2 | Feature progress vs. target, sprint carryover risk |

### Adding a Rule

```python
# app/rules/checks.py
@register(id="category.my_rule", description="What it checks")
def my_rule(ctx: Context) -> Iterable[Finding]:
    # Pure function — no DB, no HTTP
    if some_condition(ctx):
        yield Finding(
            rule_id="category.my_rule",
            severity=Severity.WARNING,
            category=Category.FLOW,
            title="Something needs attention",
            detail="Explanation of why...",
            issue_keys=("KEY-1",),
            recommendation="What to do about it",
        )
```

## Project Structure

```
pi-dashboard/
├── app/                    # Python backend
│   ├── api/
│   │   ├── main.py         # FastAPI app + CORS
│   │   ├── routers/        # Endpoint handlers
│   │   ├── schemas.py      # Pydantic response models
│   │   ├── queries.py      # DB query functions
│   │   └── deps.py         # FastAPI dependencies
│   ├── rules/
│   │   ├── __init__.py     # Finding/Context types, registry
│   │   └── checks.py       # Rule implementations
│   ├── engine.py           # Risk engine + caching
│   ├── models.py           # SQLAlchemy ORM models
│   ├── ingest.py           # Jira API data pull
│   └── requirements.txt
├── dashboard/              # Next.js frontend
│   ├── app/                # App router pages
│   │   ├── page.tsx        # PI Overview (SSR)
│   │   ├── features/       # Features list
│   │   ├── roadmap/        # Gantt chart
│   │   ├── forecast/       # Monte Carlo forecasting
│   │   ├── sync/           # AI document parsing
│   │   └── admin/          # File upload
│   ├── components/         # Shared components
│   ├── lib/api.ts          # API client + types
│   └── package.json
├── docker-compose.yml
├── Dockerfile.backend
├── nginx.conf
└── deploy.sh
```

## Deployment

```bash
./deploy.sh
```

The deploy script:
1. Pulls latest code
2. Builds new Docker images (no downtime)
3. Rolling restart of containers via `docker compose up -d`
4. Waits for health checks to pass
5. Reports final status

## License

Private repository — internal use only.
