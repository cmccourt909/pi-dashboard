"""
Migration: create the feature_narrative table.

Run once from the jira-seeder folder:
    python -m app.migrations.add_feature_narrative

Safe to re-run — uses try/except around CREATE TABLE.
"""
from __future__ import annotations

import sqlalchemy
from app.models import get_engine


def run():
    engine = get_engine()
    is_postgres = "postgresql" in str(engine.url)
    # Use TIMESTAMP for Postgres, DATETIME for SQLite
    col_type = "TIMESTAMP" if is_postgres else "DATETIME"
    varchar_type = "VARCHAR(100)"
    # SQLite uses AUTOINCREMENT, Postgres uses SERIAL
    pk_col = "id SERIAL PRIMARY KEY" if is_postgres else "id INTEGER PRIMARY KEY AUTOINCREMENT"

    with engine.connect() as conn:
        # Create the feature_narrative table
        try:
            conn.execute(
                sqlalchemy.text(f"""
                    CREATE TABLE feature_narrative (
                        {pk_col},
                        feature_issue_id INTEGER NOT NULL UNIQUE,
                        narrative_text TEXT NOT NULL,
                        generated_at {col_type} NOT NULL,
                        model_name {varchar_type} NOT NULL,
                        is_stale BOOLEAN DEFAULT FALSE,
                        FOREIGN KEY (feature_issue_id) REFERENCES issue(id)
                    )
                """)
            )
            print("  Created table: feature_narrative")
        except Exception:
            print("  Table already exists (skipped): feature_narrative")

        # Create index on feature_issue_id for efficient lookups
        try:
            conn.execute(
                sqlalchemy.text(
                    "CREATE INDEX ix_feature_narrative_feature_issue_id "
                    "ON feature_narrative (feature_issue_id)"
                )
            )
            print("  Created index: ix_feature_narrative_feature_issue_id")
        except Exception:
            print("  Index already exists (skipped): ix_feature_narrative_feature_issue_id")

        conn.commit()
    print("Migration complete.")


if __name__ == "__main__":
    run()
