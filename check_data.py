"""
Quick sanity checks on the ingested data.
Run from jira-seeder folder:  python inspect.py
"""
from sqlalchemy import func, select
from app.models import (
    get_session_maker, Project, Sprint, Issue, IssueLink, FeatureMembership,
)

Session = get_session_maker()

with Session() as s:
    print("=" * 60)
    print("ISSUES BY PROJECT")
    print("=" * 60)
    rows = s.execute(
        select(Project.jira_key, func.count(Issue.id))
        .join(Issue, Issue.project_id == Project.id)
        .group_by(Project.jira_key)
        .order_by(Project.jira_key)
    ).all()
    for k, n in rows:
        print(f"  {k:8}  {n}")

    print("\n" + "=" * 60)
    print("STATUS DISTRIBUTION")
    print("=" * 60)
    rows = s.execute(
        select(Issue.status, Issue.status_category, func.count())
        .group_by(Issue.status, Issue.status_category)
        .order_by(func.count().desc())
    ).all()
    for status, cat, n in rows:
        print(f"  {n:3d}  {status:25} [{cat}]")

    print("\n" + "=" * 60)
    print("DATA HYGIENE SIGNALS")
    print("=" * 60)
    total = s.scalar(select(func.count(Issue.id)))
    no_assignee = s.scalar(select(func.count(Issue.id)).where(Issue.assignee.is_(None)))
    no_points = s.scalar(select(func.count(Issue.id)).where(Issue.story_points.is_(None)))
    no_sprint = s.scalar(select(func.count(Issue.id)).where(Issue.sprint_id.is_(None)))
    no_due = s.scalar(select(func.count(Issue.id)).where(Issue.due_date.is_(None)))
    print(f"  Total issues:         {total}")
    print(f"  Missing assignee:     {no_assignee}  ({100*no_assignee//total}%)")
    print(f"  Missing story points: {no_points}  ({100*no_points//total}%)")
    print(f"  Missing sprint:       {no_sprint}  ({100*no_sprint//total}%)")
    print(f"  Missing due date:     {no_due}  ({100*no_due//total}%)")

    print("\n" + "=" * 60)
    print("SPRINT STATE BREAKDOWN")
    print("=" * 60)
    rows = s.execute(
        select(Sprint.state, func.count())
        .group_by(Sprint.state)
    ).all()
    for state, n in rows:
        print(f"  {state:10}  {n}")

    print("\n" + "=" * 60)
    print("BLOCKS DEPENDENCY GRAPH (cross-project only)")
    print("=" * 60)
    from sqlalchemy.orm import aliased
    Src = aliased(Issue)
    Tgt = aliased(Issue)
    rows = s.execute(
        select(Src.jira_key, Tgt.jira_key)
        .join(IssueLink, IssueLink.source_issue_id == Src.id)
        .join(Tgt, Tgt.id == IssueLink.target_issue_id)
        .where(IssueLink.link_type == "blocks")
        .order_by(Src.jira_key)
    ).all()
    for src, tgt in rows:
        src_proj = src.split("-")[0]
        tgt_proj = tgt.split("-")[0]
        cross = "  <--- CROSS-PROJECT" if src_proj != tgt_proj else ""
        print(f"  {src} blocks {tgt}{cross}")

    print("\n" + "=" * 60)
    print("FEATURE ROLLUP: stories per epic")
    print("=" * 60)
    Feat = aliased(Issue)
    rows = s.execute(
        select(Feat.jira_key, Feat.summary, func.count(FeatureMembership.id))
        .join(FeatureMembership, FeatureMembership.feature_issue_id == Feat.id)
        .group_by(Feat.jira_key, Feat.summary)
    ).all()
    for key, summary, n in rows:
        print(f"  {key}: {n} stories")
        print(f"    '{summary[:70]}'")
