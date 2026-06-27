"""
Tests for stakeholder session CRUD endpoints and export.

Task 6.2: Property test for session persistence round-trip (Property 12)
Task 8.2: Property test for export completeness (Property 14)
Task 8.3: Unit tests for export Markdown formatting
"""
import io
import uuid
from datetime import datetime, timezone

import pytest
from hypothesis import given, settings, HealthCheck
from hypothesis import strategies as st

from app.models import AnalysisSession, AnalysisSectionResult
from app.stakeholders.export import ExportService, SECTION_ORDER, SECTION_TITLES


SECTIONS = [
    "speaker_statistics",
    "meeting_minutes",
    "raid_log",
    "delivery_signals",
    "team_health",
    "gap_analysis",
    "empathy_map",
    "stakeholder_register",
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _create_complete_session(session, filename="test.txt", transcript="Alice: Hello"):
    """Create a complete session with all 8 sections filled."""
    session_id = str(uuid.uuid4())
    analysis_session = AnalysisSession(
        id=session_id,
        filename=filename,
        file_size_bytes=len(transcript.encode()),
        transcript_text=transcript,
        has_speaker_attribution=True,
        status="complete",
        prompt_version="v1.0",
        created_at=datetime(2024, 6, 1, 12, 0, 0, tzinfo=timezone.utc),
        completed_at=datetime(2024, 6, 1, 12, 0, 30, tzinfo=timezone.utc),
    )
    session.add(analysis_session)

    for section_key in SECTIONS:
        section_result = AnalysisSectionResult(
            session_id=session_id,
            section_key=section_key,
            status="complete",
            result_text=f"# {section_key} result\n\nThis is the analysis for {section_key}.",
            generated_at=datetime(2024, 6, 1, 12, 0, 15, tzinfo=timezone.utc),
            model_name="test-model",
        )
        session.add(section_result)

    session.commit()
    return session_id


# ---------------------------------------------------------------------------
# Unit tests for session CRUD endpoints
# ---------------------------------------------------------------------------

class TestSessionListEndpoint:
    """GET /api/stakeholders/sessions"""

    def test_list_sessions_empty(self, client):
        response = client.get("/api/stakeholders/sessions")
        assert response.status_code == 200
        # May return sessions from other tests, but should be a list
        assert isinstance(response.json(), list)

    def test_list_sessions_returns_created_session(self, client, session):
        session_id = _create_complete_session(session)
        response = client.get("/api/stakeholders/sessions")
        assert response.status_code == 200
        sessions = response.json()
        ids = [s["id"] for s in sessions]
        assert session_id in ids

    def test_list_sessions_includes_required_fields(self, client, session):
        _create_complete_session(session)
        response = client.get("/api/stakeholders/sessions")
        assert response.status_code == 200
        for s in response.json():
            assert "id" in s
            assert "filename" in s
            assert "created_at" in s
            assert "status" in s


class TestSessionDetailEndpoint:
    """GET /api/stakeholders/sessions/{session_id}"""

    def test_get_session_detail(self, client, session):
        session_id = _create_complete_session(session)
        response = client.get(f"/api/stakeholders/sessions/{session_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == session_id
        assert data["filename"] == "test.txt"
        assert data["status"] == "complete"
        assert len(data["sections"]) == 8

    def test_get_session_detail_includes_section_results(self, client, session):
        session_id = _create_complete_session(session)
        response = client.get(f"/api/stakeholders/sessions/{session_id}")
        data = response.json()
        for sec in data["sections"]:
            assert "section_key" in sec
            assert "status" in sec
            assert "result_text" in sec
            assert sec["status"] == "complete"
            assert sec["result_text"] is not None

    def test_get_session_404_for_unknown_id(self, client):
        response = client.get(f"/api/stakeholders/sessions/{uuid.uuid4()}")
        assert response.status_code == 404


class TestSessionDeleteEndpoint:
    """DELETE /api/stakeholders/sessions/{session_id}"""

    def test_delete_session_succeeds(self, client, session):
        session_id = _create_complete_session(session)
        response = client.delete(f"/api/stakeholders/sessions/{session_id}")
        assert response.status_code == 200
        assert response.json()["status"] == "deleted"

        # Verify it's gone
        response = client.get(f"/api/stakeholders/sessions/{session_id}")
        assert response.status_code == 404

    def test_delete_session_cascades_to_sections(self, client, session):
        session_id = _create_complete_session(session)
        client.delete(f"/api/stakeholders/sessions/{session_id}")

        # Verify section results are also deleted
        remaining = session.query(AnalysisSectionResult).filter_by(session_id=session_id).all()
        assert len(remaining) == 0

    def test_delete_session_404_for_unknown_id(self, client):
        response = client.delete(f"/api/stakeholders/sessions/{uuid.uuid4()}")
        assert response.status_code == 404


# ---------------------------------------------------------------------------
# Task 6.2: Property 12 — Session persistence round-trip
# ---------------------------------------------------------------------------

# Strategy: generate section result text
section_result_text = st.text(min_size=10, max_size=200)


class TestSessionPersistenceRoundTrip:
    """Property 12: Session persistence round-trip.

    For any completed session with N sections, retrieving by ID returns all N
    sections with identical result text, no LLM calls invoked.
    """

    @given(
        filename=st.from_regex(r"[a-z]{3,10}\.txt", fullmatch=True),
        result_texts=st.lists(section_result_text, min_size=8, max_size=8),
    )
    @settings(max_examples=10, deadline=5000, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_round_trip_preserves_content(self, session, client, filename, result_texts):
        """Stored section results are returned identically on retrieval."""
        session_id = str(uuid.uuid4())
        analysis_session = AnalysisSession(
            id=session_id,
            filename=filename,
            file_size_bytes=100,
            transcript_text="Test transcript",
            has_speaker_attribution=True,
            status="complete",
            prompt_version="v1.0",
        )
        session.add(analysis_session)

        for i, section_key in enumerate(SECTIONS):
            section_result = AnalysisSectionResult(
                session_id=session_id,
                section_key=section_key,
                status="complete",
                result_text=result_texts[i],
            )
            session.add(section_result)
        session.commit()

        # Retrieve via API
        response = client.get(f"/api/stakeholders/sessions/{session_id}")
        assert response.status_code == 200
        data = response.json()

        # All 8 sections returned with identical text
        assert len(data["sections"]) == 8
        section_map = {s["section_key"]: s for s in data["sections"]}
        for i, section_key in enumerate(SECTIONS):
            assert section_map[section_key]["result_text"] == result_texts[i]
            assert section_map[section_key]["status"] == "complete"


# ---------------------------------------------------------------------------
# Task 8.3: Unit tests for export Markdown formatting
# ---------------------------------------------------------------------------

class TestExportMarkdownFormatting:
    """Unit tests for ExportService.to_markdown()."""

    def test_export_contains_metadata_header(self, session):
        session_id = _create_complete_session(session)
        analysis_session = session.get(AnalysisSession, session_id)
        service = ExportService(analysis_session, session)
        md = service.to_markdown()

        assert "# Stakeholder Analysis Report" in md
        assert "**Filename:** test.txt" in md
        assert "**Date:**" in md
        assert "**Sections Completed:** 8/8" in md
        assert "**Prompt Version:** v1.0" in md

    def test_export_contains_all_section_headers(self, session):
        session_id = _create_complete_session(session)
        analysis_session = session.get(AnalysisSession, session_id)
        service = ExportService(analysis_session, session)
        md = service.to_markdown()

        for title in SECTION_TITLES.values():
            assert f"## {title}" in md

    def test_export_section_ordering_matches_canonical_order(self, session):
        session_id = _create_complete_session(session)
        analysis_session = session.get(AnalysisSession, session_id)
        service = ExportService(analysis_session, session)
        md = service.to_markdown()

        # Verify sections appear in canonical order
        positions = []
        for section_key in SECTION_ORDER:
            title = SECTION_TITLES[section_key]
            pos = md.find(f"## {title}")
            assert pos >= 0, f"Section '{title}' not found in export"
            positions.append(pos)

        # Should be in ascending order
        assert positions == sorted(positions)

    def test_export_contains_section_result_text(self, session):
        session_id = _create_complete_session(session)
        analysis_session = session.get(AnalysisSession, session_id)
        service = ExportService(analysis_session, session)
        md = service.to_markdown()

        for section_key in SECTIONS:
            assert f"This is the analysis for {section_key}" in md

    def test_export_handles_error_sections(self, session):
        """Sections with error status should show error message."""
        session_id = str(uuid.uuid4())
        analysis_session = AnalysisSession(
            id=session_id,
            filename="error_test.txt",
            file_size_bytes=50,
            transcript_text="test",
            has_speaker_attribution=True,
            status="complete",
            prompt_version="v1.0",
        )
        session.add(analysis_session)

        # Add one complete and one error section
        session.add(AnalysisSectionResult(
            session_id=session_id,
            section_key="speaker_statistics",
            status="complete",
            result_text="Good result",
        ))
        session.add(AnalysisSectionResult(
            session_id=session_id,
            section_key="meeting_minutes",
            status="error",
            error_message="Timeout after 30s",
        ))
        session.commit()

        service = ExportService(analysis_session, session)
        md = service.to_markdown()

        assert "Good result" in md
        assert "*Section failed: Timeout after 30s*" in md

    def test_export_handles_pending_sections(self, session):
        """Pending sections should show appropriate placeholder."""
        session_id = str(uuid.uuid4())
        analysis_session = AnalysisSession(
            id=session_id,
            filename="pending_test.txt",
            file_size_bytes=50,
            transcript_text="test",
            has_speaker_attribution=True,
            status="pending",
            prompt_version="v1.0",
        )
        session.add(analysis_session)
        session.add(AnalysisSectionResult(
            session_id=session_id,
            section_key="speaker_statistics",
            status="pending",
        ))
        session.commit()

        service = ExportService(analysis_session, session)
        md = service.to_markdown()

        assert "*Section pending or incomplete.*" in md


# ---------------------------------------------------------------------------
# Task 8.2: Property 14 — Export completeness
# ---------------------------------------------------------------------------

class TestExportCompleteness:
    """Property 14: Export completeness.

    For any completed session, exported Markdown contains filename, date,
    header for each of 8 sections, and full result text of every completed section.
    """

    @given(
        filename=st.from_regex(r"[a-z]{3,10}\.txt", fullmatch=True),
        result_texts=st.lists(
            st.text(min_size=5, max_size=100),
            min_size=8,
            max_size=8,
        ),
    )
    @settings(max_examples=10, deadline=5000, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_export_contains_all_required_elements(self, session, filename, result_texts):
        session_id = str(uuid.uuid4())
        analysis_session = AnalysisSession(
            id=session_id,
            filename=filename,
            file_size_bytes=100,
            transcript_text="transcript",
            has_speaker_attribution=True,
            status="complete",
            prompt_version="v1.0",
            created_at=datetime(2024, 6, 15, 10, 0, 0, tzinfo=timezone.utc),
        )
        session.add(analysis_session)

        for i, section_key in enumerate(SECTIONS):
            session.add(AnalysisSectionResult(
                session_id=session_id,
                section_key=section_key,
                status="complete",
                result_text=result_texts[i],
            ))
        session.commit()

        service = ExportService(analysis_session, session)
        md = service.to_markdown()

        # Must contain filename
        assert filename in md

        # Must contain date
        assert "2024-06-15" in md

        # Must contain header for each of 8 sections
        for title in SECTION_TITLES.values():
            assert f"## {title}" in md

        # Must contain full result text of every completed section
        for text in result_texts:
            assert text in md


# ---------------------------------------------------------------------------
# Export endpoint test
# ---------------------------------------------------------------------------

class TestExportEndpoint:
    """GET /api/stakeholders/sessions/{session_id}/export"""

    def test_export_returns_markdown_content_type(self, client, session):
        session_id = _create_complete_session(session)
        response = client.get(f"/api/stakeholders/sessions/{session_id}/export?format=markdown")
        assert response.status_code == 200
        assert "text/markdown" in response.headers["content-type"]

    def test_export_has_content_disposition_header(self, client, session):
        session_id = _create_complete_session(session)
        response = client.get(f"/api/stakeholders/sessions/{session_id}/export?format=markdown")
        assert "content-disposition" in response.headers
        assert "attachment" in response.headers["content-disposition"]
        assert ".md" in response.headers["content-disposition"]

    def test_export_404_for_unknown_session(self, client):
        response = client.get(f"/api/stakeholders/sessions/{uuid.uuid4()}/export?format=markdown")
        assert response.status_code == 404
