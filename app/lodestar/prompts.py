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
    """Build the LLM prompt for the Lodestar narrative stream (v2.0).

    v2.0 adds explicit sentinel headers so the frontend can parse the narrative
    into three typed sections: Delivery Status, Risks & Blockers, and
    Recommended Actions.
    """
    blockers = input.is_blocked_by or input.blockers
    blocker_text = ", ".join(blockers) if blockers else "none"

    return f"""You are a delivery intelligence assistant. Generate a concise delivery narrative for a software feature, structured into exactly three sections with these headers:

Delivery Status:
Risks & Blockers:
Recommended Actions:

Feature context:
- Feature: {input.feature_key} — {input.summary}
- Team: {input.team}
- RAG status: {input.rag_status}
- Completion: {input.completion_pct:.1f}% of PI stories done
- Active blockers: {blocker_text}
- Sprints remaining in PI: {input.sprints_remaining}

Rules:
- Use the three headers exactly as shown above.
- Keep the entire response under 180 words.
- Be direct, factual, and actionable.
- Do not add extra sections or markdown formatting."""
