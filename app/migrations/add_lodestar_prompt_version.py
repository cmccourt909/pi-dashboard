"""
Migration: add lodestar_prompt_version column to feature_narrative table.

Run once from the repo root:
    python -m app.migrations.add_lodestar_prompt_version

Safe to re-run — uses try/except, existing rows will have NULL in the new column.

Phase 2 — T1.3
Stores the prompt template version (e.g. 'v1.0') written by Lodestar on each
successful stream completion. Used by Phase 3 staleness check to detect major
version drift between stored narratives and the current prompt template.
"""
from __future__ import annotations

import sqlalchemy
from app.models import get_engine


def run():
    engine = get_engine()

    with engine.connect() as conn:
        try:
            conn.execute(
                sqlalchemy.text(
                    "ALTER TABLE feature_narrative "
                    "ADD COLUMN lodestar_prompt_version VARCHAR(20)"
                )
            )
            print("  Added column: feature_narrative.lodestar_prompt_version")
        except Exception:
            print("  Column already exists (skipped): feature_narrative.lodestar_prompt_version")

        conn.commit()

    print("Migration complete.")


if __name__ == "__main__":
    run()
