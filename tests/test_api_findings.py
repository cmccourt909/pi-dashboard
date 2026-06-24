"""
Regression tests: /api/findings endpoint.
Tests the Finding type alignment between backend and frontend (critical bug fix).
"""


def test_findings_endpoint_returns_list(seeded_client):
    """GET /api/findings returns a list."""
    r = seeded_client.get("/api/findings")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) > 0


def test_finding_has_correct_schema(seeded_client):
    """Each finding matches the FindingOut Pydantic schema (regression: type mismatch bug)."""
    r = seeded_client.get("/api/findings")
    finding = r.json()[0]

    # These are the CORRECT fields (from schemas.py FindingOut)
    required = ["rule_id", "severity", "category", "title", "detail", "recommendation", "issue_keys"]
    for field in required:
        assert field in finding, f"Missing field: {field}"

    # These are the WRONG fields that the frontend previously expected (should NOT be present)
    wrong_fields = ["description", "affected_entity", "entity_type", "metric_value", "metric_threshold", "id"]
    for field in wrong_fields:
        assert field not in finding, f"Unexpected legacy field present: {field}"


def test_finding_severity_is_valid(seeded_client):
    """Finding severity is one of critical/warning/info."""
    r = seeded_client.get("/api/findings")
    for f in r.json():
        assert f["severity"] in ("critical", "warning", "info")


def test_finding_issue_keys_is_list(seeded_client):
    """issue_keys is always a list (not a string or null)."""
    r = seeded_client.get("/api/findings")
    for f in r.json():
        assert isinstance(f["issue_keys"], list)


def test_findings_filter_by_severity(seeded_client):
    """Severity query param filters findings."""
    r = seeded_client.get("/api/findings?severity=critical")
    assert r.status_code == 200
    for f in r.json():
        assert f["severity"] == "critical"


def test_findings_filter_by_category(seeded_client):
    """Category query param filters findings."""
    r = seeded_client.get("/api/findings?category=trajectory")
    assert r.status_code == 200
    for f in r.json():
        assert f["category"] == "trajectory"
