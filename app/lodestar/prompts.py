"""
app/lodestar/prompts.py

Versioned prompt templates for the Lodestar AI narrative engine.

Version increment rules:
  Major (v1.0 → v2.0): section additions/removals, output word limit change,
                         required input fields change, output format change.
                         Narratives on a different major version are structurally stale.
  Minor (v1.0 → v1.1): wording/instruction refinement with unchanged structure,
                         tone adjustments, constraint tuning within existing sections.
                         Narratives remain compatible — no forced refresh.
  No bump:              Whitespace or formatting changes that do not affect LLM behaviour.

Phase 3 staleness check (deferred): when the stored lodestar_prompt_version major
version differs from CURRENT_PROMPT_VERSION major version, treat lodestar_static as
null and force a fresh stream regardless of session cache.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    pass

# ---------------------------------------------------------------------------
# Active version
# ---------------------------------------------------------------------------

CURRENT_PROMPT_VERSION = "v1.0"


# ---------------------------------------------------------------------------
# Prompt template v1.0
# ---------------------------------------------------------------------------

LODESTAR_PROMPT_V1_0 = """\
You are Lodestar, an AI delivery intelligence assistant for WaypointPI.

Analyse the following feature and produce a concise narrative in exactly \
three sections: Delivery Status, Risks & Blockers, and Recommended Actions.

Limit your response to 180 words or fewer.

Feature: {feature_name}
Team: {team}
Completion: {completion_pct}%
RAG Status: {rag_status}
Sprints remaining: {sprints_remaining}
Blockers: {blockers}
Blocked by: {blocked_by}
"""


# ---------------------------------------------------------------------------
# Input type — mirrors FeatureItemOut fields from app/api/schemas.py
# ---------------------------------------------------------------------------

@dataclass
class LodestarPromptInput:
    """
    Minimal fields required to build a Lodestar prompt.

    Field names and types match FeatureItemOut in app/api/schemas.py so callers
    can construct this directly from the ORM query results in roadmap.py.
    """
    feature_key: str
    summary: str                        # maps to feature_name in prompt
    team: str
    rag_status: str                     # 'red' | 'amber' | 'green'
    blockers: list[str] = field(default_factory=list)
    is_blocked_by: list[str] = field(default_factory=list)
    # Derived from pi_completion[0] — caller should compute before constructing
    completion_pct: float = 0.0
    sprints_remaining: int = 0


# ---------------------------------------------------------------------------
# Prompt builder
# ---------------------------------------------------------------------------

def build_lodestar_prompt(feature: LodestarPromptInput) -> str:
    """
    Construct the active Lodestar prompt from LODESTAR_PROMPT_V1_0.

    All required fields (completion_pct, team, rag_status, blockers,
    is_blocked_by) are always present in the returned string — no field
    is silently omitted. Empty lists render as the literal string 'None'
    so the model always sees a value for every slot.

    Returns:
        Formatted prompt string ready to pass to ILLMAdapter.stream().
    """
    blockers_str = ", ".join(feature.blockers) if feature.blockers else "None"
    blocked_by_str = ", ".join(feature.is_blocked_by) if feature.is_blocked_by else "None"

    return LODESTAR_PROMPT_V1_0.format(
        feature_name=feature.summary,
        team=feature.team,
        completion_pct=round(feature.completion_pct, 1),
        rag_status=feature.rag_status,
        sprints_remaining=feature.sprints_remaining,
        blockers=blockers_str,
        blocked_by=blocked_by_str,
    )


def get_prompt_major_version(version: str) -> str:
    """
    Extract the major version component from a version string.

    Example: 'v1.2' → 'v1', 'v2.0' → 'v2'

    Used by Phase 3 staleness check to compare stored narrative version
    against CURRENT_PROMPT_VERSION without requiring an exact match.
    """
    return version.split(".")[0]
