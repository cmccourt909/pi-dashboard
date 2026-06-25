"""
app/lodestar/context.py

Shared utilities for building Lodestar prompt context.

Extracted from app/api/routers/lodestar.py so that both the lodestar
router and roadmap.py call the same functions — no duplication.

Phase 3 additions:
  - compute_rag_status  (T3.1) — derives RAG colour from rule engine formula
  - _derive_team        (T3.2) — resolves team name from Issue.project_id

Design constraints (from models.py inspection):
  - Issue has NO team_name column. Team is proxied via Issue.project_id
    and the associated Project.jira_key (e.g. "TSU", "PNR", "ISC").
  - lodestar_prompt_version lives on FeatureNarrative, not on Issue.
"""
from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

    from app.models import Issue


# ---------------------------------------------------------------------------
# T3.1 — RAG status derivation
# ---------------------------------------------------------------------------

def compute_rag_status(
    completion_pct: float,
    has_active_blocker: bool,
) -> str:
    """
    Derive the RAG status for a feature from its completion percentage
    and blocker state.

    Rule engine formula (from Phase 1 spec §6.2 and Phase 3 spec R19):
      green  — completion_pct >= 80 AND no active blocker
      amber  — 60 <= completion_pct < 80 AND no active blocker
      red    — completion_pct < 60 OR active blocker (blocker overrides)

    Args:
        completion_pct:     Float 0–100. Percentage of PI stories in
                            status_category='done'.
        has_active_blocker: True if the feature's is_blocked_by list is
                            non-empty at request time.

    Returns:
        One of 'green', 'amber', 'red'.

    Properties (P20):
        Pure and deterministic — same inputs always produce the same output.
    """
    # Blocker overrides completion percentage — always red.
    if has_active_blocker:
        return "red"

    if completion_pct >= 80.0:
        return "green"

    if completion_pct >= 60.0:
        return "amber"

    return "red"


# ---------------------------------------------------------------------------
# T3.2 — Team derivation via Project.jira_key
# ---------------------------------------------------------------------------

def _derive_team(
    pi_stories: "list[Issue]",
    session: "Session",
    team_threshold: float = 0.60,
) -> str:
    """
    Derive the owning team for a feature from its PI stories.

    Because Issue has no team_name column, team is proxied via
    Issue.project_id → Project.jira_key (e.g. "TSU", "PNR", "ISC").

    Rules (R20):
      - If one project key accounts for >= team_threshold of all PI
        stories, return that key as the team name.
      - If no single project meets the threshold (cross-team feature),
        return 'Cross-team'.
      - If pi_stories is empty (feature has no PI stories yet),
        return 'Unassigned'.

    Args:
        pi_stories:      List of Issue ORM objects that are PI-scoped
                         stories for this feature. Already queried in
                         the lodestar router.
        session:         Active SQLAlchemy session — used to resolve
                         Project.jira_key from Issue.project_id.
        team_threshold:  Fraction (default 0.60) a single project must
                         reach to be considered the owning team.

    Returns:
        Team name string: a project key, 'Cross-team', or 'Unassigned'.

    Properties (P21):
        Deterministic given the same pi_stories list and session state.
    """
    if not pi_stories:
        return "Unassigned"

    # Count stories per project_id
    from collections import Counter
    from sqlalchemy import select
    from app.models import Project

    project_id_counts: Counter[int] = Counter(
        s.project_id for s in pi_stories if s.project_id is not None
    )

    if not project_id_counts:
        return "Unassigned"

    total = len(pi_stories)
    majority_project_id, majority_count = project_id_counts.most_common(1)[0]

    if majority_count / total >= team_threshold:
        # Resolve jira_key for the majority project
        project = session.scalar(
            select(Project).where(Project.id == majority_project_id)
        )
        if project:
            return project.jira_key
        # Project row missing — shouldn't happen, but safe fallback
        return "Unassigned"

    return "Cross-team"
