# Delivery health app — data layer

A two-file foundation: `models.py` (schema) + `ingest.py` (Jira puller).
Uses SQLite locally, Postgres in prod — change one env var.

## Setup

From your `jira-seeder` folder (so we reuse the existing `.env`):

```
pip install -r app/requirements.txt
```

Move the `app/` folder next to your seeder, so the layout is:

```
jira-seeder/
├── .env                ← shared credentials
├── seed_jira.py
├── output/
│   └── seed_*.csv
└── app/
    ├── __init__.py
    ├── models.py
    ├── ingest.py
    └── requirements.txt
```

## Create the schema

```
cd jira-seeder
python -m app.models
```

Creates `app.db` (SQLite file) in the current directory with all tables.

## Pull data from Jira

```
python -m app.ingest --projects TSU,PNR,ISC,PGM
```

What this does:
1. Registers your Jira site in the `site` table
2. Discovers custom field IDs (story points, sprint, feature link) per site
3. Pulls projects, sprints, issues (new JQL endpoint, paginated)
4. Saves raw JSON to `raw_issue_snapshot`, upserts normalized rows
5. Builds `issue_link` + `feature_membership` tables

## Inspect the data

After running, poke around with SQLite's CLI (`sqlite3 app.db`) or any DB viewer:

```sql
-- How many issues per project?
SELECT p.jira_key, COUNT(*) FROM issue i JOIN project p ON p.id = i.project_id GROUP BY p.jira_key;

-- How many stories roll up to each epic?
SELECT e.jira_key, e.summary, COUNT(*) FROM feature_membership fm
  JOIN issue e ON e.id = fm.feature_issue_id GROUP BY e.jira_key, e.summary;

-- Show the blocks dependency graph
SELECT s.jira_key AS blocker, t.jira_key AS blocked FROM issue_link l
  JOIN issue s ON s.id = l.source_issue_id
  JOIN issue t ON t.id = l.target_issue_id
  WHERE l.link_type = 'blocks';
```
