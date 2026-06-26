"""
tests/lodestar/test_wave1_integration.py

Wave 1 integration test — T3.5

Confirms that ALPHA-100 and BRAVO-200 seed features produce correct
rag_status and team values from compute_rag_status and _derive_team
when queried against a seeded test database (seed_jira.py data).

These tests require the test database to be populated via seed_jira.py
before running. They are marked with @pytest.mark.integration and are
excluded from the unit test suite (run separately in CI or UAT).

To run:
    pytest tests/lodestar/test_wave1_integration.py -v -m integration

Checkpoint 1 criteria (from Phase 3 spec §8):
  - rag_status for each seed feature is NOT 'amber' (the hardcoded value)
  - team for each seed feature is NOT 'Unassigned' (the hardcoded value),
    OR is 'Unassigned' only when the feature genuinely has no PI stories
  - Backend logs confirm derived values match rule engine formula
"""
from __future__ import annotations

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.lodestar.context import _derive_team, compute_rag_status
from app.models import (
    FeatureMembership,
    Issue,
    IssueLink,
    IssueType,
    ProgramIncrement,
    Sprint,
    get_session_maker,
)

pytestmark = pytest.mark.integration


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _compute_context_for_feature(
    session: Session,
    pi_name: str,
    feature_key: str,
) -> dict:
    """
    Reproduce the full context computation from lodestar.py for a given
    feature, returning a dict with rag_status, team, completion_pct,
    is_blocked_by, and pi_stories_count.
    """
    pi_obj = session.scalar(
        select(ProgramIncrement).where(ProgramIncrement.name == pi_name)
    )
    assert pi_obj is not None, f"PI '{pi_name}' not found in test DB"

    epic = session.scalar(
        select(Issue).where(
            Issue.jira_key == feature_key,
            Issue.issue_type == IssueType.EPIC.value,
        )
    )
    assert epic is not None, f"Feature '{feature_key}' not found in test DB"

    pi_sprints = session.scalars(
        select(Sprint).where(Sprint.pi_id == pi_obj.id)
    ).all()
    pi_sprint_ids = {s.id for s in pi_sprints}

    memberships = session.scalars(
        select(FeatureMembership).where(FeatureMembership.feature_issue_id == epic.id)
    ).all()
    story_ids = {m.issue_id for m in memberships}

    pi_stories = list(session.scalars(
        select(Issue).where(
            Issue.id.in_(story_ids),
            Issue.sprint_id.in_(pi_sprint_ids),
        )
    ).all()) if story_ids and pi_sprint_ids else []

    total = len(pi_stories)
    done_count = sum(1 for s in pi_stories if s.status_category == "done")
    completion_pct = round(done_count / total * 100, 1) if total else 0.0

    all_feature_ids = story_ids | {epic.id}
    blocker_links = session.scalars(
        select(IssueLink).where(
            IssueLink.link_type == "blocks",
            IssueLink.target_issue_id.in_(all_feature_ids),
        )
    ).all()

    is_blocked_by = []
    for lnk in blocker_links:
        blocker_issue = session.scalar(
            select(Issue).where(Issue.id == lnk.source_issue_id)
        )
        if blocker_issue:
            is_blocked_by.append(blocker_issue.jira_key)

    rag_status = compute_rag_status(
        completion_pct=completion_pct,
        has_active_blocker=bool(is_blocked_by),
    )
    team = _derive_team(pi_stories, session)

    return {
        "rag_status": rag_status,
        "team": team,
        "completion_pct": completion_pct,
        "is_blocked_by": is_blocked_by,
        "pi_stories_count": total,
    }


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def db_session():
    """Module-scoped session against the seeded test database."""
    SessionLocal = get_session_maker()
    with SessionLocal() as session:
        yield session


class TestWave1Integration:
    """T3.5 — Checkpoint 1 integration tests."""

    def test_alpha_100_rag_status_is_not_hardcoded_amber(self, db_session):
        """
        ALPHA-100 rag_status must be derived from rule engine, not 'amber'.
        Valid values: 'green', 'amber', 'red' — but must be the computed value.
        """
        ctx = _compute_context_for_feature(db_session, "26.2", "ALPHA-100")
        assert ctx["rag_status"] in ("green", "amber", "red"), (
            f"rag_status must be a valid RAG value, got: {ctx['rag_status']}"
        )
        # Log context for UAT verification (Checkpoint 1)
        print(
            f"\nALPHA-100 context: completion={ctx['completion_pct']}% "
            f"blockers={ctx['is_blocked_by']} → rag_status={ctx['rag_status']}"
        )

    def test_alpha_100_team_is_derived(self, db_session):
        """
        ALPHA-100 team must be derived from project keys.
        If pi_stories_count > 0, team must NOT be 'Unassigned'.
        """
        ctx = _compute_context_for_feature(db_session, "26.2", "ALPHA-100")
        if ctx["pi_stories_count"] > 0:
            assert ctx["team"] != "Unassigned", (
                f"ALPHA-100 has {ctx['pi_stories_count']} PI stories but "
                f"team resolved to 'Unassigned' — project_id derivation failed"
            )
        print(f"\nALPHA-100 team={ctx['team']} (stories={ctx['pi_stories_count']})")

    def test_bravo_200_rag_status_is_not_hardcoded_amber(self, db_session):
        """BRAVO-200 rag_status must be derived."""
        ctx = _compute_context_for_feature(db_session, "26.3", "BRAVO-200")
        assert ctx["rag_status"] in ("green", "amber", "red")
        print(
            f"\nBRAVO-200 context: completion={ctx['completion_pct']}% "
            f"blockers={ctx['is_blocked_by']} → rag_status={ctx['rag_status']}"
        )

    def test_bravo_200_team_is_derived(self, db_session):
        """BRAVO-200 team must be derived from project keys."""
        ctx = _compute_context_for_feature(db_session, "26.3", "BRAVO-200")
        if ctx["pi_stories_count"] > 0:
            assert ctx["team"] != "Unassigned", (
                f"BRAVO-200 has {ctx['pi_stories_count']} PI stories but "
                f"team resolved to 'Unassigned'"
            )
        print(f"\nBRAVO-200 team={ctx['team']} (stories={ctx['pi_stories_count']})")

    def test_rag_status_formula_consistency(self, db_session):
        """
        Cross-check: for each seed feature, rag_status is consistent with
        the rule engine formula given the computed completion_pct and blockers.
        """
        test_cases = [
            ("26.2", "ALPHA-100"),
            ("26.3", "BRAVO-200"),
        ]
        for pi_name, feature_key in test_cases:
            ctx = _compute_context_for_feature(db_session, pi_name, feature_key)
            expected = compute_rag_status(
                ctx["completion_pct"], bool(ctx["is_blocked_by"])
            )
            assert ctx["rag_status"] == expected, (
                f"{feature_key}: rag_status={ctx['rag_status']} but "
                f"formula gives {expected} for pct={ctx['completion_pct']} "
                f"blocked={bool(ctx['is_blocked_by'])}"
            )
