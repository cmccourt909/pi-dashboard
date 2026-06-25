"""
app/lodestar/prompts.py

Prompt construction and version management for the Lodestar AI narrative.
"""
from __future__ import annotations

from dataclasses import dataclass


CURRENT_PROMPT_VERSION = "v2.0"


@dataclass
class LodestarPromptInput:
    """Structured context passed to build_lodestar_prompt."""

    feature_key: str
    summary: str
    team: str
    rag_status: str
    blockers: list[str]
    is_blocked_by: list[str]
    completion_pct: float
    sprints_remaining: int


def get_prompt_major_version(version: str | None) -> str:
    """Return the major portion of a version string (e.g. 'v2.0' -> 'v2').

    Splits on '.' and returns the first segment. Used by the staleness gate
    to compare only major version changes.
    """
    return version.split(".")[0]


def build_lodestar_prompt(input: LodestarPromptInput) -> str:
    """Build the LLM prompt for the Lodestar narrative stream."""
    blockers = input.is_blocked_by or input.blockers
    blocker_text = ", ".join(blockers) if blockers else "none"

    return f"""You are a delivery intelligence assistant. Generate a concise 2-3 sentence narrative summarizing the delivery health, risks, and trajectory for a software feature.

Feature context:
- Feature: {input.feature_key} — {input.summary}
- Team: {input.team}
- RAG status: {input.rag_status}
- Completion: {input.completion_pct:.1f}% of PI stories done
- Active blockers: {blocker_text}
- Sprints remaining in PI: {input.sprints_remaining}

Write exactly 2-3 sentences. Be direct, factual, and actionable. Mention risks if blockers exist or completion is low relative to remaining sprints. Do not use bullet points or headers."""
