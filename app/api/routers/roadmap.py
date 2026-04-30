from __future__ import annotations
from fastapi import APIRouter
from sqlalchemy import select, text
from app.models import Issue, IssueType, FeatureMembership, Sprint, ProgramIncrement, get_session_maker
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/roadmap", tags=["roadmap"])


class RoadmapFeature(BaseModel):
    issue_key: str
    summary: str
    status: str
    status_category: str
    priority: Optional[str]
    assignee: Optional[str]
    target_start_date: Optional[str]
    target_end_date: Optional[str]
    due_date: Optional[str]
    story_total: int
    story_done: int
    story_in_progress: int
    story_todo: int
    pct_complete: float


class RoadmapSprint(BaseModel):
    name: str
    start: Optional[str]
    end: Optional[str]
    pi: Optional[str]


class RoadmapPI(BaseModel):
    name: str
    start: str
    end: str


class RoadmapResponse(BaseModel):
    features: list[RoadmapFeature]
    pis: list[RoadmapPI]
    sprints: list[RoadmapSprint]


def _fmt_date(val) -> Optional[str]:
    if not val:
        return None
    try:
        s = str(val)
        return s[:10] if len(s) >= 10 else s
    except Exception:
        return None


@router.get("", response_model=RoadmapResponse)
def get_roadmap():
    SessionLocal = get_session_maker()
    with SessionLocal() as session:

        # ── Features ──────────────────────────────────────────────────────────
        epics = session.scalars(
            select(Issue).where(Issue.issue_type == IssueType.EPIC.value)
        ).all()

        memberships = session.scalars(select(FeatureMembership)).all()
        all_stories = session.scalars(
            select(Issue).where(Issue.issue_type == IssueType.STORY.value)
        ).all()
        story_by_id = {s.id: s for s in all_stories}

        feature_stories: dict[int, list] = {}
        for m in memberships:
            feature_stories.setdefault(m.feature_issue_id, []).append(
                story_by_id.get(m.issue_id)
            )

        # Fetch roadmap dates via raw SQL (added by migration)
        roadmap_dates: dict[int, dict] = {}
        try:
            rows = session.execute(
                text("SELECT id, target_start_date, target_end_date FROM issue")
            ).fetchall()
            for row in rows:
                ts, te = row[1], row[2]
                if ts or te:
                    roadmap_dates[row[0]] = {
                        "target_start_date": _fmt_date(ts),
                        "target_end_date": _fmt_date(te),
                    }
        except Exception as exc:
            import sys
            print(f"roadmap date fetch error: {exc}", file=sys.stderr)

        features = []
        for epic in epics:
            stories = [s for s in feature_stories.get(epic.id, []) if s]
            total = len(stories)
            done = sum(1 for s in stories if s.status_category == "done")
            in_progress = sum(1 for s in stories if s.status_category == "indeterminate")
            todo = total - done - in_progress
            pct = round(done / total * 100, 1) if total else 0.0
            dates = roadmap_dates.get(epic.id, {})

            features.append(RoadmapFeature(
                issue_key=epic.jira_key,
                summary=epic.summary,
                status=epic.status,
                status_category=epic.status_category,
                priority=epic.priority,
                assignee=epic.assignee,
                target_start_date=dates.get("target_start_date"),
                target_end_date=dates.get("target_end_date"),
                due_date=_fmt_date(epic.due_date),
                story_total=total,
                story_done=done,
                story_in_progress=in_progress,
                story_todo=todo,
                pct_complete=pct,
            ))

        features.sort(key=lambda f: (
            f.target_end_date is None,
            f.target_end_date or "",
            f.issue_key,
        ))

        # ── PIs ───────────────────────────────────────────────────────────────
        pi_rows = session.scalars(
            select(ProgramIncrement).order_by(ProgramIncrement.start_date)
        ).all()

        pis = [
            RoadmapPI(
                name=pi.name,
                start=_fmt_date(pi.start_date),
                end=_fmt_date(pi.end_date),
            )
            for pi in pi_rows
            if pi.start_date and pi.end_date
        ]

        # ── Sprints ───────────────────────────────────────────────────────────
        sprint_rows = session.scalars(
            select(Sprint).order_by(Sprint.start_date)
        ).all()

        # Build pi_id -> pi_name lookup
        pi_name_by_id = {pi.id: pi.name for pi in pi_rows}

        # Deduplicate by (start_date, end_date) — multiple teams share the same
        # sprint window (e.g. TSU 26.2.3, ISC 26.2.3, Panthers 26.2.3 are all
        # the same two-week band). Keep the shortest/cleanest name per window.
        import re
        seen: dict[tuple, RoadmapSprint] = {}
        for s in sprint_rows:
            if not s.start_date or not s.end_date:
                continue
            key = (_fmt_date(s.start_date), _fmt_date(s.end_date))
            pi_name = pi_name_by_id.get(s.pi_id) if s.pi_id else None

            # Extract sprint number label e.g. "26.2.3" from any name variant
            match = re.search(r'\d+\.\d+(?:\.\d+)?', s.name)
            canonical = f"Sprint {match.group()}" if match else s.name

            if key not in seen:
                seen[key] = RoadmapSprint(
                    name=canonical,
                    start=key[0],
                    end=key[1],
                    pi=pi_name,
                )

        # Sort deduplicated sprints by start date
        sprints = sorted(seen.values(), key=lambda s: s.start or "")

        # If no PIs in DB, derive a single band from feature date range
        if not pis and features:
            dated = [f for f in features if f.target_start_date and f.target_end_date]
            if dated:
                min_start = min(f.target_start_date for f in dated)
                max_end   = max(f.target_end_date   for f in dated)
                pis = [RoadmapPI(name="PI 26.2 → 26.3", start=min_start, end=max_end)]

        return RoadmapResponse(features=features, pis=pis, sprints=sprints)
