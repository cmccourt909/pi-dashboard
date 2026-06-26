"""
tests/lodestar/test_prompts.py

Unit tests for app/lodestar/prompts.py

Covers:
  - v2.0 prompt includes sentinel headers for structured rendering
  - get_prompt_major_version parsing
"""
from __future__ import annotations

import pytest

from app.lodestar.prompts import (
    CURRENT_PROMPT_VERSION,
    LodestarPromptInput,
    build_lodestar_prompt,
    get_prompt_major_version,
)


def _make_input() -> LodestarPromptInput:
    return LodestarPromptInput(
        feature_key="ALPHA-100",
        summary="Sample feature summary",
        team="Alpha",
        rag_status="green",
        blockers=[],
        is_blocked_by=["BRAVO-1"],
        completion_pct=75.0,
        sprints_remaining=2,
    )


class TestBuildLodestarPrompt:
    """Prompt v2.0 sentinel headers."""

    def test_prompt_contains_delivery_status_header(self):
        prompt = build_lodestar_prompt(_make_input())
        assert "Delivery Status:" in prompt

    def test_prompt_contains_risks_and_blockers_header(self):
        prompt = build_lodestar_prompt(_make_input())
        assert "Risks & Blockers:" in prompt

    def test_prompt_contains_recommended_actions_header(self):
        prompt = build_lodestar_prompt(_make_input())
        assert "Recommended Actions:" in prompt

    def test_prompt_contains_feature_context(self):
        prompt = build_lodestar_prompt(_make_input())
        assert "ALPHA-100" in prompt
        assert "Sample feature summary" in prompt
        assert "Alpha" in prompt
        assert "green" in prompt
        assert "BRAVO-1" in prompt

    def test_current_prompt_version_is_v2(self):
        assert CURRENT_PROMPT_VERSION == "v2.0"


class TestGetPromptMajorVersion:
    """Major version extraction used by the staleness gate."""

    def test_v2_major(self):
        assert get_prompt_major_version("v2.0") == "v2"

    def test_v2_minor_bump(self):
        assert get_prompt_major_version("v2.5") == "v2"

    def test_v1_major(self):
        assert get_prompt_major_version("v1.9") == "v1"

    def test_empty_string(self):
        assert get_prompt_major_version("") == ""

    def test_none_raises_attribute_error(self):
        with pytest.raises(AttributeError):
            get_prompt_major_version(None)
