from sqlalchemy import select, func
from app.models import Issue, get_session_maker

S = get_session_maker()
with S() as s:
    print('STATUS CATEGORY VALUES IN DB:')
    for row in s.execute(select(Issue.status_category, func.count()).group_by(Issue.status_category)).all():
        print(f'  {row[0]!r:25}  {row[1]}')

    print()
    print('ACTIVE SPRINT ISSUES:')
    from app.models import Sprint
    active = s.scalars(select(Sprint).where(Sprint.state == 'active')).all()
    print(f'  active sprints: {len(active)}')
    for sp in active:
        n = s.scalar(select(func.count(Issue.id)).where(Issue.sprint_id == sp.id))
        print(f'    {sp.name}: {n} issues')

    print()
    print('FEATURE MEMBERS:')
    from app.models import FeatureMembership
    total = s.scalar(select(func.count(FeatureMembership.id)))
    print(f'  total memberships: {total}')
