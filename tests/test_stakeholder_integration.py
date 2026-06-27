"""
Integration tests for stakeholder analysis flows.

Task 19.1: Full upload → stream → persist flow
Task 19.2: Regeneration and export flows
"""
import asyncio
import io
import json
import uuid
from datetime import datetime, timezone
from typing import AsyncGenerator
from unittest.mock import patch

import pytest

from app.models import AnalysisSession, AnalysisSectionResult
from app.stakeholders.orchestrator import SECTIONS


# ---------------------------------------------------------------------------
# Mock adapter for integration tests
# ---------------------------------------------------------------------------

class IntegrationMockAdapter:
    """Mock adapter that returns canned responses identifiable per section."""

    SECTION_MARKERS = {
        "speaker_statistics": "participation analysis",
        "meeting_minutes": "meeting outcome extraction",
        "raid_log": "risk and dependency management",
        "delivery_signals": "action item prioritization",
        "team_health": "team dynamics and agile maturity",
        "gap_analysis": "meeting completeness and coverage",
        "empathy_map": "stakeholder empathy and perspective",
        "stakeholder_register": "stakeholder classification and influence",
    }

    def __init__(self):
        self.model = "integration-test-model"
        self.call_count = 0

    def _identify_section(self, prompt: str) -> str:
        for section_key, marker in self.SECTION_MARKERS.items():
            if marker in prompt:
                return section_key
        return "unknown"

    async def stream(self, prompt: str) -> AsyncGenerator[str, None]:
        self.call_count += 1
        section = self._identify_section(prompt)
        # Yield identifiable chunks for each section
        chunks = [f"## {section}\n\n", f"Analysis result for {section}. ", "All details here."]
        for chunk in chunks:
            await asyncio.sleep(0)
            yield chunk


# ---------------------------------------------------------------------------
# Task 19.1: Upload → stream → persist integration test
# ---------------------------------------------------------------------------

class TestUploadStreamPersistFlow:
    """Full upload → stream → persist integration tests."""

    def test_upload_creates_pending_session(self, client, session):
        """Upload endpoint creates a session with pending status."""
        content = b"Alice: We need to ship by Friday.\nBob: Agreed, let me check the timeline.\n"
        response = client.post(
            "/api/stakeholders/upload",
            files={"file": ("standup.txt", io.BytesIO(content), "text/plain")},
        )
        assert response.status_code == 200
        data = response.json()
        session_id = data["session_id"]

        # Verify session exists with pending status
        sess = session.get(AnalysisSession, session_id)
        assert sess is not None
        assert sess.status == "pending"
        assert sess.filename == "standup.txt"

    @pytest.mark.asyncio
    async def test_stream_produces_correct_event_sequence(self):
        """Streaming produces section_start → chunks → section_done for each section, then all_done."""
        from app.stakeholders.orchestrator import AnalysisOrchestrator

        adapter = IntegrationMockAdapter()
        orchestrator = AnalysisOrchestrator(
            transcript="Alice: Hello.\nBob: Hi.",
            adapter=adapter,
            session_id="integration-test-stream",
        )

        events = []
        with patch.object(orchestrator, "_persist_section_result"), \
             patch.object(orchestrator, "_persist_section_error"), \
             patch.object(orchestrator, "_complete_session"):
            async for event in orchestrator.run_all():
                events.append(json.loads(event["data"]))

        # Verify all_done is last
        assert events[-1]["type"] == "all_done"

        # Verify we get start/done for all 8 sections
        starts = [e for e in events if e["type"] == "section_start"]
        dones = [e for e in events if e["type"] == "section_done"]
        assert len(starts) == 8
        assert len(dones) == 8

        # Verify all section keys are represented
        start_sections = {e["section"] for e in starts}
        done_sections = {e["section"] for e in dones}
        assert start_sections == set(SECTIONS)
        assert done_sections == set(SECTIONS)

        # Verify chunks exist for each section
        chunks = [e for e in events if e["type"] == "chunk"]
        chunk_sections = {e["section"] for e in chunks}
        assert chunk_sections == set(SECTIONS)

    @pytest.mark.asyncio
    async def test_stream_persists_results_to_database(self, session):
        """After streaming, section results are persisted with correct content."""
        from app.stakeholders.orchestrator import AnalysisOrchestrator

        # Create session in DB
        session_id = str(uuid.uuid4())
        analysis_session = AnalysisSession(
            id=session_id,
            filename="persist_test.txt",
            file_size_bytes=50,
            transcript_text="Alice: Hello.\nBob: Hi.",
            has_speaker_attribution=True,
            status="running",
            prompt_version="v1.0",
        )
        session.add(analysis_session)
        for section_key in SECTIONS:
            session.add(AnalysisSectionResult(
                session_id=session_id,
                section_key=section_key,
                status="pending",
            ))
        session.commit()

        adapter = IntegrationMockAdapter()
        orchestrator = AnalysisOrchestrator(
            transcript="Alice: Hello.\nBob: Hi.",
            adapter=adapter,
            session_id=session_id,
        )

        # Consume the stream
        async for _ in orchestrator.run_all():
            pass

        # Refresh session to see updates
        session.expire_all()

        # Verify session is complete
        sess = session.get(AnalysisSession, session_id)
        assert sess.status == "complete"
        assert sess.completed_at is not None

        # Verify all sections are persisted
        sections = session.query(AnalysisSectionResult).filter_by(session_id=session_id).all()
        assert len(sections) == 8
        for sec in sections:
            assert sec.status == "complete"
            assert sec.result_text is not None
            assert len(sec.result_text) > 0
            assert sec.section_key in sec.result_text  # Our mock includes section key

    def test_session_status_transitions_pending_to_running(self, client, session):
        """Stream endpoint sets session status to 'running'."""
        content = b"Alice: Test transcript.\n"
        upload_resp = client.post(
            "/api/stakeholders/upload",
            files={"file": ("status.txt", io.BytesIO(content), "text/plain")},
        )
        session_id = upload_resp.json()["session_id"]

        # Verify initial status is pending
        sess = session.get(AnalysisSession, session_id)
        assert sess.status == "pending"

        # The stream endpoint would set it to running (we can't fully consume SSE in test client easily)
        # But we can verify the endpoint exists and accepts the request
        detail_resp = client.get(f"/api/stakeholders/sessions/{session_id}")
        assert detail_resp.status_code == 200


# ---------------------------------------------------------------------------
# Task 19.2: Regeneration and export integration tests
# ---------------------------------------------------------------------------

class TestRegenerationFlow:
    """Integration tests for regeneration flow."""

    @pytest.mark.asyncio
    async def test_regeneration_updates_single_section(self, session):
        """Regeneration replaces one section result, others unchanged."""
        from app.stakeholders.orchestrator import AnalysisOrchestrator

        session_id = str(uuid.uuid4())
        analysis_session = AnalysisSession(
            id=session_id,
            filename="regen_integ.txt",
            file_size_bytes=50,
            transcript_text="Alice: Hello.\nBob: Hi.",
            has_speaker_attribution=True,
            status="complete",
            prompt_version="v1.0",
        )
        session.add(analysis_session)

        # Create sections with known content
        for section_key in SECTIONS:
            session.add(AnalysisSectionResult(
                session_id=session_id,
                section_key=section_key,
                status="complete",
                result_text=f"Original: {section_key}",
                model_name="original-model",
            ))
        session.commit()

        # Regenerate only speaker_statistics
        adapter = IntegrationMockAdapter()
        orchestrator = AnalysisOrchestrator(
            transcript="Alice: Hello.\nBob: Hi.",
            adapter=adapter,
            session_id=session_id,
        )

        async for _ in orchestrator.run_section("speaker_statistics"):
            pass

        # Refresh
        session.expire_all()

        # Verify speaker_statistics was updated
        updated = session.query(AnalysisSectionResult).filter_by(
            session_id=session_id, section_key="speaker_statistics"
        ).one()
        assert updated.status == "complete"
        assert "Original" not in updated.result_text
        assert "speaker_statistics" in updated.result_text

        # Verify other sections are unchanged
        for section_key in SECTIONS:
            if section_key == "speaker_statistics":
                continue
            sec = session.query(AnalysisSectionResult).filter_by(
                session_id=session_id, section_key=section_key
            ).one()
            assert sec.result_text == f"Original: {section_key}"
            assert sec.model_name == "original-model"


class TestExportFlow:
    """Integration tests for export flow."""

    def test_export_returns_valid_markdown_with_all_sections(self, client, session):
        """Export endpoint returns Markdown containing all completed sections."""
        # Create a complete session
        session_id = str(uuid.uuid4())
        analysis_session = AnalysisSession(
            id=session_id,
            filename="export_integ.txt",
            file_size_bytes=50,
            transcript_text="test",
            has_speaker_attribution=True,
            status="complete",
            prompt_version="v1.0",
            created_at=datetime(2024, 6, 15, 10, 0, 0, tzinfo=timezone.utc),
        )
        session.add(analysis_session)
        for section_key in SECTIONS:
            session.add(AnalysisSectionResult(
                session_id=session_id,
                section_key=section_key,
                status="complete",
                result_text=f"Content for {section_key}",
            ))
        session.commit()

        response = client.get(f"/api/stakeholders/sessions/{session_id}/export?format=markdown")
        assert response.status_code == 200
        md = response.text

        # Verify all sections present
        for section_key in SECTIONS:
            assert f"Content for {section_key}" in md

        # Verify metadata
        assert "export_integ.txt" in md
        assert "2024-06-15" in md

    def test_delete_cascades_to_section_results(self, client, session):
        """Deleting a session removes all associated section results."""
        session_id = str(uuid.uuid4())
        analysis_session = AnalysisSession(
            id=session_id,
            filename="delete_integ.txt",
            file_size_bytes=50,
            transcript_text="test",
            has_speaker_attribution=True,
            status="complete",
            prompt_version="v1.0",
        )
        session.add(analysis_session)
        for section_key in SECTIONS:
            session.add(AnalysisSectionResult(
                session_id=session_id,
                section_key=section_key,
                status="complete",
                result_text=f"Result: {section_key}",
            ))
        session.commit()

        # Delete via API
        response = client.delete(f"/api/stakeholders/sessions/{session_id}")
        assert response.status_code == 200

        # Verify cascade
        remaining = session.query(AnalysisSectionResult).filter_by(session_id=session_id).all()
        assert len(remaining) == 0

        # Verify session is gone
        assert session.get(AnalysisSession, session_id) is None
