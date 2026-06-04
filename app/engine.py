"""
The risk engine. Loads data into a Context, runs all registered rules,
returns sorted Findings.

Usage (as a library):
  from app.engine import run_site
  findings = run_site(site_id=1)
  for f in findings:
      print(f.title)
"""
from __future__ import annotations

import time
import threading
from collections import defaultdict
from datetime import date
from typing import Iterable

from sqlalchemy import select
from sqlalchemy.orm import Session

try:
    from .models import (
        Site, Project, Sprint, Issue, IssueLink, FeatureMembership,
        get_session_maker,
    )
    from .rules import Category, Context, Finding, Severity, all_rules
    from .rules import checks as _checks  # noqa: F401 -- registers the rules
except ImportError:
    from models import (  # type: ignore
        Site, Project, Sprint, Issue, IssueLink, FeatureMembership,
        get_session_maker,
    )
    from rules import Category, Context, Finding, Severity, all_rules  # type: ignore
    from rules import checks as _checks  # noqa


# ---------- TTL cache for run_site results ----------

_cache_lock = threading.Lock()
_cache: dict[str, tuple[float, tuple["Context", list["Finding"]]]] = {}
_CACHE_TTL_SECONDS = 30


def _get_cached(key: str) -> tuple["Context", list["Finding"]] | None:
    with _cache_lock:
        entry = _cache.get(key)
        if entry is None:
            return None
        ts, value = entry
        if time.time() - ts > _CACHE_TTL_SECONDS:
            del _cache[key]
            return None
        return value


def _set_cached(key: str, value: tuple["Context", list["Finding"]]):
    with _cache_lock:
        _cache[key] = (time.time(), value)


def invalidate_cache():
    """Clear the engine cache. Call after data ingestion/upload."""
    with _cache_lock:
        _cache.clear()


def build_context(session: Session, site: Site, today: date | None = None) -> Context:
    today = today or date.today()
    issues = session.scalars(select(Issue).where(Issue.site_id == site.id)).all()
    sprints = session.scalars(select(Sprint).where(Sprint.site_id == site.id)).all()
    projects = session.scalars(select(Project).where(Project.site_id == site.id)).all()
    links = session.scalars(select(IssueLink).where(IssueLink.site_id == site.id)).all()
    memberships = session.scalars(
        select(FeatureMembership).where(FeatureMembership.site_id == site.id)
    ).all()

    issue_by_id = {i.id: i for i in issues}
    issue_by_key = {i.jira_key: i for i in issues}
    sprint_by_id = {s.id: s for s in sprints}
    project_by_id = {p.id: p for p in projects}

    feature_members: dict[int, list[int]] = defaultdict(list)
    for m in memberships:
        feature_members[m.feature_issue_id].append(m.issue_id)

    return Context(
        site_id=site.id,
        site_name=site.display_name,
        today=today,
        issues=list(issues),
        sprints=list(sprints),
        projects=list(projects),
        links=list(links),
        memberships=list(memberships),
        issue_by_id=issue_by_id,
        issue_by_key=issue_by_key,
        sprint_by_id=sprint_by_id,
        project_by_id=project_by_id,
        feature_members=dict(feature_members),
    )


def run_rules(ctx: Context) -> list[Finding]:
    findings: list[Finding] = []
    for rule in all_rules():
        try:
            result = rule(ctx)
            if result is None:
                continue
            findings.extend(result)
        except Exception as e:
            # Don't let one bad rule take down the run. Emit a warning finding.
            findings.append(Finding(
                rule_id=getattr(rule, "id", "unknown"),
                severity=Severity.WARNING,
                category=Category.HYGIENE,
                title=f"Rule errored: {getattr(rule, 'id', 'unknown')}",
                detail=f"{type(e).__name__}: {e}",
            ))
    findings.sort(key=lambda f: f.sort_key())
    return findings


def run_site(site_id: int | None = None, today: date | None = None) -> tuple[Context, list[Finding]]:
    cache_key = f"{site_id}:{today}"
    cached = _get_cached(cache_key)
    if cached is not None:
        return cached

    SessionLocal = get_session_maker()
    with SessionLocal() as session:
        if site_id is None:
            site = session.scalars(select(Site)).first()
        else:
            site = session.get(Site, site_id)
        if not site:
            raise RuntimeError("No Site found. Run ingest first.")
        ctx = build_context(session, site, today)
        findings = run_rules(ctx)
        result = (ctx, findings)
        _set_cached(cache_key, result)
        return result
