import sqlite3

conn = sqlite3.connect('app.db')
tables = [r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")]
print("Tables:", tables)

for table in tables:
    cols = [r[1] for r in conn.execute(f"PRAGMA table_info({table})")]
    print(f"  {table}: {cols}")

conn.close()
