"""
Ingest stub. Pulls data from a Jira site and fills the app's data model.

End-to-end flow for one ingest run:
  1. Ensure Site row exists for the configured Jira URL
  2. Discover field mappings (which customfield_NNNNN = story points, etc.)
  3. Pull projects, upsert into Project
  4. Pull sprints per project board, upsert into Sprint
  5. Pull all issues in the configured projects, using the new /search/jql endpoint
     - Save raw JSON to raw_issue_snapshot (append-only)
     - Upsert normalized row in Issue
     - Upsert links in IssueLink
     - Upsert feature membership (from relates-to links to any Epic)

Usage:
  # Uses the same .env you used for seeding
  python -m app.ingest --projects TSU,PNR,ISC,PGM

Design note: this is a STUB. It favors clarity over completeness.
Known gaps we'll close later:
  - No delta pulls yet (pulls everything every time)
  - No retry logic beyond 429 handling
  - Story points field discovery assumes exact name match
  - Sprint field discovery is heuristic
"""
from __future__ import annotations

import argparse
import base64
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterator, Optional

import requests
from dotenv import load_dotenv
from sqlalchemy import select
from sqlalchemy.orm import Session

# Load .env from the seeder folder if present, so we share credentials
HERE = Path(__file__).resolve().parent
for candidate in (HERE / ".env", HERE.parent / ".env", Path.cwd() / ".env"):
    if candidate.exists():
        load_dotenv(candidate)
        break

# Import our own model; supports both `python -m app.ingest` and `python ingest.py`
try:
    from .models import (
        Base,
        Site,
        FieldMapping,
        RawIssueSnapshot,
        Project,
        Sprint,
        Issue,
        IssueLink,
        FeatureMembership,
        get_engine,
        get_session_maker,
    )
except ImportError:
    from models import (  # type: ignore
        Base,
        Site,
        FieldMapping,
        RawIssueSnapshot,
        Project,
        Sprint,
        Issue,
        IssueLink,
        FeatureMembership,
        get_engine,
        get_session_maker,
    )


BASE_URL = os.environ["JIRA_BASE_URL"].rstrip("/")
EMAIL = os.environ["JIRA_EMAIL"]
TOKEN = os.environ["JIRA_TOKEN"]

AUTH = base64.b64encode(f"{EMAIL}:{TOKEN}".encode()).decode()
HEADERS = {
    "Authorization": f"Basic {AUTH}",
    "Accept": "application/json",
    "Content-Type": "application/json",
}


# ---------- HTTP ----------

def req(method: str, path: str, **kwargs) -> requests.Response:
    url = f"{BASE_URL}{path}" if path.startswith("/") else path
    for _ in range(5):
        r = requests.request(method, url, headers=HEADERS, **kwargs)
        if r.status_code == 429:
            wait = int(r.headers.get("Retry-After", "2"))
            print(f"  rate limited, sleep {wait}s")
            time.sleep(wait)
            continue
        return r
    return r

def api_json(method: str, path: str, **kwargs) -> dict:
    r = req(method, path, **kwargs)
    r.raise_for_status()
    return r.json() if r.text else {}


# ---------- date helpers ----------

def parse_iso(s: Optional[str]) -> Optional[datetime]:
    if not s:
        return None
    # Jira returns 2026-04-23T12:34:56.789+0000
    s = s.replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(s)
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    except ValueError:
        return None


# ---------- site + field discovery ----------

def ensure_site(session: Session) -> Site:
    site = session.scalar(select(Site).where(Site.base_url == BASE_URL))
    if site:
        return site
    me = api_json("GET", "/rest/api/3/myself")
    site = Site(base_url=BASE_URL, display_name=me.get("displayName", "Jira Site"))
    session.add(site)
    session.flush()
    print(f"  registered site id={site.id}  url={BASE_URL}")
    return site


def discover_fields(session: Session, site: Site) -> dict[str, str]:
    """
    Find which Jira customfield IDs correspond to our semantic concepts.
    Returns {concept: jira_field_id} and persists to FieldMapping.
    """
    # Concept -> list of possible Jira field names (varies by instance)
    wanted = {
        "story_points": ["Story Points", "Story point estimate"],
        "feature_link": ["Feature Link", "Epic Link"],
        "sprint": ["Sprint"],
        "epic_name": ["Epic Name"],
    }
    fields = api_json("GET", "/rest/api/3/field")
    by_name = {f.get("name"): f.get("id") for f in fields}

    found: dict[str, str] = {}
    for concept, aliases in wanted.items():
        for alias in aliases:
            if alias in by_name:
                found[concept] = by_name[alias]
                break

    # Upsert into FieldMapping
    for concept, field_id in found.items():
        existing = session.scalar(
            select(FieldMapping).where(
                FieldMapping.site_id == site.id,
                FieldMapping.concept == concept,
            )
        )
        if existing:
            existing.jira_field_id = field_id
        else:
            session.add(FieldMapping(site_id=site.id, concept=concept, jira_field_id=field_id))
    session.flush()
    print(f"  field discovery: {found}")
    return found


# ---------- projects & sprints ----------

def ingest_projects(session: Session, site: Site, project_keys: list[str]) -> dict[str, Project]:
    data = api_json("GET", "/rest/api/3/project/search?maxResults=100")
    keep = {p["key"]: p for p in data.get("values", []) if p["key"] in project_keys}

    result: dict[str, Project] = {}
    for key, p in keep.items():
        existing = session.scalar(
            select(Project).where(Project.site_id == site.id, Project.jira_key == key)
        )
        if existing:
            existing.name = p["name"]
            result[key] = existing
        else:
            proj = Project(site_id=site.id, jira_key=key, name=p["name"])
            session.add(proj)
            result[key] = proj
    session.flush()
    print(f"  projects: {list(result.keys())}")
    return result


def ingest_sprints(session: Session, site: Site, projects: dict[str, Project]):
    boards = api_json("GET", "/rest/agile/1.0/board?maxResults=50").get("values", [])
    board_to_project: dict[int, Project] = {}
    for b in boards:
        pk = b.get("location", {}).get("projectKey")
        if pk in projects:
            board_to_project[b["id"]] = projects[pk]

    for board_id, project in board_to_project.items():
        sprints = api_json(
            "GET", f"/rest/agile/1.0/board/{board_id}/sprint?maxResults=100"
        ).get("values", [])
        for s in sprints:
            existing = session.scalar(
                select(Sprint).where(
                    Sprint.site_id == site.id, Sprint.jira_id == s["id"]
                )
            )
            data = dict(
                site_id=site.id,
                project_id=project.id,
                jira_id=s["id"],
                name=s["name"],
                state=s["state"],
                start_date=parse_iso(s.get("startDate")),
                end_date=parse_iso(s.get("endDate")),
            )
            if existing:
                for k, v in data.items():
                    setattr(existing, k, v)
            else:
                session.add(Sprint(**data))
    session.flush()


# ---------- issues (paginated, new endpoint) ----------

def iter_issues(jql: str, fields: list[str]) -> Iterator[dict]:
    """
    Paginate via the new /rest/api/3/search/jql endpoint.
    """
    next_page_token: Optional[str] = None
    while True:
        body = {"jql": jql, "maxResults": 100, "fields": fields}
        if next_page_token:
            body["nextPageToken"] = next_page_token
        r = req("POST", "/rest/api/3/search/jql", json=body)
        r.raise_for_status()
        data = r.json()
        for issue in data.get("issues", []):
            yield issue
        next_page_token = data.get("nextPageToken")
        is_last = data.get("isLast", True)
        if is_last or not next_page_token:
            break


def ingest_issues(
    session: Session,
    site: Site,
    projects: dict[str, Project],
    field_map: dict[str, str],
):
    # Build a sprint lookup for attaching issues
    sprint_by_jira_id: dict[int, Sprint] = {
        s.jira_id: s
        for s in session.scalars(select(Sprint).where(Sprint.site_id == site.id)).all()
    }
    # Build an issue lookup for links/memberships (populated as we go)
    issue_by_key: dict[str, Issue] = {}

    project_keys = list(projects.keys())
    jql = f"project in ({','.join(project_keys)})"
    # Ask for the core fields + our discovered custom fields + links
    wanted_fields = [
        "summary", "status", "priority", "assignee", "reporter",
        "created", "updated", "resolved", "duedate",
        "issuetype", "project", "issuelinks", "parent",
    ]
    for concept, field_id in field_map.items():
        if field_id not in wanted_fields:
            wanted_fields.append(field_id)

    pulled_at = datetime.now(timezone.utc)
    count = 0
    pending_links: list[tuple[str, str, str]] = []   # (src_key, tgt_key, type)
    pending_feature_membership: list[tuple[str, str, str]] = []  # (issue_key, feature_key, source)

    for raw in iter_issues(jql, wanted_fields):
        count += 1
        key = raw["key"]
        fields = raw.get("fields", {})

        # 1) Save the raw snapshot (append-only)
        session.add(RawIssueSnapshot(
            site_id=site.id,
            issue_key=key,
            pulled_at=pulled_at,
            payload=raw,
        ))

        # 2) Resolve project + sprint
        project_key = fields["project"]["key"]
        project = projects.get(project_key)
        if not project:
            continue   # project outside our requested set

        sprint_obj = None
        sprint_field_id = field_map.get("sprint")
        if sprint_field_id:
            sprints = fields.get(sprint_field_id) or []
            # Pick the most recently assigned (last non-null)
            for s in reversed(sprints):
                if isinstance(s, dict) and s.get("id") in sprint_by_jira_id:
                    sprint_obj = sprint_by_jira_id[s["id"]]
                    break

        # 3) Normalize core fields
        issue_type = (fields.get("issuetype", {}) or {}).get("name", "").lower()
        status_obj = fields.get("status", {}) or {}
        status_category = (status_obj.get("statusCategory", {}) or {}).get("key", "")

        story_points = None
        sp_field_id = field_map.get("story_points")
        if sp_field_id:
            story_points = fields.get(sp_field_id)

        issue_data = dict(
            site_id=site.id,
            project_id=project.id,
            sprint_id=sprint_obj.id if sprint_obj else None,
            jira_key=key,
            jira_id=int(raw["id"]),
            issue_type=issue_type or "other",
            summary=fields.get("summary", ""),
            status=status_obj.get("name", ""),
            status_category=status_category,
            priority=(fields.get("priority") or {}).get("name"),
            assignee=(fields.get("assignee") or {}).get("displayName"),
            reporter=(fields.get("reporter") or {}).get("displayName"),
            story_points=float(story_points) if story_points is not None else None,
            created_at=parse_iso(fields.get("created")),
            updated_at=parse_iso(fields.get("updated")),
            resolved_at=parse_iso(fields.get("resolved")),
            due_date=parse_iso(fields.get("duedate")),
            last_ingested_at=pulled_at,
        )

        existing = session.scalar(
            select(Issue).where(Issue.site_id == site.id, Issue.jira_key == key)
        )
        if existing:
            for k, v in issue_data.items():
                setattr(existing, k, v)
            issue_by_key[key] = existing
        else:
            new_issue = Issue(**issue_data)
            session.add(new_issue)
            session.flush()   # get the id
            issue_by_key[key] = new_issue

        # 4) Queue links for after everything is persisted
        for link in fields.get("issuelinks", []) or []:
            link_type = (link.get("type", {}) or {}).get("name", "").lower()
            if "outwardIssue" in link:
                pending_links.append((key, link["outwardIssue"]["key"], link_type))
            elif "inwardIssue" in link:
                pending_links.append((link["inwardIssue"]["key"], key, link_type))

    # Periodic commit so raw snapshots don't balloon in memory
    session.commit()
    print(f"  pulled {count} issues")

    # Process pending links
    link_count = 0
    for src_key, tgt_key, ltype in pending_links:
        src = issue_by_key.get(src_key) or session.scalar(
            select(Issue).where(Issue.site_id == site.id, Issue.jira_key == src_key)
        )
        tgt = issue_by_key.get(tgt_key) or session.scalar(
            select(Issue).where(Issue.site_id == site.id, Issue.jira_key == tgt_key)
        )
        if not src or not tgt:
            continue
        existing = session.scalar(
            select(IssueLink).where(
                IssueLink.site_id == site.id,
                IssueLink.source_issue_id == src.id,
                IssueLink.target_issue_id == tgt.id,
                IssueLink.link_type == ltype,
            )
        )
        if existing:
            continue
        session.add(IssueLink(
            site_id=site.id,
            source_issue_id=src.id,
            target_issue_id=tgt.id,
            link_type=ltype,
        ))
        link_count += 1

        # Infer feature membership from 'relates' links that target an Epic
        if ltype == "relates" and tgt.issue_type == "epic":
            pending_feature_membership.append((src_key, tgt_key, "relates_link"))
        elif ltype == "relates" and src.issue_type == "epic":
            pending_feature_membership.append((tgt_key, src_key, "relates_link"))

    session.commit()
    print(f"  upserted {link_count} new links")

    # Process feature memberships
    fm_count = 0
    for story_key, feat_key, source in pending_feature_membership:
        story = session.scalar(
            select(Issue).where(Issue.site_id == site.id, Issue.jira_key == story_key)
        )
        feat = session.scalar(
            select(Issue).where(Issue.site_id == site.id, Issue.jira_key == feat_key)
        )
        if not story or not feat:
            continue
        existing = session.scalar(
            select(FeatureMembership).where(
                FeatureMembership.site_id == site.id,
                FeatureMembership.issue_id == story.id,
            )
        )
        if existing:
            existing.feature_issue_id = feat.id
            existing.source = source
        else:
            session.add(FeatureMembership(
                site_id=site.id,
                issue_id=story.id,
                feature_issue_id=feat.id,
                source=source,
            ))
            fm_count += 1
    session.commit()
    print(f"  upserted {fm_count} new feature memberships")


# ---------- summary ----------

def print_summary(session: Session, site: Site):
    n_projects = session.scalar(
        select(Project.__table__.c.id.label("x")).where(Project.site_id == site.id)
    )
    print("\n--- Summary ---")
    for P in [Project, Sprint, Issue, IssueLink, FeatureMembership, RawIssueSnapshot]:
        total = session.query(P).filter(P.site_id == site.id).count()
        print(f"  {P.__tablename__:28}  {total}")


# ---------- main ----------

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--projects", required=True,
        help="Comma-separated project keys, e.g. TSU,PNR,ISC,PGM",
    )
    args = parser.parse_args()
    project_keys = [p.strip() for p in args.projects.split(",") if p.strip()]

    # Make sure schema exists
    engine = get_engine()
    Base.metadata.create_all(engine)

    SessionLocal = get_session_maker()
    with SessionLocal() as session:
        site = ensure_site(session)
        session.commit()

        print("[1/4] discovering fields...")
        field_map = discover_fields(session, site)
        session.commit()

        print("\n[2/4] ingesting projects...")
        projects = ingest_projects(session, site, project_keys)
        session.commit()

        print("\n[3/4] ingesting sprints...")
        ingest_sprints(session, site, projects)
        session.commit()

        print("\n[4/4] ingesting issues + links...")
        ingest_issues(session, site, projects, field_map)

        print_summary(session, site)


if __name__ == "__main__":
    main()
