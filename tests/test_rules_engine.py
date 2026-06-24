"""
Regression tests: Rule engine (checks.py).
Validates that findings are generated correctly from data.
"""
from datetime import date, datetime
from app.models import (
    Issue, Sprint, Project, IssueLink, FeatureMembership,
    IssueType, SprintState,
)
from app.rules import Context, Finding, Severity, Category, all_rules


def _make_context(issues=None, sprints=None, projects=None, links=None, memberships=None, today=None):
    """Build a minimal test context."""
    issues = issues or []
    sprints = sprints or []
    projects = projects or []
    links = links or []
    memberships = memberships or []

    issue_by_id = {i.id: i for i in issues}
    sprint_by_id = {s.id: s for s in sprints}
    project_by_id = {p.id: p for p in projects}
    feature_members = {}
    for m in memberships:
        feature_members.setdefault(m.feature_issue_id, []).append(m.issue_id)

    return Context(
        site_id=1,
        site_name="Test",
        today=today or date(2026, 6, 24),
        issues=issues,
        sprints=sprints,
        projects=projects,
        links=links,
        memberships=memberships,
        issue_by_id=issue_by_id,
        issue_by_key={i.jira_key: i for i in issues},
        sprint_by_id=sprint_by_id,
        project_by_id=project_by_id,
        feature_members=feature_members,
    )


def _make_issue(id=1, jira_key="TST-1", issue_type="story", status_category="new",
                assignee="Alice", sprint_id=None, story_points=3, updated_at=None, **kwargs):
    """Create a mock Issue-like object."""
    issue = type("Issue", (), {
        "id": id, "jira_key": jira_key, "issue_type": issue_type,
        "status_category": status_category, "assignee": assignee,
        "sprint_id": sprint_id, "story_points": story_points,
        "status": kwargs.get("status", "Open"),
        "updated_at": updated_at or datetime(2026, 6, 20),
        "project_id": kwargs.get("project_id", 1),
        "due_date": kwargs.get("due_date"),
    })()
    return issue


def _make_sprint(id=1, state="active", **kwargs):
    """Create a mock Sprint-like object."""
    return type("Sprint", (), {
        "id": id, "state": state, "name": kwargs.get("name", "Sprint 1"),
        "start_date": kwargs.get("start_date", datetime(2026, 6, 10)),
        "end_date": kwargs.get("end_date", datetime(2026, 6, 24)),
        "pi_id": kwargs.get("pi_id"),
        "project_id": kwargs.get("project_id", 1),
    })()


def test_rules_are_registered():
    """At least one rule is registered."""
    rules = all_rules()
    assert len(rules) > 0


def test_unassigned_in_active_sprint():
    """Rule detects unassigned stories in active sprints."""
    sprint = _make_sprint(id=1, state="active")
    issue = _make_issue(id=1, sprint_id=1, assignee=None, issue_type="story")
    ctx = _make_context(issues=[issue], sprints=[sprint])

    from app.rules.checks import unassigned_in_active_sprint
    findings = list(unassigned_in_active_sprint(ctx))
    assert len(findings) == 1
    assert findings[0].severity in (Severity.WARNING, Severity.INFO)
    assert "TST-1" in findings[0].issue_keys


def test_no_finding_when_assigned():
    """No finding when all active sprint stories have assignees."""
    sprint = _make_sprint(id=1, state="active")
    issue = _make_issue(id=1, sprint_id=1, assignee="Alice", issue_type="story")
    ctx = _make_context(issues=[issue], sprints=[sprint])

    from app.rules.checks import unassigned_in_active_sprint
    findings = list(unassigned_in_active_sprint(ctx))
    assert len(findings) == 0


def test_stale_in_progress():
    """Rule detects in-progress issues with no update for 10+ days."""
    issue = _make_issue(
        id=1, status_category="indeterminate",
        updated_at=datetime(2026, 6, 1),  # 23 days stale vs today=June 24
    )
    ctx = _make_context(issues=[issue])

    from app.rules.checks import stale_in_progress
    findings = list(stale_in_progress(ctx))
    assert len(findings) == 1
    assert findings[0].rule_id == "flow.stale_in_progress"


def test_blocker_not_started():
    """Rule detects issues blocked by un-started work."""
    blocker = _make_issue(id=1, jira_key="TST-1", status_category="new")
    blocked = _make_issue(id=2, jira_key="TST-2", status_category="indeterminate")

    link = type("IssueLink", (), {
        "source_issue_id": 1, "target_issue_id": 2, "link_type": "blocks",
    })()

    ctx = _make_context(issues=[blocker, blocked], links=[link])

    from app.rules.checks import blocker_not_started
    findings = list(blocker_not_started(ctx))
    assert len(findings) == 1
    assert "TST-2" in findings[0].issue_keys


def test_finding_sort_order():
    """Findings sort by severity (critical first), then category."""
    from app.rules import _SEVERITY_ORDER
    f_critical = Finding(
        rule_id="test.crit", severity=Severity.CRITICAL,
        category=Category.TRAJECTORY, title="Critical",
        detail="x",
    )
    f_warning = Finding(
        rule_id="test.warn", severity=Severity.WARNING,
        category=Category.FLOW, title="Warning",
        detail="x",
    )
    f_info = Finding(
        rule_id="test.info", severity=Severity.INFO,
        category=Category.HYGIENE, title="Info",
        detail="x",
    )
    findings = [f_info, f_critical, f_warning]
    findings.sort(key=lambda f: f.sort_key())
    assert findings[0].severity == Severity.CRITICAL
    assert findings[1].severity == Severity.WARNING
    assert findings[2].severity == Severity.INFO
