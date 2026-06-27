"""
app/stakeholders — Stakeholder Analysis package.

Provides AI-powered analysis of meeting transcripts across eight sections:
speaker statistics, meeting minutes, RAID log, delivery signals, team health,
gap analysis, empathy map, and stakeholder register.
"""
from app.stakeholders.router import router  # noqa: F401

__all__ = ["router"]
