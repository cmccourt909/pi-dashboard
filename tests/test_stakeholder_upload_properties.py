"""
Property-based tests for the stakeholder upload endpoint.

Property 1: Upload creates session with stored content
Property 2: Non-speaker text accepted with warning

Validates: Requirements 1.3, 1.6
"""
import io
import string

import pytest
from hypothesis import given, settings, assume, HealthCheck
from hypothesis import strategies as st


# Strategy: valid transcript text (non-empty, ≤5MB, printable + whitespace)
valid_transcript_text = st.text(
    alphabet=st.characters(whitelist_categories=("L", "N", "P", "Z", "S")),
    min_size=1,
    max_size=1000,  # Keep manageable for fast tests
).filter(lambda t: len(t.encode("utf-8")) <= 5 * 1024 * 1024)

# Strategy: text WITHOUT speaker attribution pattern (no "Name: " at line start)
non_speaker_text = st.text(
    alphabet=st.characters(whitelist_categories=("Ll", "N", "P", "Zs")),
    min_size=5,
    max_size=200,
).filter(
    lambda t: not any(
        line.strip() and line.strip()[0].isupper() and ":" in line
        for line in t.split("\n")
    )
)


class TestUploadProperty1:
    """Property 1: Upload creates session with stored content.

    For any valid .txt content (non-empty, ≤5MB), upload returns a session ID
    and transcript is retrievable identically from the database.
    """

    @given(content=valid_transcript_text)
    @settings(max_examples=20, deadline=5000, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_upload_creates_session_with_identical_content(self, client, session, content):
        content_bytes = content.encode("utf-8")
        assume(len(content_bytes) <= 5 * 1024 * 1024)
        assume(len(content_bytes) > 0)

        response = client.post(
            "/api/stakeholders/upload",
            files={"file": ("test.txt", io.BytesIO(content_bytes), "text/plain")},
        )
        assert response.status_code == 200
        data = response.json()
        assert "session_id" in data

        # Verify content is stored identically
        from app.models import AnalysisSession
        stored = session.get(AnalysisSession, data["session_id"])
        assert stored is not None
        assert stored.transcript_text == content


class TestUploadProperty2:
    """Property 2: Non-speaker text accepted with warning.

    For any text without speaker attribution pattern, upload succeeds
    with a warning flag.
    """

    @given(content=non_speaker_text)
    @settings(max_examples=20, deadline=5000, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_non_speaker_text_returns_warning(self, client, content):
        content_bytes = content.encode("utf-8")
        assume(len(content_bytes) > 0)
        assume(len(content_bytes) <= 5 * 1024 * 1024)

        response = client.post(
            "/api/stakeholders/upload",
            files={"file": ("plain.txt", io.BytesIO(content_bytes), "text/plain")},
        )
        assert response.status_code == 200
        data = response.json()
        # Should have a warning about missing speaker attribution
        assert data["warning"] is not None
        assert "speaker" in data["warning"].lower()
