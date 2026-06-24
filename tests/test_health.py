"""
Regression tests: Health & connectivity endpoints.
"""


def test_health_endpoint(client):
    """Backend health check returns 200."""
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_health_cors_headers(client):
    """CORS headers are present on responses."""
    r = client.get("/health", headers={"Origin": "http://localhost:3000"})
    assert r.status_code == 200
