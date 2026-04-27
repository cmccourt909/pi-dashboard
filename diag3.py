from datetime import date
from app.engine import build_context
from app.models import Site, get_session_maker
from sqlalchemy import select

S = get_session_maker()
with S() as s:
    site = s.scalars(select(Site)).first()
    ctx = build_context(s, site, today=date.today())

    print(f'Context loaded:')
    print(f'  issues:       {len(ctx.issues)}')
    print(f'  sprints:      {len(ctx.sprints)}')
    print(f'  links:        {len(ctx.links)}')
    print(f'  memberships:  {len(ctx.memberships)}')
    print(f'  feature_members keys: {list(ctx.feature_members.keys())}')
    print(f'  feature_members: {ctx.feature_members}')
    print()

    # Now manually apply the filter that 'flow.in_progress_without_assignee' uses
    matches = [i for i in ctx.issues if i.status_category == 'indeterminate' and not i.assignee]
    print(f'Manual filter (in-progress + unassigned): {len(matches)}')

    # And 'hygiene.unassigned_in_active_sprint'
    sprint_by_id = ctx.sprint_by_id
    def _is_active(i):
        if not i.sprint_id:
            return False
        sp = sprint_by_id.get(i.sprint_id)
        return sp is not None and sp.state == 'active'

    matches2 = [i for i in ctx.issues if i.issue_type == 'story' and not i.assignee and _is_active(i)]
    print(f'Manual filter (story + unassigned + active sprint): {len(matches2)}')
