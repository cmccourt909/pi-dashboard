"""
Upload router — accepts Jira export files and ingests them into the database.

Supported file types:
  - Stories CSV  (e.g. "Stories under Features_Epic_*.csv")
  - Features XLSX (e.g. "Isaac to IO Cigna Features *.xlsx")

They join on Feature Issue Key (e.g. EVEXPCP-164).

POST /api/upload
  multipart/form-data fields:
    file  — the uploaded file (CSV or XLSX)

Returns JSON:
  { "status": "ok", "file_type": "stories_csv"|"features_xlsx",
    "inserted": {...}, "warnings": [...] }
"""
from __future__ import annotations

import io
import re
from datetime import datetime
from html.parser import HTMLParser
from typing import Optional

import pandas as pd
from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.models import (
    FeatureMembership,
    Issue,
    IssueLink,
    IssueType,
    Organization,
    ProgramIncrement,
    Project,
    Site,
    Sprint,
    SprintState,
    get_session_maker,
)
from sqlalchemy import select

router = APIRouter(prefix="/api/upload", tags=["upload"])


# ---------------------------------------------------------------------------
# HTML stripping helper
# ---------------------------------------------------------------------------

class _Stripper(HTMLParser):
    def __init__(self):
        super().__init__()
        self._parts: list[str] = []

    def handle_data(self, data: str):
        self._parts.append(data)

    def get_text(self) -> str:
        return " ".join(self._parts).strip()


def strip_html(value) -> str:
    if not value or not isinstance(value, str):
        return ""
    s = _Stripper()
    s.feed(value)
    return s.get_text()


# ---------------------------------------------------------------------------
# PI date parsing  — "PI 26.2 (03/12/26 - 05/20/26)"
# ---------------------------------------------------------------------------

_PI_RE = re.compile(
    r"PI\s+([\d.]+)\s+\((\d{2}/\d{2}/\d{2})\s*-\s*(\d{2}/\d{2}/\d{2})\)"
)


def parse_pi_field(raw: str) -> Optional[tuple[str, datetime, datetime]]:
    """Return (name, start_date, end_date) or None if unparseable."""
    if not raw or not isinstance(raw, str):
        return None
    m = _PI_RE.search(raw)
    if not m:
        return None
    name, start_str, end_str = m.group(1), m.group(2), m.group(3)
    try:
        start = datetime.strptime(start_str, "%m/%d/%y")
        end = datetime.strptime(end_str, "%m/%d/%y")
        return name, start, end
    except ValueError:
        return None


# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------

def _get_or_create_org(session: Session) -> Organization:
    org = session.scalars(select(Organization)).first()
    if not org:
        org = Organization(name="Default Org")
        session.add(org)
        session.flush()
    return org


def _get_or_create_site(session: Session) -> Site:
    site = session.scalars(select(Site)).first()
    if not site:
        site = Site(base_url="https://jira.local", display_name="Imported")
        session.add(site)
        session.flush()
    return site


def _get_or_create_pi(
    session: Session, org: Organization, name: str, start: datetime, end: datetime
) -> ProgramIncrement:
    pi = session.scalars(
        select(ProgramIncrement).where(
            ProgramIncrement.org_id == org.id,
            ProgramIncrement.name == name,
        )
    ).first()
    if not pi:
        pi = ProgramIncrement(org_id=org.id, name=name, start_date=start, end_date=end)
        session.add(pi)
        session.flush()
    return pi


def _get_or_create_project(session: Session, site: Site, jira_key: str, name: str) -> Project:
    proj = session.scalars(
        select(Project).where(
            Project.site_id == site.id,
            Project.jira_key == jira_key,
        )
    ).first()
    if not proj:
        proj = Project(site_id=site.id, jira_key=jira_key, name=name)
        session.add(proj)
        session.flush()
    return proj


def _get_or_create_sprint(
    session: Session, site: Site, project: Project, pi: Optional[ProgramIncrement], sprint_name: str
) -> Sprint:
    sprint = session.scalars(
        select(Sprint).where(
            Sprint.site_id == site.id,
            Sprint.name == sprint_name,
        )
    ).first()
    if not sprint:
        # Use a synthetic jira_id based on sprint name hash to avoid collisions
        synthetic_id = abs(hash(sprint_name)) % (10**8)
        # Infer state from name suffix patterns
        state = SprintState.ACTIVE.value
        if any(c in sprint_name.lower() for c in ["future", "next"]):
            state = SprintState.FUTURE.value

        sprint = Sprint(
            site_id=site.id,
            project_id=project.id,
            jira_id=synthetic_id,
            name=sprint_name,
            state=state,
            pi_id=pi.id if pi else None,
        )
        session.add(sprint)
        session.flush()
    elif pi and not sprint.pi_id:
        sprint.pi_id = pi.id
        session.flush()
    return sprint


def _upsert_issue(
    session: Session,
    site: Site,
    project: Project,
    sprint: Optional[Sprint],
    jira_key: str,
    jira_id: int,
    issue_type: str,
    summary: str,
    status: str,
    story_points: Optional[float],
    assignee: Optional[str],
    priority: Optional[str],
) -> Issue:
    issue = session.scalars(
        select(Issue).where(
            Issue.site_id == site.id,
            Issue.jira_key == jira_key,
        )
    ).first()

    status_category = _status_to_category(status)

    if not issue:
        issue = Issue(
            site_id=site.id,
            project_id=project.id,
            sprint_id=sprint.id if sprint else None,
            jira_key=jira_key,
            jira_id=jira_id,
            issue_type=issue_type,
            summary=summary,
            status=status,
            status_category=status_category,
            story_points=story_points,
            assignee=assignee,
            priority=priority,
        )
        session.add(issue)
    else:
        issue.summary = summary
        issue.status = status
        issue.status_category = status_category
        issue.story_points = story_points
        issue.assignee = assignee
        issue.priority = priority
        if sprint:
            issue.sprint_id = sprint.id
    session.flush()
    return issue


def _status_to_category(status: str) -> str:
    status_lower = (status or "").lower()
    done_statuses = {"done", "closed", "resolved", "complete", "completed", "accepted"}
    active_statuses = {"in progress", "in development", "implementing", "working", "refinement",
                       "in review", "testing", "ready for test", "deployed"}
    if status_lower in done_statuses:
        return "done"
    if status_lower in active_statuses:
        return "indeterminate"
    return "new"


def _upsert_feature_membership(
    session: Session, site: Site, story_issue: Issue, feature_issue: Issue
):
    existing = session.scalars(
        select(FeatureMembership).where(
            FeatureMembership.site_id == site.id,
            FeatureMembership.issue_id == story_issue.id,
        )
    ).first()
    if not existing:
        fm = FeatureMembership(
            site_id=site.id,
            issue_id=story_issue.id,
            feature_issue_id=feature_issue.id,
            source="feature_link_field",
        )
        session.add(fm)
        session.flush()


# ---------------------------------------------------------------------------
# Stories CSV ingestion
# ---------------------------------------------------------------------------

# Column name constants (Jira export headers)
COL_KEY = "Issue key"
COL_SUMMARY = "Summary"
COL_STATUS = "Status"
COL_STORY_POINTS = "Custom field (Story Points)"
COL_SPRINT = "Sprint"
COL_FEATURE_LINK = "Custom field (Feature Link)"
COL_PI = "Custom field (PI (Program Increment))"
COL_ASSIGNEE = "Assignee"
COL_PRIORITY = "Priority"
COL_PROJECT = "Project name"
COL_ISSUE_ID = "Issue id"


def ingest_stories_csv(df: pd.DataFrame, session: Session) -> dict:
    org = _get_or_create_org(session)
    site = _get_or_create_site(session)

    inserted = {"pis": 0, "sprints": 0, "stories": 0, "feature_memberships": 0}
    warnings: list[str] = []
    pi_cache: dict[str, ProgramIncrement] = {}
    sprint_cache: dict[str, Sprint] = {}
    project_cache: dict[str, Project] = {}

    for _, row in df.iterrows():
        jira_key = str(row.get(COL_KEY, "")).strip()
        if not jira_key or jira_key == "nan":
            continue

        summary = str(row.get(COL_SUMMARY, "")).strip()
        status = str(row.get(COL_STATUS, "")).strip()
        sprint_name = str(row.get(COL_SPRINT, "")).strip()
        feature_link = str(row.get(COL_FEATURE_LINK, "")).strip()
        pi_raw = str(row.get(COL_PI, "")).strip()
        assignee = str(row.get(COL_ASSIGNEE, "")).strip() or None
        priority = str(row.get(COL_PRIORITY, "")).strip() or None
        project_name = str(row.get(COL_PROJECT, "")).strip()
        issue_id_raw = row.get(COL_ISSUE_ID, 0)

        try:
            jira_id = int(issue_id_raw) if issue_id_raw and str(issue_id_raw) != "nan" else abs(hash(jira_key)) % (10**8)
        except (ValueError, TypeError):
            jira_id = abs(hash(jira_key)) % (10**8)

        story_points_raw = row.get(COL_STORY_POINTS)
        try:
            story_points = float(story_points_raw) if story_points_raw and str(story_points_raw) != "nan" else None
        except (ValueError, TypeError):
            story_points = None

        # Project key from jira_key prefix (e.g. EVEXPNR-806 → EVEXPNR)
        project_key = jira_key.rsplit("-", 1)[0] if "-" in jira_key else jira_key
        if project_key not in project_cache:
            project_cache[project_key] = _get_or_create_project(
                session, site, project_key, project_name or project_key
            )
        project = project_cache[project_key]

        # PI
        pi: Optional[ProgramIncrement] = None
        parsed = parse_pi_field(pi_raw)
        if parsed:
            pi_name, pi_start, pi_end = parsed
            if pi_name not in pi_cache:
                pi_cache[pi_name] = _get_or_create_pi(session, org, pi_name, pi_start, pi_end)
                inserted["pis"] += 1
            pi = pi_cache[pi_name]
        elif pi_raw and pi_raw.lower() not in ("nan", "none", "", "unassigned"):
            warnings.append(f"{jira_key}: unrecognized PI format '{pi_raw[:60]}'")

        # Sprint
        sprint: Optional[Sprint] = None
        if sprint_name and sprint_name.lower() not in ("nan", "none", ""):
            if sprint_name not in sprint_cache:
                sprint_cache[sprint_name] = _get_or_create_sprint(
                    session, site, project, pi, sprint_name
                )
                inserted["sprints"] += 1
            sprint = sprint_cache[sprint_name]

        # Story issue
        _upsert_issue(
            session, site, project, sprint,
            jira_key=jira_key,
            jira_id=jira_id,
            issue_type=IssueType.STORY.value,
            summary=summary,
            status=status,
            story_points=story_points,
            assignee=assignee,
            priority=priority,
        )
        inserted["stories"] += 1

        # Feature membership
        feature_key = feature_link.strip() if feature_link and feature_link.lower() not in ("nan", "none", "") else None
        if feature_key:
            feat_project_key = feature_key.rsplit("-", 1)[0] if "-" in feature_key else feature_key
            if feat_project_key not in project_cache:
                project_cache[feat_project_key] = _get_or_create_project(
                    session, site, feat_project_key, feat_project_key
                )
            feat_project = project_cache[feat_project_key]

            feature_issue = _upsert_issue(
                session, site, feat_project, sprint=None,
                jira_key=feature_key,
                jira_id=abs(hash(feature_key)) % (10**8),
                issue_type=IssueType.EPIC.value,
                summary=f"Feature {feature_key}",
                status="Unknown",
                story_points=None,
                assignee=None,
                priority=None,
            )

            story_issue = session.scalars(
                select(Issue).where(Issue.site_id == site.id, Issue.jira_key == jira_key)
            ).first()

            if story_issue and feature_issue:
                _upsert_feature_membership(session, site, story_issue, feature_issue)
                inserted["feature_memberships"] += 1

    session.commit()
    return {"inserted": inserted, "warnings": warnings}


# ---------------------------------------------------------------------------
# Features XLSX ingestion
# ---------------------------------------------------------------------------

FEAT_COL_KEY = "Issue key"
FEAT_COL_SUMMARY = "Summary"
FEAT_COL_STATUS = "Status"
FEAT_COL_PI = "Custom field (PI (Program Increment))"
FEAT_COL_ASSIGNEE = "Assignee"
FEAT_COL_ISSUE_ID = "Issue id"


def ingest_features_xlsx(df: pd.DataFrame, session: Session) -> dict:
    org = _get_or_create_org(session)
    site = _get_or_create_site(session)

    inserted = {"pis": 0, "features_updated": 0, "features_created": 0}
    warnings: list[str] = []
    pi_cache: dict[str, ProgramIncrement] = {}
    project_cache: dict[str, Project] = {}

    for _, row in df.iterrows():
        jira_key = str(row.get(FEAT_COL_KEY, "")).strip()
        if not jira_key or jira_key == "nan":
            continue

        summary = str(row.get(FEAT_COL_SUMMARY, "")).strip()
        status = str(row.get(FEAT_COL_STATUS, "")).strip()
        pi_raw = str(row.get(FEAT_COL_PI, "")).strip()
        assignee = str(row.get(FEAT_COL_ASSIGNEE, "")).strip() or None
        issue_id_raw = row.get(FEAT_COL_ISSUE_ID, 0)

        try:
            jira_id = int(issue_id_raw) if issue_id_raw and str(issue_id_raw) != "nan" else abs(hash(jira_key)) % (10**8)
        except (ValueError, TypeError):
            jira_id = abs(hash(jira_key)) % (10**8)

        project_key = jira_key.rsplit("-", 1)[0] if "-" in jira_key else jira_key
        if project_key not in project_cache:
            project_cache[project_key] = _get_or_create_project(
                session, site, project_key, project_key
            )
        project = project_cache[project_key]

        # PI
        pi: Optional[ProgramIncrement] = None
        parsed = parse_pi_field(pi_raw)
        if parsed:
            pi_name, pi_start, pi_end = parsed
            if pi_name not in pi_cache:
                pi_cache[pi_name] = _get_or_create_pi(session, org, pi_name, pi_start, pi_end)
                inserted["pis"] += 1
            pi = pi_cache[pi_name]

        # Upsert the feature issue — update its real status/summary if it already exists
        existing = session.scalars(
            select(Issue).where(Issue.site_id == site.id, Issue.jira_key == jira_key)
        ).first()

        if existing:
            existing.summary = summary or existing.summary
            existing.status = status or existing.status
            existing.status_category = _status_to_category(status)
            existing.assignee = assignee
            session.flush()
            inserted["features_updated"] += 1
        else:
            _upsert_issue(
                session, site, project, sprint=None,
                jira_key=jira_key,
                jira_id=jira_id,
                issue_type=IssueType.EPIC.value,
                summary=summary,
                status=status,
                story_points=None,
                assignee=assignee,
                priority=None,
            )
            inserted["features_created"] += 1

    session.commit()
    return {"inserted": inserted, "warnings": warnings}


# ---------------------------------------------------------------------------
# File type detection
# ---------------------------------------------------------------------------

def _detect_file_type(filename: str, df: pd.DataFrame) -> str:
    """Return 'stories_csv' or 'features_xlsx' based on filename + columns."""
    name_lower = filename.lower()
    cols = set(df.columns.tolist())

    if "stories" in name_lower or COL_STORY_POINTS in cols:
        return "stories_csv"
    if "features" in name_lower or "isaac" in name_lower:
        return "features_xlsx"
    # Fallback: if it has Feature Link column → stories; otherwise features
    if COL_FEATURE_LINK in cols:
        return "stories_csv"
    return "features_xlsx"


# ---------------------------------------------------------------------------
# Upload endpoint
# ---------------------------------------------------------------------------

@router.post("")
async def upload_file(file: UploadFile = File(...)):
    filename = file.filename or ""
    content = await file.read()

    # Parse into DataFrame
    try:
        if filename.lower().endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content), low_memory=False)
        elif filename.lower().endswith((".xlsx", ".xls")):
            df = pd.read_excel(io.BytesIO(content))
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type. Upload CSV or XLSX.")
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not parse file: {e}")

    file_type = _detect_file_type(filename, df)

    SessionLocal = get_session_maker()
    try:
        with SessionLocal() as session:
            if file_type == "stories_csv":
                result = ingest_stories_csv(df, session)
            else:
                result = ingest_features_xlsx(df, session)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ingestion error: {e}")

    return JSONResponse({
        "status": "ok",
        "file_type": file_type,
        "filename": filename,
        "rows_read": len(df),
        **result,
    })
