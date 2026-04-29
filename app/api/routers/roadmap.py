from __future__ import annotations
from fastapi import APIRouter
from sqlalchemy import select, text
from app.models import Issue, IssueType, FeatureMembership, get_session_maker
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


@router.get("", response_model=list[RoadmapFeature])
def get_roadmap():
    SessionLocal = get_session_maker()
    with SessionLocal() as session:
        # Get all epic/feature issues
        epics = session.scalars(
            select(Issue).where(Issue.issue_type == IssueType.EPIC.value)
        ).all()

        # Get all memberships and story issues
        memberships = session.scalars(select(FeatureMembership)).all()
        all_stories = session.scalars(
            select(Issue).where(Issue.issue_type == IssueType.STORY.value)
        ).all()
        story_by_id = {s.id: s for s in all_stories}

        # Build story counts per feature
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
                ts = row[1]
                te = row[2]
                if ts or te:
                    roadmap_dates[row[0]] = {
                        "target_start_date": str(ts)[:10] if ts else None,
                        "target_end_date": str(te)[:10] if te else None,
                    }
        except Exception as exc:
            import sys
            print(f"roadmap date fetch error: {exc}", file=sys.stderr)

        results = []
        for epic in epics:
            stories = [s for s in feature_stories.get(epic.id, []) if s]
            total = len(stories)
            done = sum(1 for s in stories if s.status_category == "done")
            in_progress = sum(1 for s in stories if s.status_category == "indeterminate")
            todo = total - done - in_progress
            pct = round(done / total * 100, 1) if total else 0.0

            dates = roadmap_dates.get(epic.id, {})

            def _fd(val) -> Optional[str]:
                if not val:
                    return None
                try:
                    s = str(val)
                    return s[:10] if len(s) >= 10 else s
                except Exception:
                    return None

            results.append(RoadmapFeature(
                issue_key=epic.jira_key,
                summary=epic.summary,
                status=epic.status,
                status_category=epic.status_category,
                priority=epic.priority,
                assignee=epic.assignee,
                target_start_date=dates.get("target_start_date"),
                target_end_date=dates.get("target_end_date"),
                due_date=_fd(epic.due_date),
                story_total=total,
                story_done=done,
                story_in_progress=in_progress,
                story_todo=todo,
                pct_complete=pct,
            ))

        # Sort: features with dates first (by target_end), then undated
        results.sort(key=lambda f: (
            f.target_end_date is None,
            f.target_end_date or "",
            f.issue_key,
        ))
        return results
