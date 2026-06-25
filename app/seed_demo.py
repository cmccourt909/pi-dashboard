"""
Seed demo data for the PI Dashboard.

Creates anonymized data for PI 26.2 and 26.3 with realistic sprints,
features, stories, dependencies, and varied completion states.

Usage:
    python -m app.seed_demo

Safe to re-run — drops and recreates all data.
"""
from __future__ import annotations

import random
from datetime import datetime, timedelta

from sqlalchemy import select

from app.models import (
    Base,
    FeatureMembership,
    Issue,
    IssueLink,
    IssueType,
    Organization,
    ProgramIncrement,
    Project,
    Site,
    Sprint,
    SprintState,
    get_engine,
    get_session_maker,
)


random.seed(42)

# ─── Configuration ────────────────────────────────────────────────────────────

TEAMS = [
    {"key": "ALPHA", "name": "Team Alpha"},
    {"key": "BRAVO", "name": "Team Bravo"},
    {"key": "CHARLIE", "name": "Team Charlie"},
]

FEATURES = [
    {"key": "ALPHA-100", "summary": "Customer onboarding redesign", "team": "ALPHA"},
    {"key": "ALPHA-101", "summary": "Self-service portal v2", "team": "ALPHA"},
    {"key": "BRAVO-200", "summary": "Payment gateway migration", "team": "BRAVO"},
    {"key": "BRAVO-201", "summary": "Fraud detection engine", "team": "BRAVO"},
    {"key": "CHARLIE-300", "summary": "Real-time notification service", "team": "CHARLIE"},
    {"key": "CHARLIE-301", "summary": "Data pipeline modernization", "team": "CHARLIE"},
]

STATUSES_DONE = ["Done", "Closed"]
STATUSES_IN_PROGRESS = ["In Progress", "In Review", "Testing"]
STATUSES_TODO = ["To Do", "Backlog", "Ready for Dev"]

ASSIGNEES = [
    "Alex Morgan", "Jordan Lee", "Sam Taylor", "Casey Chen",
    "Riley Park", "Quinn Adams", "Morgan Blake", "Avery Scott",
    "Drew Mitchell", "Jamie Carter", "Pat Nguyen", "Robin Hayes",
]

PRIORITIES = ["Highest", "High", "Medium", "Low"]


def _random_summary(feature_summary: str, idx: int) -> str:
    """Generate a plausible story summary related to the feature."""
    prefixes = [
        "Implement", "Configure", "Design", "Build", "Create",
        "Set up", "Integrate", "Add", "Update", "Refactor",
    ]
    suffixes = [
        "API endpoint", "UI component", "database schema", "validation logic",
        "error handling", "unit tests", "integration tests", "documentation",
        "monitoring alerts", "logging", "caching layer", "auth flow",
        "email templates", "webhook handler", "batch processor",
        "search functionality", "export feature", "admin panel",
        "performance optimization", "accessibility improvements",
    ]
    return f"{random.choice(prefixes)} {random.choice(suffixes)} for {feature_summary.lower()}"


def seed():
    engine = get_engine()
    # Ensure roadmap date columns exist (migration)
    from app.migrations.add_roadmap_dates import run as run_migration
    run_migration()
    # Create tables if they don't exist
    Base.metadata.create_all(engine)

    SessionLocal = get_session_maker()

    with SessionLocal() as session:
        # ─── Clean existing data ──────────────────────────────────────────
        # Delete in FK-safe order (children before parents)
        from sqlalchemy import text as _text
        if "postgresql" in str(engine.url):
            # Only truncate tables that exist
            session.execute(_text(
                "DO $$ BEGIN "
                "EXECUTE (SELECT string_agg('TRUNCATE TABLE ' || tablename || ' RESTART IDENTITY CASCADE', '; ') "
                "FROM pg_tables WHERE schemaname = 'public' AND tablename IN "
                "('raw_issue_snapshot','feature_membership','issue_link','issue','sprint','program_increment','project','site','organization')); "
                "END $$"
            ))
        else:
            session.execute(FeatureMembership.__table__.delete())
            session.execute(IssueLink.__table__.delete())
            session.execute(Issue.__table__.delete())
            session.execute(Sprint.__table__.delete())
            session.execute(ProgramIncrement.__table__.delete())
            session.execute(Project.__table__.delete())
            session.execute(Site.__table__.delete())
            session.execute(Organization.__table__.delete())
        session.commit()

        # ─── Organization & Site ──────────────────────────────────────────
        org = Organization(name="Acme Corp")
        session.add(org)
        session.flush()

        site = Site(
            base_url="https://jira.acme-corp.example",
            display_name="Acme Jira",
            org_id=org.id,
        )
        session.add(site)
        session.flush()

        # ─── Projects ────────────────────────────────────────────────────
        projects = {}
        for team in TEAMS:
            proj = Project(
                site_id=site.id,
                jira_key=team["key"],
                name=team["name"],
            )
            session.add(proj)
            session.flush()
            projects[team["key"]] = proj

        # ─── Program Increments ───────────────────────────────────────────
        pi_262 = ProgramIncrement(
            org_id=org.id,
            name="26.2",
            start_date=datetime(2026, 3, 12),
            end_date=datetime(2026, 5, 20),
        )
        pi_263 = ProgramIncrement(
            org_id=org.id,
            name="26.3",
            start_date=datetime(2026, 5, 21),
            end_date=datetime(2026, 7, 30),
        )
        pi_264 = ProgramIncrement(
            org_id=org.id,
            name="26.4",
            start_date=datetime(2026, 7, 31),
            end_date=datetime(2026, 10, 8),
        )
        session.add_all([pi_262, pi_263, pi_264])
        session.flush()

        # ─── Sprints ─────────────────────────────────────────────────────
        sprints_262 = []
        sprint_start = datetime(2026, 3, 12)
        for i in range(1, 6):
            sprint_end = sprint_start + timedelta(days=13)
            state = SprintState.CLOSED.value
            if i == 4:
                state = SprintState.ACTIVE.value
            elif i == 5:
                state = SprintState.FUTURE.value

            for team in TEAMS:
                sprint = Sprint(
                    site_id=site.id,
                    project_id=projects[team["key"]].id,
                    jira_id=26200 + i * 10 + list(projects.keys()).index(team["key"]),
                    name=f"Sprint 26.2.{i}",
                    state=state,
                    start_date=sprint_start,
                    end_date=sprint_end,
                    pi_id=pi_262.id,
                )
                session.add(sprint)
                session.flush()
                sprints_262.append(sprint)
            sprint_start = sprint_end + timedelta(days=1)

        sprints_263 = []
        sprint_start = datetime(2026, 5, 21)
        for i in range(1, 6):
            sprint_end = sprint_start + timedelta(days=13)
            state = SprintState.FUTURE.value
            if i == 1:
                state = SprintState.ACTIVE.value

            for team in TEAMS:
                sprint = Sprint(
                    site_id=site.id,
                    project_id=projects[team["key"]].id,
                    jira_id=26300 + i * 10 + list(projects.keys()).index(team["key"]),
                    name=f"Sprint 26.3.{i}",
                    state=state,
                    start_date=sprint_start,
                    end_date=sprint_end,
                    pi_id=pi_263.id,
                )
                session.add(sprint)
                session.flush()
                sprints_263.append(sprint)
            sprint_start = sprint_end + timedelta(days=1)

        sprints_264 = []
        sprint_start = datetime(2026, 7, 31)
        for i in range(1, 6):
            sprint_end = sprint_start + timedelta(days=13)
            state = SprintState.FUTURE.value

            for team in TEAMS:
                sprint = Sprint(
                    site_id=site.id,
                    project_id=projects[team["key"]].id,
                    jira_id=26400 + i * 10 + list(projects.keys()).index(team["key"]),
                    name=f"Sprint 26.4.{i}",
                    state=state,
                    start_date=sprint_start,
                    end_date=sprint_end,
                    pi_id=pi_264.id,
                )
                session.add(sprint)
                session.flush()
                sprints_264.append(sprint)
            sprint_start = sprint_end + timedelta(days=1)

        # ─── Feature Issues (Epics) ──────────────────────────────────────
        feature_issues = {}
        for feat in FEATURES:
            team_key = feat["team"]
            due_offset = random.randint(50, 70)
            issue = Issue(
                site_id=site.id,
                project_id=projects[team_key].id,
                sprint_id=None,
                jira_key=feat["key"],
                jira_id=abs(hash(feat["key"])) % (10**8),
                issue_type=IssueType.EPIC.value,
                summary=feat["summary"],
                status="In Progress",
                status_category="indeterminate",
                priority="High",
                assignee=random.choice(ASSIGNEES),
                story_points=None,
                due_date=datetime(2026, 3, 12) + timedelta(days=due_offset),
                target_start_date=datetime(2026, 3, 12),
                target_end_date=datetime(2026, 3, 12) + timedelta(days=due_offset),
            )
            session.add(issue)
            session.flush()
            feature_issues[feat["key"]] = issue

        # ─── Stories ─────────────────────────────────────────────────────
        story_counter = 0
        all_stories = []

        for feat in FEATURES:
            team_key = feat["team"]
            feature_issue = feature_issues[feat["key"]]

            # Each feature has 8-15 stories
            num_stories = random.randint(8, 15)

            # Get sprints for this team in PI 26.2
            team_sprints_262 = [
                s for s in sprints_262
                if s.project_id == projects[team_key].id
            ]
            team_sprints_263 = [
                s for s in sprints_263
                if s.project_id == projects[team_key].id
            ]

            for i in range(num_stories):
                story_counter += 1
                jira_key = f"{team_key}-{400 + story_counter}"

                # Distribute stories across sprints with realistic completion
                sprint_idx = min(i // 3, len(team_sprints_262) - 1)
                sprint = team_sprints_262[sprint_idx]

                # Determine status based on sprint state
                if sprint.state == SprintState.CLOSED.value:
                    # 85% done in closed sprints
                    if random.random() < 0.85:
                        status = random.choice(STATUSES_DONE)
                        status_category = "done"
                    else:
                        status = random.choice(STATUSES_IN_PROGRESS)
                        status_category = "indeterminate"
                elif sprint.state == SprintState.ACTIVE.value:
                    # 40% done in active sprint
                    r = random.random()
                    if r < 0.40:
                        status = random.choice(STATUSES_DONE)
                        status_category = "done"
                    elif r < 0.75:
                        status = random.choice(STATUSES_IN_PROGRESS)
                        status_category = "indeterminate"
                    else:
                        status = random.choice(STATUSES_TODO)
                        status_category = "new"
                else:
                    status = random.choice(STATUSES_TODO)
                    status_category = "new"

                # Some stories have no assignee (for rule findings)
                assignee = random.choice(ASSIGNEES) if random.random() > 0.1 else None

                # Story points: some unestimated
                sp = random.choice([1, 2, 3, 5, 8]) if random.random() > 0.15 else None

                story = Issue(
                    site_id=site.id,
                    project_id=projects[team_key].id,
                    sprint_id=sprint.id,
                    jira_key=jira_key,
                    jira_id=abs(hash(jira_key)) % (10**8),
                    issue_type=IssueType.STORY.value,
                    summary=_random_summary(feat["summary"], i),
                    status=status,
                    status_category=status_category,
                    priority=random.choice(PRIORITIES),
                    assignee=assignee,
                    story_points=sp,
                    created_at=datetime(2026, 2, 15) + timedelta(days=random.randint(0, 20)),
                    updated_at=datetime(2026, 6, 1) + timedelta(days=random.randint(-30, 0))
                        if status_category != "new"
                        else datetime(2026, 3, 1) + timedelta(days=random.randint(0, 10)),
                )
                session.add(story)
                session.flush()
                all_stories.append(story)

                # Feature membership
                fm = FeatureMembership(
                    site_id=site.id,
                    issue_id=story.id,
                    feature_issue_id=feature_issue.id,
                    source="feature_link_field",
                )
                session.add(fm)

            session.flush()

        # Also add stories for PI 26.3 (fewer, mostly planning stage)
        for feat in FEATURES[:4]:  # Only first 4 features span into 26.3
            team_key = feat["team"]
            feature_issue = feature_issues[feat["key"]]
            team_sprints_263_local = [
                s for s in sprints_263
                if s.project_id == projects[team_key].id
            ]

            for i in range(random.randint(4, 8)):
                story_counter += 1
                jira_key = f"{team_key}-{400 + story_counter}"
                sprint = team_sprints_263_local[0]  # Sprint 26.3.1 (active)

                r = random.random()
                if r < 0.2:
                    status = random.choice(STATUSES_DONE)
                    status_category = "done"
                elif r < 0.5:
                    status = random.choice(STATUSES_IN_PROGRESS)
                    status_category = "indeterminate"
                else:
                    status = random.choice(STATUSES_TODO)
                    status_category = "new"

                story = Issue(
                    site_id=site.id,
                    project_id=projects[team_key].id,
                    sprint_id=sprint.id,
                    jira_key=jira_key,
                    jira_id=abs(hash(jira_key)) % (10**8),
                    issue_type=IssueType.STORY.value,
                    summary=_random_summary(feat["summary"], i),
                    status=status,
                    status_category=status_category,
                    priority=random.choice(PRIORITIES),
                    assignee=random.choice(ASSIGNEES) if random.random() > 0.15 else None,
                    story_points=random.choice([1, 2, 3, 5, 8]) if random.random() > 0.2 else None,
                    created_at=datetime(2026, 5, 10) + timedelta(days=random.randint(0, 10)),
                    updated_at=datetime(2026, 5, 20) + timedelta(days=random.randint(0, 5)),
                )
                session.add(story)
                session.flush()
                all_stories.append(story)

                fm = FeatureMembership(
                    site_id=site.id,
                    issue_id=story.id,
                    feature_issue_id=feature_issue.id,
                    source="feature_link_field",
                )
                session.add(fm)

            session.flush()

        # Also add stories for PI 26.4 (planning / future work)
        for feat in FEATURES[:3]:  # First 3 features span into 26.4
            team_key = feat["team"]
            feature_issue = feature_issues[feat["key"]]
            team_sprints_264_local = [
                s for s in sprints_264
                if s.project_id == projects[team_key].id
            ]

            for i in range(random.randint(3, 6)):
                story_counter += 1
                jira_key = f"{team_key}-{400 + story_counter}"
                sprint = team_sprints_264_local[0]  # Sprint 26.4.1

                status = random.choice(STATUSES_TODO)
                status_category = "new"

                story = Issue(
                    site_id=site.id,
                    project_id=projects[team_key].id,
                    sprint_id=sprint.id,
                    jira_key=jira_key,
                    jira_id=abs(hash(jira_key)) % (10**8),
                    issue_type=IssueType.STORY.value,
                    summary=_random_summary(feat["summary"], i),
                    status=status,
                    status_category=status_category,
                    priority=random.choice(PRIORITIES),
                    assignee=random.choice(ASSIGNEES) if random.random() > 0.3 else None,
                    story_points=random.choice([1, 2, 3, 5, 8]) if random.random() > 0.3 else None,
                    created_at=datetime(2026, 7, 20) + timedelta(days=random.randint(0, 10)),
                    updated_at=datetime(2026, 7, 25) + timedelta(days=random.randint(0, 5)),
                )
                session.add(story)
                session.flush()
                all_stories.append(story)

                fm = FeatureMembership(
                    site_id=site.id,
                    issue_id=story.id,
                    feature_issue_id=feature_issue.id,
                    source="feature_link_field",
                )
                session.add(fm)

            session.flush()

        # ─── Blocking Dependencies ────────────────────────────────────────
        # Add some realistic cross-team blocking relationships
        blocking_pairs = [
            ("ALPHA-401", "BRAVO-413"),   # Alpha story blocks Bravo story
            ("CHARLIE-431", "ALPHA-405"), # Charlie blocks Alpha
            ("BRAVO-416", "CHARLIE-435"), # Bravo blocks Charlie
        ]

        for src_key, tgt_key in blocking_pairs:
            src = session.scalars(
                select(Issue).where(Issue.jira_key == src_key)
            ).first()
            tgt = session.scalars(
                select(Issue).where(Issue.jira_key == tgt_key)
            ).first()
            if src and tgt:
                link = IssueLink(
                    site_id=site.id,
                    source_issue_id=src.id,
                    target_issue_id=tgt.id,
                    link_type="blocks",
                )
                session.add(link)

        # Add a few more intra-team blocks
        for _ in range(5):
            src = random.choice([s for s in all_stories if s.status_category == "new"])
            tgt = random.choice([s for s in all_stories if s.status_category == "indeterminate" and s.id != src.id])
            if src.project_id != tgt.project_id or random.random() > 0.5:
                link = IssueLink(
                    site_id=site.id,
                    source_issue_id=src.id,
                    target_issue_id=tgt.id,
                    link_type="blocks",
                )
                session.add(link)

        session.commit()

    print("✓ Demo data seeded successfully!")
    print(f"  Organization: Acme Corp")
    print(f"  PIs: 26.2, 26.3, 26.4")
    print(f"  Teams: {', '.join(t['name'] for t in TEAMS)}")
    print(f"  Features: {len(FEATURES)}")
    print(f"  Stories: {story_counter}")
    print(f"  Sprints: {len(sprints_262) + len(sprints_263) + len(sprints_264)}")


if __name__ == "__main__":
    seed()
