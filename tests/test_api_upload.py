"""
Regression tests: /api/upload endpoint (authentication and file handling).
"""
import io


def test_upload_requires_api_key(client):
    """Upload endpoint rejects requests without X-Upload-Key."""
    r = client.post("/api/upload", files={"file": ("test.csv", b"data", "text/csv")})
    assert r.status_code == 401
    assert "X-Upload-Key" in r.json()["detail"]


def test_upload_rejects_wrong_key(client):
    """Upload endpoint rejects requests with wrong key."""
    r = client.post(
        "/api/upload",
        files={"file": ("test.csv", b"data", "text/csv")},
        headers={"X-Upload-Key": "wrong-key"},
    )
    assert r.status_code == 401


def test_upload_rejects_unsupported_file_type(client):
    """Upload endpoint rejects non-CSV/XLSX files."""
    r = client.post(
        "/api/upload",
        files={"file": ("test.txt", b"hello", "text/plain")},
        headers={"X-Upload-Key": "test-key-123"},
    )
    assert r.status_code == 400
    assert "Unsupported file type" in r.json()["detail"]


def test_upload_accepts_csv_with_valid_key(client):
    """Upload endpoint accepts CSV with valid key (may fail to parse but should return 422 not 401)."""
    csv_content = b"Issue key,Summary,Status\nTST-1,Test,Done\n"
    r = client.post(
        "/api/upload",
        files={"file": ("stories.csv", csv_content, "text/csv")},
        headers={"X-Upload-Key": "test-key-123"},
    )
    # Should not be 401 — key is accepted
    assert r.status_code != 401
