"""
Regression tests: /api/enrich endpoints.
Tests the enrichment service's error handling, caching, and degradation.
Note: actual LLM calls are not tested here (requires Azure OpenAI).
"""
import os


def test_enrich_status_returns_config_info(client):
    """GET /api/enrich/status returns configuration info."""
    r = client.get("/api/enrich/status")
    assert r.status_code == 200
    data = r.json()
    assert "status" in data
    # Without AZURE_OPENAI_ENDPOINT set, should report not_configured
    if not os.environ.get("AZURE_OPENAI_ENDPOINT"):
        assert data["status"] == "not_configured"


def test_enrich_findings_503_when_not_configured(client):
    """POST /api/enrich/findings returns 503 when OpenAI not configured."""
    # Clear any endpoint that might be set
    old = os.environ.pop("AZURE_OPENAI_ENDPOINT", None)
    try:
        # Reset cached client
        import app.api.routers.enrich as enrich_mod
        enrich_mod._client_instance = None

        r = client.post("/api/enrich/findings", json={
            "findings": [{"rule_id": "test", "severity": "info", "category": "flow", "title": "t", "detail": "d"}]
        })
        assert r.status_code == 503
        assert "not configured" in r.json()["detail"].lower()
    finally:
        if old:
            os.environ["AZURE_OPENAI_ENDPOINT"] = old
        enrich_mod._client_instance = None


def test_enrich_briefing_503_when_not_configured(client):
    """POST /api/enrich/briefing returns 503 when OpenAI not configured."""
    old = os.environ.pop("AZURE_OPENAI_ENDPOINT", None)
    try:
        import app.api.routers.enrich as enrich_mod
        enrich_mod._client_instance = None

        r = client.post("/api/enrich/briefing", json={
            "findings": [{"rule_id": "test", "severity": "info", "category": "flow", "title": "t", "detail": "d"}]
        })
        assert r.status_code == 503
    finally:
        if old:
            os.environ["AZURE_OPENAI_ENDPOINT"] = old
        enrich_mod._client_instance = None


def test_enrich_request_validation(client):
    """Enrichment endpoint validates request body."""
    r = client.post("/api/enrich/findings", json={"findings": []})
    # Empty findings is valid (just returns empty list or 503)
    assert r.status_code in (200, 503)


def test_enrich_cache_key_deterministic():
    """Cache key is deterministic for the same findings."""
    from app.api.routers.enrich import _cache_key, FindingInput

    findings = [
        FindingInput(rule_id="r1", severity="critical", category="flow", title="t1", detail="d1"),
        FindingInput(rule_id="r2", severity="warning", category="hygiene", title="t2", detail="d2"),
    ]

    key1 = _cache_key(findings, "enrich")
    key2 = _cache_key(findings, "enrich")
    assert key1 == key2
    assert len(key1) == 64  # SHA-256 hex digest


def test_enrich_cache_key_varies_by_purpose():
    """Cache key differs between enrich and briefing for same findings."""
    from app.api.routers.enrich import _cache_key, FindingInput

    findings = [FindingInput(rule_id="r1", severity="info", category="flow", title="t", detail="d")]
    key_enrich = _cache_key(findings, "enrich")
    key_briefing = _cache_key(findings, "briefing")
    assert key_enrich != key_briefing


def test_error_classification():
    """Error classifier maps exceptions to correct error types."""
    from app.api.routers.enrich import _classify_error, ProviderAuthError, ProviderRateLimitError, ProviderTimeoutError

    auth_err = Exception("401 Unauthorized: authentication failed")
    classified = _classify_error(auth_err)
    assert isinstance(classified, ProviderAuthError)

    rate_err = Exception("429 Rate limit exceeded")
    classified = _classify_error(rate_err)
    assert isinstance(classified, ProviderRateLimitError)

    timeout_err = Exception("Request timed out after 30s")
    classified = _classify_error(timeout_err)
    assert isinstance(classified, ProviderTimeoutError)
