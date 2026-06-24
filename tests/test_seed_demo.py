"""
Regression tests: Demo data seeding.
"""
from app.seed_demo import seed
from app.models import (
    get_engine, get_session_maker, Organization, Site, Project,
    Sprint, Issue, ProgramIncrement, FeatureMembership, IssueLink,
)
from sqlalchemy import select


def test_seed_creates_expected_structure():
    """Seed creates org, site, PIs, projects, sprints, issues, and links."""
    seed()
    SessionLocal = get_session_maker()
    with SessionLocal() as session:
        orgs = session.scalars(select(Organization)).all()
        assert len(orgs) == 1
        assert orgs[0].name == "Acme Corp"

        sites = session.scalars(select(Site)).all()
        assert len(sites) == 1

        pis = session.scalars(select(ProgramIncrement)).all()
        pi_names = [p.name for p in pis]
        assert "26.2" in pi_names
        assert "26.3" in pi_names

        projects = session.scalars(select(Project)).all()
        assert len(projects) == 3  # Alpha, Bravo, Charlie

        sprints = session.scalars(select(Sprint)).all()
        assert len(sprints) == 30  # 5 sprints * 3 teams * 2 PIs

        issues = session.scalars(select(Issue)).all()
        assert len(issues) >= 90  # ~100 stories + 6 features

        memberships = session.scalars(select(FeatureMembership)).all()
        assert len(memberships) > 0

        links = session.scalars(select(IssueLink)).all()
        assert len(links) > 0  # Blocking dependencies


def test_seed_pi_dates_are_correct():
    """PI 26.2 and 26.3 have expected date ranges."""
    seed()
    SessionLocal = get_session_maker()
    with SessionLocal() as session:
        pi262 = session.scalars(
            select(ProgramIncrement).where(ProgramIncrement.name == "26.2")
        ).first()
        assert pi262 is not None
        assert pi262.start_date.year == 2026
        assert pi262.start_date.month == 3

        pi263 = session.scalars(
            select(ProgramIncrement).where(ProgramIncrement.name == "26.3")
        ).first()
        assert pi263 is not None
        assert pi263.start_date.month == 5


def test_seed_has_mixed_statuses():
    """Seeded issues have a mix of done, in-progress, and new statuses."""
    seed()
    SessionLocal = get_session_maker()
    with SessionLocal() as session:
        issues = session.scalars(select(Issue).where(Issue.issue_type == "story")).all()
        categories = {i.status_category for i in issues}
        assert "done" in categories
        assert "indeterminate" in categories
        assert "new" in categories


def test_seed_features_have_target_dates():
    """Feature epics have target_start_date and target_end_date set."""
    seed()
    SessionLocal = get_session_maker()
    with SessionLocal() as session:
        features = session.scalars(
            select(Issue).where(Issue.issue_type == "epic")
        ).all()
        dated = [f for f in features if f.target_start_date and f.target_end_date]
        assert len(dated) == len(features), "All features should have target dates"
