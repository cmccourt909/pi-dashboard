"""
Regression tests: SQLAlchemy models and database schema.
"""
from datetime import datetime
from app.models import (
    Organization, Site, Project, Sprint, Issue, IssueLink,
    ProgramIncrement, FeatureMembership, IssueType, SprintState,
)


def test_issue_has_target_date_columns(engine):
    """Issue model includes target_start_date and target_end_date (regression: ORM vs raw SQL)."""
    from app.models import Issue
    columns = [c.key for c in Issue.__table__.columns]
    assert "target_start_date" in columns
    assert "target_end_date" in columns


def test_create_organization(session):
    """Organization can be created and queried."""
    org = Organization(name="Test Org")
    session.add(org)
    session.flush()
    assert org.id is not None
    assert org.name == "Test Org"


def test_create_issue_with_all_fields(session):
    """Issue with all fields including target dates persists correctly."""
    org = Organization(name="Test")
    session.add(org)
    session.flush()

    site = Site(base_url="https://test.local", display_name="Test", org_id=org.id)
    session.add(site)
    session.flush()

    proj = Project(site_id=site.id, jira_key="TST", name="Test Project")
    session.add(proj)
    session.flush()

    issue = Issue(
        site_id=site.id,
        project_id=proj.id,
        jira_key="TST-1",
        jira_id=1001,
        issue_type=IssueType.STORY.value,
        summary="Test story",
        status="In Progress",
        status_category="indeterminate",
        story_points=5.0,
        target_start_date=datetime(2026, 3, 1),
        target_end_date=datetime(2026, 5, 15),
    )
    session.add(issue)
    session.flush()

    assert issue.id is not None
    assert issue.target_start_date == datetime(2026, 3, 1)
    assert issue.target_end_date == datetime(2026, 5, 15)


def test_feature_membership_relationship(session):
    """Feature membership correctly links stories to epics."""
    org = Organization(name="Test")
    session.add(org)
    session.flush()

    site = Site(base_url="https://test.local", display_name="Test", org_id=org.id)
    session.add(site)
    session.flush()

    proj = Project(site_id=site.id, jira_key="TST", name="Test")
    session.add(proj)
    session.flush()

    feature = Issue(
        site_id=site.id, project_id=proj.id, jira_key="TST-100",
        jira_id=100, issue_type=IssueType.EPIC.value,
        summary="Feature", status="Open", status_category="new",
    )
    story = Issue(
        site_id=site.id, project_id=proj.id, jira_key="TST-101",
        jira_id=101, issue_type=IssueType.STORY.value,
        summary="Story", status="Done", status_category="done",
    )
    session.add_all([feature, story])
    session.flush()

    fm = FeatureMembership(
        site_id=site.id, issue_id=story.id,
        feature_issue_id=feature.id, source="feature_link_field",
    )
    session.add(fm)
    session.flush()

    assert fm.issue_id == story.id
    assert fm.feature_issue_id == feature.id
