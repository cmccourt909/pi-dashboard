"""
Tests for POST /api/stakeholders/upload endpoint.
"""
import io

import pytest


class TestUploadEndpoint:
    """Tests for the stakeholder transcript upload endpoint."""

    def test_upload_valid_txt_file(self, client, session):
        """Valid .txt upload creates a session and 8 section results."""
        content = b"Alice: Hello everyone.\nBob: Hi Alice.\n"
        response = client.post(
            "/api/stakeholders/upload",
            files={"file": ("meeting.txt", io.BytesIO(content), "text/plain")},
        )
        assert response.status_code == 200
        data = response.json()
        assert "session_id" in data
        assert data["filename"] == "meeting.txt"
        assert data["warning"] is None

        # Verify session was persisted
        from app.models import AnalysisSession, AnalysisSectionResult

        sess = session.get(AnalysisSession, data["session_id"])
        assert sess is not None
        assert sess.status == "pending"
        assert sess.transcript_text == content.decode("utf-8")
        assert sess.has_speaker_attribution is True

        # Verify 8 section rows created
        sections = (
            session.query(AnalysisSectionResult)
            .filter_by(session_id=data["session_id"])
            .all()
        )
        assert len(sections) == 8
        for sec in sections:
            assert sec.status == "pending"

    def test_upload_rejects_non_txt_file(self, client):
        """Non-.txt files should be rejected with HTTP 415."""
        content = b"<html><body>not a transcript</body></html>"
        response = client.post(
            "/api/stakeholders/upload",
            files={"file": ("meeting.html", io.BytesIO(content), "text/html")},
        )
        assert response.status_code == 415
        assert "Only .txt files are supported" in response.json()["detail"]

    def test_upload_rejects_pdf_extension(self, client):
        """PDF files should be rejected with HTTP 415."""
        content = b"%PDF-1.4 fake pdf content"
        response = client.post(
            "/api/stakeholders/upload",
            files={"file": ("notes.pdf", io.BytesIO(content), "application/pdf")},
        )
        assert response.status_code == 415

    def test_upload_rejects_oversized_file(self, client):
        """Files exceeding 5MB should be rejected with HTTP 413."""
        # Create content slightly over 5MB
        content = b"x" * (5 * 1024 * 1024 + 1)
        response = client.post(
            "/api/stakeholders/upload",
            files={"file": ("big.txt", io.BytesIO(content), "text/plain")},
        )
        assert response.status_code == 413
        assert "5MB" in response.json()["detail"]

    def test_upload_accepts_file_at_exact_limit(self, client):
        """File exactly at 5MB should be accepted."""
        content = b"A" * (5 * 1024 * 1024)
        response = client.post(
            "/api/stakeholders/upload",
            files={"file": ("exact.txt", io.BytesIO(content), "text/plain")},
        )
        assert response.status_code == 200

    def test_upload_without_speaker_attribution_returns_warning(self, client):
        """Files with no speaker attribution should succeed but include a warning."""
        content = b"This is just a plain text document without any speakers.\nNo colons after names here.\n"
        response = client.post(
            "/api/stakeholders/upload",
            files={"file": ("plain.txt", io.BytesIO(content), "text/plain")},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["warning"] is not None
        assert "speaker attribution" in data["warning"].lower()

    def test_upload_with_speaker_attribution_no_warning(self, client):
        """Files with speaker attribution should have no warning."""
        content = b"John Smith: I think we should proceed.\nJane Doe: Agreed.\n"
        response = client.post(
            "/api/stakeholders/upload",
            files={"file": ("meeting.txt", io.BytesIO(content), "text/plain")},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["warning"] is None
