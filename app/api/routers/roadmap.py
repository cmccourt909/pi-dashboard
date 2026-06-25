from __future__ import annotations
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models import (
    Issue, IssueType, FeatureMembership, IssueLink, Sprint,
    ProgramIncrement, Project,
)
from app.api.deps import get_session
from app.api.schemas import FeatureItemOut, PICompletionOut, SprintBreakdownOut
from typing import Optional

# Router for the /api/pis/{pi}/features endpoint
pi_features_router = APIRouter(prefix="/api/pis", tags=["pi-features"])

# ─── Team mapping ─────────────────────────────────────────────────────────────
_PROJECT_KEY_TEAM_MAP: dict[str, str] = {
    "ALPHA": "Alpha",
    "BRAVO": "Bravo",
    "CHARLIE": "Charlie",
    # Legacy mappings (kept for non-demo environments)
    "TSU": "Alpha",
    "ISC": "Bravo",
    "PNR": "Charlie",
}


def _derive_team(project_jira_key: str) -> str:
    """Derive team name from project key or prefix."""
    # Exact match first
    if project_jira_key in _PROJECT_KEY_TEAM_MAP:
        return _PROJECT_KEY_TEAM_MAP[project_jira_key]
    # Prefix match fallback
    for prefix, team in _PROJECT_KEY_TEAM_MAP.items():
        if project_jira_key.startswith(prefix):
            return team
    return "Unassigned"


def compute_rag_status(done_pct: float, days_remaining: int, is_blocked: bool) -> str:
    """Compute RAG status for a feature based on progress and blockers."""
    if is_blocked:
        return "red"
    if done_pct >= 80 or days_remaining > 21:
        return "green"
    if done_pct >= 50 or days_remaining > 7:
        return "amber"
    return "red"


@pi_features_router.get("/{pi}/features", response_model=list[FeatureItemOut])
def get_pi_features(pi: str, session: Session = Depends(get_session)):
    """Return structured feature progress data for a given PI."""

    # Validate PI exists
    pi_obj = session.scalar(
        select(ProgramIncrement).where(ProgramIncrement.name == pi)
    )
    if pi_obj is None:
        raise HTTPException(
            status_code=404,
            detail=f"Program Increment '{pi}' not found",
        )

    # Calculate days remaining in the PI
    now = datetime.now(timezone.utc)
    # Handle both naive and aware datetimes from the database
    pi_end = pi_obj.end_date
    if pi_end.tzinfo is None:
        pi_end = pi_end.replace(tzinfo=timezone.utc)
    days_remaining = max(0, (pi_end - now).days)

    # Load projects for team derivation
    projects = session.scalars(select(Project)).all()
    project_by_id = {p.id: p for p in projects}

    # Load sprints belonging to this PI
    pi_sprints = session.scalars(
        select(Sprint).where(Sprint.pi_id == pi_obj.id)
    ).all()
    sprint_by_id = {s.id: s for s in pi_sprints}

    # Load all features (epics)
    epics = session.scalars(
        select(Issue).where(Issue.issue_type == IssueType.EPIC.value)
    ).all()
    epic_by_id = {e.id: e for e in epics}

    # Load all stories
    all_stories = session.scalars(
        select(Issue).where(Issue.issue_type == IssueType.STORY.value)
    ).all()
    story_by_id = {s.id: s for s in all_stories}

    # Load feature memberships
    memberships = session.scalars(select(FeatureMembership)).all()

    # Build feature_id -> list of story issues
    feature_stories: dict[int, list[Issue]] = {}
    for m in memberships:
        story = story_by_id.get(m.issue_id)
        if story:
            feature_stories.setdefault(m.feature_issue_id, []).append(story)

    # Load all issue links for blockers
    links = session.scalars(
        select(IssueLink).where(IssueLink.link_type == "blocks")
    ).all()

    # Build lookup: issue_id -> jira_key for all issues (stories + epics)
    all_issues_by_id: dict[int, Issue] = {}
    all_issues_by_id.update(epic_by_id)
    all_issues_by_id.update(story_by_id)

    # For each feature, find blockers (issues this feature's stories block)
    # and is_blocked_by (issues that block this feature's stories)
    feature_story_ids: dict[int, set[int]] = {}
    for feat_id, stories in feature_stories.items():
        feature_story_ids[feat_id] = {s.id for s in stories}

    # Also include the epic itself in the set for blocker detection
    for epic in epics:
        feature_story_ids.setdefault(epic.id, set()).add(epic.id)

    # Build result
    results: list[FeatureItemOut] = []

    for epic in epics:
        stories = feature_stories.get(epic.id, [])

        # Filter stories to those in sprints belonging to this PI
        pi_sprint_ids = set(sprint_by_id.keys())
        pi_stories = [s for s in stories if s.sprint_id in pi_sprint_ids]

        # If no stories belong to this PI's sprints, skip this feature
        # (only include features that have work in this PI)
        if not pi_stories:
            continue

        # Team derivation
        project = project_by_id.get(epic.project_id)
        team = _derive_team(project.jira_key) if project else "Unassigned"

        # Completion percentages
        total = len(pi_stories)
        done_count = sum(1 for s in pi_stories if s.status_category == "done")
        in_progress_count = sum(1 for s in pi_stories if s.status_category == "indeterminate")
        todo_count = total - done_count - in_progress_count

        done_pct = round(done_count / total * 100, 1) if total else 0.0
        prog_pct = round(in_progress_count / total * 100, 1) if total else 0.0
        todo_pct = round(100.0 - done_pct - prog_pct, 1)

        # Story points
        sp_done = sum(s.story_points or 0 for s in pi_stories if s.status_category == "done")
        sp_total = sum(s.story_points or 0 for s in pi_stories)

        # Blockers: this feature's stories/epic blocks other issues
        all_feature_issue_ids = feature_story_ids.get(epic.id, set())
        blockers: list[str] = []
        is_blocked_by: list[str] = []

        for link in links:
            # source blocks target
            if link.source_issue_id in all_feature_issue_ids:
                target = all_issues_by_id.get(link.target_issue_id)
                if target:
                    blockers.append(target.jira_key)
            if link.target_issue_id in all_feature_issue_ids:
                source = all_issues_by_id.get(link.source_issue_id)
                if source:
                    is_blocked_by.append(source.jira_key)

        # RAG status
        is_blocked = len(is_blocked_by) > 0
        rag_status = compute_rag_status(done_pct, days_remaining, is_blocked)

        # Sprint breakdown (sprints in this PI)
        sprint_breakdown: list[SprintBreakdownOut] = []
        for sprint in pi_sprints:
            sprint_stories = [s for s in pi_stories if s.sprint_id == sprint.id]
            sprint_done = sum(1 for s in sprint_stories if s.status_category == "done")
            sprint_breakdown.append(SprintBreakdownOut(
                sprint_name=sprint.name,
                state=sprint.state,
                story_count=len(sprint_stories),
                done_count=sprint_done,
            ))

        # PI completion entry
        pi_completion = [PICompletionOut(
            pi_name=pi_obj.name,
            done_pct=done_pct,
            prog_pct=prog_pct,
            todo_pct=todo_pct,
            story_count=total,
            sp_done=sp_done,
            sp_total=sp_total,
        )]

        results.append(FeatureItemOut(
            feature_key=epic.jira_key,
            summary=epic.summary,
            team=team,
            assignee=epic.assignee,
            status=epic.status,
            status_category=epic.status_category,
            rag_status=rag_status,
            pi_completion=pi_completion,
            blockers=blockers,
            is_blocked_by=is_blocked_by,
            sprint_breakdown=sprint_breakdown,
            lodestar_static=None,
        ))

    return results
