"""
tests/lodestar/test_context.py

Unit tests for app/lodestar/context.py

Covers:
  T3.1 — compute_rag_status (R19.3–R19.6, R19.7, P20)
  T3.2 — _derive_team       (R20.2–R20.4, R20.6, P21)
"""
from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from app.lodestar.context import _derive_team, compute_rag_status


# ===========================================================================
# T3.1 — compute_rag_status
# ===========================================================================

class TestComputeRagStatus:
    """R19.3–R19.7 acceptance criteria + P20 purity."""

    # ── R19.3 — green branch ────────────────────────────────────────────────

    def test_green_at_exactly_80(self):
        assert compute_rag_status(80.0, False) == "green"

    def test_green_above_80(self):
        assert compute_rag_status(95.0, False) == "green"

    def test_green_at_100(self):
        assert compute_rag_status(100.0, False) == "green"

    # ── R19.4 — amber branch ────────────────────────────────────────────────

    def test_amber_at_exactly_60(self):
        assert compute_rag_status(60.0, False) == "amber"

    def test_amber_at_79_9(self):
        assert compute_rag_status(79.9, False) == "amber"

    def test_amber_midpoint(self):
        assert compute_rag_status(70.0, False) == "amber"

    # ── R19.5 — red (completion) branch ─────────────────────────────────────

    def test_red_below_60(self):
        assert compute_rag_status(59.9, False) == "red"

    def test_red_at_zero(self):
        assert compute_rag_status(0.0, False) == "red"

    def test_red_at_50(self):
        assert compute_rag_status(50.0, False) == "red"

    # ── R19.6 — blocker override (red regardless of completion_pct) ─────────

    def test_blocker_overrides_green(self):
        """A feature at 90% complete with an active blocker is still red."""
        assert compute_rag_status(90.0, True) == "red"

    def test_blocker_overrides_amber(self):
        assert compute_rag_status(70.0, True) == "red"

    def test_blocker_overrides_red(self):
        """Red stays red when there's also a blocker."""
        assert compute_rag_status(30.0, True) == "red"

    def test_blocker_at_100_pct_is_red(self):
        """Even 100% complete with a blocker returns red."""
        assert compute_rag_status(100.0, True) == "red"

    # ── P20 — purity / determinism ──────────────────────────────────────────

    def test_pure_same_inputs_same_output(self):
        """Calling twice with identical args returns identical results."""
        args = (75.0, False)
        assert compute_rag_status(*args) == compute_rag_status(*args)

    def test_returns_string(self):
        for pct, blk in [(80.0, False), (70.0, False), (50.0, False), (80.0, True)]:
            result = compute_rag_status(pct, blk)
            assert isinstance(result, str)
            assert result in ("green", "amber", "red")

    # ── Boundary: exactly 80 with blocker ───────────────────────────────────

    def test_exactly_80_with_blocker_is_red(self):
        """Blocker overrides the green threshold."""
        assert compute_rag_status(80.0, True) == "red"


# ===========================================================================
# T3.2 — _derive_team
# ===========================================================================

def _make_story(project_id: int) -> MagicMock:
    """Create a minimal mock Issue with the given project_id."""
    story = MagicMock()
    story.project_id = project_id
    return story


def _make_session(project_id: int, jira_key: str) -> MagicMock:
    """
    Create a mock SQLAlchemy session whose scalar() returns a Project
    with the given jira_key when queried for the given project_id.
    """
    project = MagicMock()
    project.jira_key = jira_key

    session = MagicMock()
    session.scalar.return_value = project
    return session


class TestDeriveTeam:
    """R20.2–R20.4, R20.6, P21."""

    # ── R20.4 — empty stories → Unassigned ──────────────────────────────────

    def test_empty_stories_returns_unassigned(self):
        session = MagicMock()
        assert _derive_team([], session) == "Unassigned"
        session.scalar.assert_not_called()

    # ── R20.2 — single-team majority ─────────────────────────────────────────

    def test_single_team_majority_exact_threshold(self):
        """3 of 5 stories (60%) from project 1 → project 1's jira_key."""
        stories = [_make_story(1)] * 3 + [_make_story(2)] * 2
        session = _make_session(1, "TSU")
        result = _derive_team(stories, session)
        assert result == "TSU"

    def test_single_team_majority_above_threshold(self):
        """All 4 stories from PNR."""
        stories = [_make_story(2)] * 4
        session = _make_session(2, "PNR")
        assert _derive_team(stories, session) == "PNR"

    def test_single_team_just_above_threshold(self):
        """4 of 6 stories (66.7%) → majority."""
        stories = [_make_story(3)] * 4 + [_make_story(1)] * 2
        session = _make_session(3, "ISC")
        assert _derive_team(stories, session) == "ISC"

    # ── R20.3 — cross-team ──────────────────────────────────────────────────

    def test_cross_team_when_no_majority(self):
        """50/50 split → Cross-team."""
        stories = [_make_story(1)] * 3 + [_make_story(2)] * 3
        session = MagicMock()
        assert _derive_team(stories, session) == "Cross-team"
        session.scalar.assert_not_called()

    def test_cross_team_three_way_split(self):
        """33/33/33 split → Cross-team."""
        stories = [_make_story(1)] * 2 + [_make_story(2)] * 2 + [_make_story(3)] * 2
        session = MagicMock()
        assert _derive_team(stories, session) == "Cross-team"

    def test_cross_team_just_below_threshold(self):
        """59% (not quite 60%) → Cross-team."""
        # 59 out of 100
        stories = [_make_story(1)] * 59 + [_make_story(2)] * 41
        session = MagicMock()
        assert _derive_team(stories, session) == "Cross-team"

    # ── null project_id safety ───────────────────────────────────────────────

    def test_null_project_id_excluded_from_count(self):
        """Stories with null project_id are excluded; remaining majority wins."""
        story_null = MagicMock()
        story_null.project_id = None
        stories = [_make_story(1)] * 4 + [story_null] * 2
        session = _make_session(1, "TSU")
        # 4 of 6 total stories, but only 4 of 4 valid → 100% → TSU
        # NOTE: total denominator is len(pi_stories) = 6
        # 4/6 = 66.7% >= 60% → TSU wins
        result = _derive_team(stories, session)
        assert result == "TSU"

    def test_all_null_project_id_returns_unassigned(self):
        """All stories have null project_id → Unassigned."""
        story_null = MagicMock()
        story_null.project_id = None
        stories = [story_null] * 3
        session = MagicMock()
        assert _derive_team(stories, session) == "Unassigned"

    # ── Project row missing (defensive) ─────────────────────────────────────

    def test_missing_project_row_returns_unassigned(self):
        """If the majority project_id has no Project row, fall back gracefully."""
        stories = [_make_story(99)] * 5
        session = MagicMock()
        session.scalar.return_value = None   # Project not found
        assert _derive_team(stories, session) == "Unassigned"

    # ── Custom threshold ─────────────────────────────────────────────────────

    def test_custom_threshold_80_pct(self):
        """At 80% threshold, 4/6 (66.7%) should be Cross-team."""
        stories = [_make_story(1)] * 4 + [_make_story(2)] * 2
        session = MagicMock()
        assert _derive_team(stories, session, team_threshold=0.80) == "Cross-team"

    def test_custom_threshold_80_pct_met(self):
        """At 80% threshold, 5/6 (83.3%) should win."""
        stories = [_make_story(1)] * 5 + [_make_story(2)] * 1
        session = _make_session(1, "TSU")
        assert _derive_team(stories, session, team_threshold=0.80) == "TSU"

    # ── P21 — determinism ────────────────────────────────────────────────────

    def test_deterministic_same_input_same_output(self):
        """Calling twice with same inputs returns same result."""
        stories = [_make_story(1)] * 4 + [_make_story(2)] * 2
        session = _make_session(1, "PNR")
        r1 = _derive_team(list(stories), session)
        r2 = _derive_team(list(stories), session)
        assert r1 == r2
