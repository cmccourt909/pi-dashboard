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


@dataclass
class PortfolioPromptInput:
    """Structured PI-level context for the portfolio briefing prompt."""
    pi_name: str
    total_issues: int
    done_issues: int
    pct_complete: float
    critical_findings: int
    blocked_issues: int
    health: str
    total_features: int
    features_on_track: int


def build_portfolio_prompt(input: PortfolioPromptInput) -> str:
    """Build the LLM prompt for a PI-level portfolio briefing stream.

    Generates a concise portfolio overview covering delivery status, risks,
    and recommended actions for the current Program Increment.
    """
    at_risk = input.total_features - input.features_on_track
    return f"""You are a delivery intelligence assistant. Generate a concise portfolio briefing for a Program Increment, structured into exactly three sections:

Delivery Status:
Risks & Blockers:
Recommended Actions:

Program Increment context:
- PI: {input.pi_name}
- Overall completion: {input.pct_complete:.1f}% ({input.done_issues}/{input.total_issues} issues done)
- Health: {input.health}
- Active blockers: {input.blocked_issues}
- Critical findings: {input.critical_findings}
- Features on track: {input.features_on_track}/{input.total_features} ({at_risk} at risk)

Rules:
- Use the three headers exactly as shown above.
- Keep the entire response under 200 words.
- Be direct, factual, and actionable for a program leader audience.
- Do not add extra sections or markdown formatting."""
