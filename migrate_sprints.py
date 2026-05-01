import sqlite3, re, sys
from datetime import datetime

conn = sqlite3.connect('/opt/pi-dashboard/app.db')
conn.row_factory = sqlite3.Row

# Load OUR canonical sprints (jira_id 9001-9025, all have clean dates)
canonical = conn.execute("""
    SELECT id, name, start_date, end_date, pi_id
    FROM sprint
    WHERE jira_id BETWEEN 9001 AND 9025
    ORDER BY start_date
""").fetchall()

def parse_date(s):
    if not s: return None
    return datetime.fromisoformat(s.split('.')[0].strip())

# Lookup by canonical name e.g. "Sprint 26.2.3"
canonical_by_name = {c['name']: c for c in canonical}

def extract_canonical_name(name):
    m = re.search(r'Sprint (\d+\.\d+\.\d+)', name)
    return f"Sprint {m.group(1)}" if m else None

# Get ALL sprints with stories that are NOT our canonical ones
non_canonical = conn.execute("""
    SELECT s.id, s.jira_id, s.name, s.start_date, s.end_date, COUNT(i.id) as cnt
    FROM sprint s
    JOIN issue i ON i.sprint_id = s.id
    WHERE s.jira_id NOT BETWEEN 9001 AND 9025
    GROUP BY s.id
""").fetchall()

print("=== Migration Plan ===")
updates = []
unmapped = []

for s in non_canonical:
    cname = extract_canonical_name(s['name'])
    if cname and cname in canonical_by_name:
        c = canonical_by_name[cname]
        print(f"  REMAP: '{s['name']}' ({s['cnt']} stories) -> '{c['name']}' (id={c['id']})")
        updates.append((c['id'], s['id']))
    else:
        print(f"  UNMAPPED: '{s['name']}' ({s['cnt']} stories)")
        unmapped.append(s)

print(f"\nTotal: {len(updates)} remapped, {len(unmapped)} unmapped")

if '--apply' in sys.argv:
    for canonical_id, old_id in updates:
        conn.execute("UPDATE issue SET sprint_id = ? WHERE sprint_id = ?", (canonical_id, old_id))
    conn.commit()
    print(f"Applied {len(updates)} remappings successfully")

conn.close()
