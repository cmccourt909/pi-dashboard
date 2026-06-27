"""
Tests for the AnalysisOrchestrator SSE event serialization and fault tolerance.

Task 4.3: Property test for fault-tolerant orchestration (Property 3)
Task 4.4: Unit tests for SSE event serialization
"""
import asyncio
import json
import random
from typing import AsyncGenerator
from unittest.mock import patch

import pytest
from hypothesis import given, settings, assume
from hypothesis import strategies as st

from app.stakeholders.orchestrator import (
    AnalysisOrchestrator,
    SECTIONS,
    _section_start_event,
    _chunk_event,
    _section_done_event,
    _section_error_event,
    _all_done_event,
)


# ---------------------------------------------------------------------------
# Mock adapter for testing
# ---------------------------------------------------------------------------

class MockAdapter:
    """Mock LLM adapter that yields canned chunks."""

    def __init__(self, responses: dict[str, list[str]] | None = None, failures: set[str] | None = None):
        """
        Args:
            responses: mapping section key → list of chunks to yield
            failures: set of section keys that should raise errors
        """
        self.responses = responses or {}
        self.failures = failures or set()
        self.model = "test-model"
        self._call_count = 0

    def _identify_section(self, prompt: str) -> str | None:
        """Identify which section a prompt belongs to using unique keywords."""
        # Each section prompt has unique keywords we can match on
        section_markers = {
            "speaker_statistics": "participation analysis",
            "meeting_minutes": "meeting outcome extraction",
            "raid_log": "risk and dependency management",
            "delivery_signals": "action item prioritization",
            "team_health": "team dynamics and agile maturity",
            "gap_analysis": "meeting completeness and coverage",
            "empathy_map": "stakeholder empathy and perspective",
            "stakeholder_register": "stakeholder classification and influence",
        }
        for section_key, marker in section_markers.items():
            if marker in prompt:
                return section_key
        return None

    async def stream(self, prompt: str) -> AsyncGenerator[str, None]:
        self._call_count += 1
        section_key = self._identify_section(prompt)

        if section_key and section_key in self.failures:
            raise RuntimeError(f"Simulated failure for {section_key}")

        if section_key and section_key in self.responses:
            chunks = self.responses[section_key]
        else:
            chunks = ["chunk1", " chunk2"]

        for chunk in chunks:
            await asyncio.sleep(0)  # Yield control
            yield chunk


class SlowAdapter:
    """Mock adapter that sleeps longer than the timeout for specific sections."""

    def __init__(self, slow_sections: set[str]):
        self.slow_sections = slow_sections
        self.model = "slow-model"

    def _identify_section(self, prompt: str) -> str | None:
        section_markers = {
            "speaker_statistics": "participation analysis",
            "meeting_minutes": "meeting outcome extraction",
            "raid_log": "risk and dependency management",
            "delivery_signals": "action item prioritization",
            "team_health": "team dynamics and agile maturity",
            "gap_analysis": "meeting completeness and coverage",
            "empathy_map": "stakeholder empathy and perspective",
            "stakeholder_register": "stakeholder classification and influence",
        }
        for section_key, marker in section_markers.items():
            if marker in prompt:
                return section_key
        return None

    async def stream(self, prompt: str) -> AsyncGenerator[str, None]:
        section_key = self._identify_section(prompt)
        if section_key and section_key in self.slow_sections:
            await asyncio.sleep(100)  # Way beyond 30s timeout
            yield "should not reach here"
        else:
            yield f"result for {section_key}"


# ---------------------------------------------------------------------------
# Task 4.4: Unit tests for SSE event serialization
# ---------------------------------------------------------------------------

class TestSSEEventSerialization:
    """Test JSON serialization of each event type."""

    def test_section_start_event_format(self):
        event = _section_start_event("speaker_statistics")
        data = json.loads(event["data"])
        assert data["type"] == "section_start"
        assert data["section"] == "speaker_statistics"

    def test_chunk_event_format(self):
        event = _chunk_event("raid_log", "Hello world")
        data = json.loads(event["data"])
        assert data["type"] == "chunk"
        assert data["section"] == "raid_log"
        assert data["text"] == "Hello world"

    def test_section_done_event_format(self):
        event = _section_done_event("team_health")
        data = json.loads(event["data"])
        assert data["type"] == "section_done"
        assert data["section"] == "team_health"

    def test_section_error_event_format(self):
        event = _section_error_event("empathy_map", "Connection timeout")
        data = json.loads(event["data"])
        assert data["type"] == "section_error"
        assert data["section"] == "empathy_map"
        assert data["error"] == "Connection timeout"

    def test_all_done_event_format(self):
        event = _all_done_event()
        data = json.loads(event["data"])
        assert data["type"] == "all_done"

    def test_all_events_have_data_key(self):
        """All event helpers return a dict with a 'data' key containing JSON."""
        events = [
            _section_start_event("test"),
            _chunk_event("test", "text"),
            _section_done_event("test"),
            _section_error_event("test", "error"),
            _all_done_event(),
        ]
        for event in events:
            assert "data" in event
            # Must be valid JSON
            parsed = json.loads(event["data"])
            assert "type" in parsed


class TestSSEEventOrdering:
    """Test event ordering invariants from the orchestrator."""

    @pytest.mark.asyncio
    async def test_single_section_event_order(self):
        """For a single section: section_start → chunk* → section_done."""
        adapter = MockAdapter(responses={"speaker_statistics": ["A", "B", "C"]})
        orchestrator = AnalysisOrchestrator(
            transcript="Test: Hello",
            adapter=adapter,
            session_id="test-session-ordering",
        )

        events = []
        with patch.object(orchestrator, "_persist_section_result"), \
             patch.object(orchestrator, "_persist_section_error"), \
             patch.object(orchestrator, "_complete_session"):
            async for event in orchestrator.run_section("speaker_statistics"):
                events.append(json.loads(event["data"]))

        # First event must be section_start
        assert events[0]["type"] == "section_start"
        assert events[0]["section"] == "speaker_statistics"

        # Last event must be section_done
        assert events[-1]["type"] == "section_done"
        assert events[-1]["section"] == "speaker_statistics"

        # Middle events must all be chunks
        for event in events[1:-1]:
            assert event["type"] == "chunk"
            assert event["section"] == "speaker_statistics"

    @pytest.mark.asyncio
    async def test_run_all_emits_all_done_last(self):
        """run_all must emit all_done as the very last event."""
        adapter = MockAdapter(responses={s: ["ok"] for s in SECTIONS})
        orchestrator = AnalysisOrchestrator(
            transcript="Test: Hello",
            adapter=adapter,
            session_id="test-session-alldone",
        )

        events = []
        with patch.object(orchestrator, "_persist_section_result"), \
             patch.object(orchestrator, "_persist_section_error"), \
             patch.object(orchestrator, "_complete_session"):
            async for event in orchestrator.run_all():
                events.append(json.loads(event["data"]))

        # Last event must be all_done
        assert events[-1]["type"] == "all_done"

        # Should have section_start/section_done for all 8 sections
        starts = [e for e in events if e["type"] == "section_start"]
        dones = [e for e in events if e["type"] == "section_done"]
        assert len(starts) == 8
        assert len(dones) == 8

    @pytest.mark.asyncio
    async def test_section_start_precedes_chunks_per_section(self):
        """For each section, section_start must appear before any chunks."""
        adapter = MockAdapter(responses={s: ["data"] for s in SECTIONS})
        orchestrator = AnalysisOrchestrator(
            transcript="Test: Hello",
            adapter=adapter,
            session_id="test-session-order",
        )

        events = []
        with patch.object(orchestrator, "_persist_section_result"), \
             patch.object(orchestrator, "_persist_section_error"), \
             patch.object(orchestrator, "_complete_session"):
            async for event in orchestrator.run_all():
                events.append(json.loads(event["data"]))

        for section in SECTIONS:
            section_events = [e for e in events if e.get("section") == section]
            if section_events:
                assert section_events[0]["type"] == "section_start"


# ---------------------------------------------------------------------------
# Task 4.3: Property test for fault-tolerant orchestration (Property 3)
# ---------------------------------------------------------------------------

# Strategy: random subset of sections to fail
failing_sections_strategy = st.frozensets(
    st.sampled_from(SECTIONS),
    min_size=0,
    max_size=7,  # At most 7 failures (leave at least 1 to succeed)
)


class TestFaultTolerantOrchestration:
    """Property 3: Fault-tolerant orchestration.

    For any subset of sections that raise exceptions, remaining sections
    complete successfully, failed sections have "error" status, session
    reaches terminal status.
    """

    @given(failures=failing_sections_strategy)
    @settings(max_examples=10, deadline=10000)
    @pytest.mark.asyncio
    async def test_failed_sections_dont_block_others(self, failures):
        """Failing sections should not prevent other sections from completing."""
        adapter = MockAdapter(
            responses={s: ["result"] for s in SECTIONS},
            failures=failures,
        )
        orchestrator = AnalysisOrchestrator(
            transcript="Test: Hello",
            adapter=adapter,
            session_id="test-property3",
        )

        events = []
        with patch.object(orchestrator, "_persist_section_result"), \
             patch.object(orchestrator, "_persist_section_error"), \
             patch.object(orchestrator, "_complete_session"):
            async for event in orchestrator.run_all():
                events.append(json.loads(event["data"]))

        # All done should always be emitted
        assert events[-1]["type"] == "all_done"

        # Failed sections should have section_error events
        error_events = [e for e in events if e["type"] == "section_error"]
        error_sections = {e["section"] for e in error_events}
        assert error_sections == failures

        # Successful sections should have section_done events
        done_events = [e for e in events if e["type"] == "section_done"]
        done_sections = {e["section"] for e in done_events}
        expected_successes = set(SECTIONS) - failures
        assert done_sections == expected_successes

    @pytest.mark.asyncio
    async def test_all_sections_fail_still_emits_all_done(self):
        """Even if all 8 sections fail, all_done should still be emitted."""
        adapter = MockAdapter(failures=set(SECTIONS))
        orchestrator = AnalysisOrchestrator(
            transcript="Test: Hello",
            adapter=adapter,
            session_id="test-all-fail",
        )

        events = []
        with patch.object(orchestrator, "_persist_section_result"), \
             patch.object(orchestrator, "_persist_section_error"), \
             patch.object(orchestrator, "_complete_session"):
            async for event in orchestrator.run_all():
                events.append(json.loads(event["data"]))

        assert events[-1]["type"] == "all_done"
        error_events = [e for e in events if e["type"] == "section_error"]
        assert len(error_events) == 8

    @pytest.mark.asyncio
    async def test_no_sections_fail_all_complete(self):
        """When no failures occur, all 8 sections complete successfully."""
        adapter = MockAdapter(responses={s: ["success"] for s in SECTIONS})
        orchestrator = AnalysisOrchestrator(
            transcript="Test: Hello",
            adapter=adapter,
            session_id="test-all-success",
        )

        events = []
        with patch.object(orchestrator, "_persist_section_result"), \
             patch.object(orchestrator, "_persist_section_error"), \
             patch.object(orchestrator, "_complete_session"):
            async for event in orchestrator.run_all():
                events.append(json.loads(event["data"]))

        assert events[-1]["type"] == "all_done"
        done_events = [e for e in events if e["type"] == "section_done"]
        assert len(done_events) == 8
        error_events = [e for e in events if e["type"] == "section_error"]
        assert len(error_events) == 0
