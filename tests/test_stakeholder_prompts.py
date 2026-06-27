"""
Unit tests for app/stakeholders/prompts.py — prompt template rendering.

Validates: Requirements 2.1 (Analysis orchestration uses correct prompts)
"""
import pytest

from app.stakeholders.prompts import (
    STAKEHOLDER_PROMPT_VERSION,
    SECTION_PROMPTS,
    SECTION_MAX_TOKENS,
    build_section_prompt,
)

# The canonical 8 section keys expected by the design.
EXPECTED_SECTIONS = [
    "speaker_statistics",
    "meeting_minutes",
    "raid_log",
    "delivery_signals",
    "team_health",
    "gap_analysis",
    "empathy_map",
    "stakeholder_register",
]


class TestSectionKeysPresent:
    """Verify all 8 section keys are present in SECTION_PROMPTS and SECTION_MAX_TOKENS."""

    def test_section_prompts_has_all_8_keys(self):
        for key in EXPECTED_SECTIONS:
            assert key in SECTION_PROMPTS, f"Missing section key in SECTION_PROMPTS: {key}"

    def test_section_prompts_has_exactly_8_keys(self):
        assert len(SECTION_PROMPTS) == 8

    def test_section_prompts_values_are_non_empty_strings(self):
        for key, value in SECTION_PROMPTS.items():
            assert isinstance(value, str), f"SECTION_PROMPTS['{key}'] is not a string"
            assert len(value) > 0, f"SECTION_PROMPTS['{key}'] is empty"

    def test_section_max_tokens_has_all_8_keys(self):
        for key in EXPECTED_SECTIONS:
            assert key in SECTION_MAX_TOKENS, f"Missing section key in SECTION_MAX_TOKENS: {key}"

    def test_section_max_tokens_has_exactly_8_keys(self):
        assert len(SECTION_MAX_TOKENS) == 8

    def test_section_max_tokens_values_are_positive_integers(self):
        for key, value in SECTION_MAX_TOKENS.items():
            assert isinstance(value, int), f"SECTION_MAX_TOKENS['{key}'] is not an int"
            assert value > 0, f"SECTION_MAX_TOKENS['{key}'] is not positive: {value}"


class TestPromptVersion:
    """Verify STAKEHOLDER_PROMPT_VERSION is set correctly."""

    def test_prompt_version_is_v1_0(self):
        assert STAKEHOLDER_PROMPT_VERSION == "v1.0"


class TestBuildSectionPrompt:
    """Verify transcript injection into each template via build_section_prompt()."""

    @pytest.mark.parametrize("section", EXPECTED_SECTIONS)
    def test_transcript_injected_between_delimiters(self, section):
        transcript = "Alice: Hello everyone.\nBob: Hi Alice."
        result = build_section_prompt(section, transcript)

        # Transcript should appear between --- delimiters
        assert f"---\n{transcript}\n---" in result

    @pytest.mark.parametrize("section", EXPECTED_SECTIONS)
    def test_result_contains_template_text(self, section):
        transcript = "Some transcript content."
        result = build_section_prompt(section, transcript)

        # The result should contain the original template text
        template = SECTION_PROMPTS[section]
        assert template in result

    @pytest.mark.parametrize("section", EXPECTED_SECTIONS)
    def test_result_contains_transcript_label(self, section):
        transcript = "Speaker: This is a test."
        result = build_section_prompt(section, transcript)

        # Should have the "Transcript:" label before the delimited content
        assert "Transcript:\n---" in result

    def test_raises_value_error_for_unknown_section(self):
        with pytest.raises(ValueError, match="Unknown section"):
            build_section_prompt("nonexistent_section", "some transcript")

    def test_empty_transcript_still_injected(self):
        result = build_section_prompt("speaker_statistics", "")
        assert "---\n\n---" in result


class TestPromptFormatInstructions:
    """Verify each section prompt contains key format instructions."""

    def test_speaker_statistics_mentions_markdown_table(self):
        prompt = SECTION_PROMPTS["speaker_statistics"]
        assert "Markdown" in prompt or "table" in prompt

    def test_meeting_minutes_mentions_table_structure(self):
        prompt = SECTION_PROMPTS["meeting_minutes"]
        assert "table" in prompt.lower() or "Table" in prompt

    def test_raid_log_mentions_tables(self):
        prompt = SECTION_PROMPTS["raid_log"]
        assert "table" in prompt.lower()

    def test_delivery_signals_mentions_priority_tiers(self):
        prompt = SECTION_PROMPTS["delivery_signals"]
        assert "P1" in prompt and "P2" in prompt and "P3" in prompt

    def test_team_health_mentions_score(self):
        prompt = SECTION_PROMPTS["team_health"]
        assert "score" in prompt.lower() or "Score" in prompt

    def test_gap_analysis_mentions_absent_teams(self):
        prompt = SECTION_PROMPTS["gap_analysis"]
        assert "Absent" in prompt or "absent" in prompt

    def test_empathy_map_mentions_quadrants(self):
        prompt = SECTION_PROMPTS["empathy_map"]
        assert "Thinks" in prompt and "Feels" in prompt and "Pains" in prompt and "Gains" in prompt

    def test_stakeholder_register_mentions_tiers(self):
        prompt = SECTION_PROMPTS["stakeholder_register"]
        assert "Tier" in prompt or "tier" in prompt
