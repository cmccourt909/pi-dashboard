"""
Migration: add lodestar_prompt_version to the feature_narrative table.

Safe to re-run — uses try/except around ALTER TABLE.
"""
from __future__ import annotations

import sqlalchemy
from app.models import get_engine


def run():
    engine = get_engine()
    is_postgres = "postgresql" in str(engine.url)
    col_type = "VARCHAR(20)" if is_postgres else "VARCHAR(20)"
    with engine.connect() as conn:
        try:
            conn.execute(
                sqlalchemy.text(
                    f"ALTER TABLE feature_narrative ADD COLUMN lodestar_prompt_version {col_type}"
                )
            )
            print("  Added column: lodestar_prompt_version")
        except Exception:
            print("  Column already exists (skipped): lodestar_prompt_version")
        conn.commit()
    print("Migration complete.")


if __name__ == "__main__":
    run()
