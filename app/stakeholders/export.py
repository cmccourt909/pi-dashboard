"""
app/stakeholders/export.py

ExportService — converts analysis session results into downloadable formats
(Markdown document with metadata header and all section results).
"""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import AnalysisSession, AnalysisSectionResult


# Human-readable titles for each section key
SECTION_TITLES: dict[str, str] = {
    "speaker_statistics": "Speaker Statistics",
    "meeting_minutes": "Meeting Minutes",
    "raid_log": "RAID Log",
    "delivery_signals": "Delivery Signals & Priority Actions",
    "team_health": "Team Health Assessment",
    "gap_analysis": "Gap Analysis",
    "empathy_map": "Stakeholder Empathy Maps",
    "stakeholder_register": "Stakeholder Register & Influence Map",
}

# Canonical section ordering
SECTION_ORDER = [
    "speaker_statistics",
    "meeting_minutes",
    "raid_log",
    "delivery_signals",
    "team_health",
    "gap_analysis",
    "empathy_map",
    "stakeholder_register",
]


class ExportService:
    """Converts analysis results to exportable formats."""

    def __init__(self, session: AnalysisSession, db: Session):
        self.session = session
        self.db = db

    def to_markdown(self) -> str:
        """Generate a full Markdown document with metadata header and all section results.

        Structure:
          - Metadata header (filename, date, section count, prompt version)
          - Each completed section with header and content
          - Error sections noted with error message
        """
        sections = self.db.scalars(
            select(AnalysisSectionResult)
            .where(AnalysisSectionResult.session_id == self.session.id)
        ).all()

        # Index by section_key for ordered output
        section_map = {sec.section_key: sec for sec in sections}

        lines: list[str] = []

        # Metadata header
        lines.append("# Stakeholder Analysis Report")
        lines.append("")
        lines.append(f"**Filename:** {self.session.filename}")
        created_at_str = (
            self.session.created_at.strftime("%Y-%m-%d %H:%M UTC")
            if self.session.created_at
            else "Unknown"
        )
        lines.append(f"**Date:** {created_at_str}")
        completed_count = sum(
            1 for sec in sections if sec.status == "complete"
        )
        lines.append(f"**Sections Completed:** {completed_count}/{len(SECTION_ORDER)}")
        lines.append(f"**Prompt Version:** {self.session.prompt_version}")
        lines.append("")
        lines.append("---")
        lines.append("")

        # Section content in canonical order
        for section_key in SECTION_ORDER:
            title = SECTION_TITLES.get(section_key, section_key)
            sec = section_map.get(section_key)

            lines.append(f"## {title}")
            lines.append("")

            if sec is None:
                lines.append("*Section not available.*")
            elif sec.status == "complete" and sec.result_text:
                lines.append(sec.result_text)
            elif sec.status == "error":
                error_msg = sec.error_message or "Unknown error"
                lines.append(f"*Section failed: {error_msg}*")
            else:
                lines.append("*Section pending or incomplete.*")

            lines.append("")
            lines.append("---")
            lines.append("")

        return "\n".join(lines)
