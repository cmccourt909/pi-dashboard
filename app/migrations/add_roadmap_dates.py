"""
Migration: add target_start_date and target_end_date to the issue table.

Run once from the jira-seeder folder:
    python -m app.migrations.add_roadmap_dates

Safe to re-run — uses try/except around each ALTER TABLE.
"""
from __future__ import annotations

import sqlalchemy
from app.models import get_engine


def run():
    engine = get_engine()
    # Use TIMESTAMP for Postgres, DATETIME for SQLite
    col_type = "TIMESTAMP" if "postgresql" in str(engine.url) else "DATETIME"
    with engine.connect() as conn:
        for col in ("target_start_date", "target_end_date"):
            try:
                conn.execute(
                    sqlalchemy.text(f"ALTER TABLE issue ADD COLUMN {col} {col_type}")
                )
                print(f"  Added column: {col}")
            except Exception:
                print(f"  Column already exists (skipped): {col}")
        conn.commit()
    print("Migration complete.")


if __name__ == "__main__":
    run()
