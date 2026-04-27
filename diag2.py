from sqlalchemy import select, func
from app.models import Issue, FeatureMembership, get_session_maker

S = get_session_maker()
with S() as s:
    print('ISSUE TYPE VALUES:')
    for row in s.execute(select(Issue.issue_type, func.count()).group_by(Issue.issue_type)).all():
        print(f'  {row[0]!r:15}  {row[1]}')

    print()
    print('ASSIGNEE SAMPLE (first 5):')
    for i in s.scalars(select(Issue).limit(5)).all():
        print(f'  {i.jira_key}  assignee={i.assignee!r}  type={i.issue_type!r}')

    print()
    print('IN-PROGRESS + UNASSIGNED:')
    rows = s.scalars(
        select(Issue).where(Issue.status_category == 'indeterminate', Issue.assignee.is_(None))
    ).all()
    print(f'  count: {len(rows)}')

    print()
    print('FEATURE MEMBERSHIP -> FEATURE ISSUE_TYPE:')
    from sqlalchemy.orm import aliased
    Feat = aliased(Issue)
    rows = s.execute(
        select(Feat.jira_key, Feat.issue_type, func.count(FeatureMembership.id))
        .join(FeatureMembership, FeatureMembership.feature_issue_id == Feat.id)
        .group_by(Feat.jira_key, Feat.issue_type)
    ).all()
    for k, t, n in rows:
        print(f'  {k}  type={t!r}  members={n}')
