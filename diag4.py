from datetime import date
from app.engine import build_context
from app.models import Site, get_session_maker
from app.rules import all_rules
from app.rules import checks
from sqlalchemy import select

S = get_session_maker()
with S() as s:
    site = s.scalars(select(Site)).first()
    ctx = build_context(s, site, today=date.today())

    print('Total registered rules: ' + str(len(all_rules())))
    print('')
    for rule in all_rules():
        rule_id = getattr(rule, 'id', rule.__name__)
        print('--- Running: ' + rule_id + ' ---')
        try:
            result = list(rule(ctx))
            print('  returned ' + str(len(result)) + ' finding(s)')
            for f in result[:2]:
                print('    ' + f.severity.value + ' :: ' + f.title)
        except Exception as e:
            print('  ERROR: ' + type(e).__name__ + ': ' + str(e))
            import traceback
            traceback.print_exc()
        print('')
