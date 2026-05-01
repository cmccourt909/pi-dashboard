import sqlite3

conn = sqlite3.connect('app.db')

print("=== Sites ===")
for r in conn.execute("SELECT id, base_url, display_name FROM site"):
    print(r)

print("\n=== Program Increments ===")
for r in conn.execute("SELECT id, name, start_date, end_date FROM program_increment ORDER BY start_date"):
    print(r)

print("\n=== Existing Sprints (sample) ===")
for r in conn.execute("SELECT id, site_id, project_id, jira_id, name, start_date, end_date, pi_id FROM sprint LIMIT 5"):
    print(r)

print("\n=== Sprint count ===")
print(conn.execute("SELECT COUNT(*) FROM sprint").fetchone()[0])

conn.close()
