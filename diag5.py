from app.engine import run_site

ctx, findings = run_site()
print('Total findings: ' + str(len(findings)))
print('')
for f in findings:
    print('  [' + f.severity.value + '] ' + f.rule_id + ' :: ' + f.title)
