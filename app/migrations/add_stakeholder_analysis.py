"""
Migration: create the analysis_session and analysis_section_result tables.

Run once from the project root:
    python -m app.migrations.add_stakeholder_analysis

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
    # SQLite uses AUTOINCREMENT, Postgres uses SERIAL
    pk_col = "id SERIAL PRIMARY KEY" if is_postgres else "id INTEGER PRIMARY KEY AUTOINCREMENT"

    with engine.connect() as conn:
        # Create the analysis_session table
        try:
            conn.execute(
                sqlalchemy.text(f"""
                    CREATE TABLE analysis_session (
                        id VARCHAR(36) PRIMARY KEY,
                        filename VARCHAR(255) NOT NULL,
                        file_size_bytes INTEGER NOT NULL,
                        transcript_text TEXT NOT NULL,
                        has_speaker_attribution BOOLEAN DEFAULT TRUE,
                        status VARCHAR(20) NOT NULL,
                        created_at {col_type} NOT NULL,
                        completed_at {col_type},
                        prompt_version VARCHAR(20) NOT NULL
                    )
                """)
            )
            print("  Created table: analysis_session")
        except Exception:
            print("  Table already exists (skipped): analysis_session")

        # Create the analysis_section_result table
        try:
            conn.execute(
                sqlalchemy.text(f"""
                    CREATE TABLE analysis_section_result (
                        {pk_col},
                        session_id VARCHAR(36) NOT NULL,
                        section_key VARCHAR(50) NOT NULL,
                        status VARCHAR(20) NOT NULL,
                        result_text TEXT,
                        error_message TEXT,
                        generated_at {col_type},
                        model_name VARCHAR(100),
                        FOREIGN KEY (session_id) REFERENCES analysis_session(id),
                        UNIQUE (session_id, section_key)
                    )
                """)
            )
            print("  Created table: analysis_section_result")
        except Exception:
            print("  Table already exists (skipped): analysis_section_result")

        # Create index on session_id for efficient lookups
        try:
            conn.execute(
                sqlalchemy.text(
                    "CREATE INDEX ix_analysis_section_result_session_id "
                    "ON analysis_section_result (session_id)"
                )
            )
            print("  Created index: ix_analysis_section_result_session_id")
        except Exception:
            print("  Index already exists (skipped): ix_analysis_section_result_session_id")

        conn.commit()
    print("Migration complete.")


if __name__ == "__main__":
    run()
