"""
Regression tests: /api/pis endpoint.
"""


def test_pis_endpoint_returns_list(seeded_client):
    """GET /api/pis returns a list of PI summaries."""
    r = seeded_client.get("/api/pis")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 2  # PI 26.2 and 26.3


def test_pi_has_required_fields(seeded_client):
    """Each PI has all required schema fields."""
    r = seeded_client.get("/api/pis")
    pi = r.json()[0]
    required = ["name", "start_date", "end_date", "total_issues", "done_issues",
                "blocked_issues", "pct_complete", "critical_findings", "health", "sprints"]
    for field in required:
        assert field in pi, f"Missing field: {field}"


def test_pi_sprints_have_required_fields(seeded_client):
    """Sprint summaries within a PI have all required fields."""
    r = seeded_client.get("/api/pis")
    pis = r.json()
    # Find a PI with sprints
    pi_with_sprints = next((p for p in pis if len(p["sprints"]) > 0), None)
    assert pi_with_sprints is not None, "No PI has sprints"

    sprint = pi_with_sprints["sprints"][0]
    required = ["jira_id", "name", "state", "total_issues", "done_issues",
                "blocked_issues", "pct_complete"]
    for field in required:
        assert field in sprint, f"Sprint missing field: {field}"


def test_pi_health_is_valid_value(seeded_client):
    """PI health field is one of green/amber/red."""
    r = seeded_client.get("/api/pis")
    for pi in r.json():
        assert pi["health"] in ("green", "amber", "red"), f"Invalid health: {pi['health']}"


def test_pi_pct_complete_range(seeded_client):
    """PI pct_complete is between 0 and 100."""
    r = seeded_client.get("/api/pis")
    for pi in r.json():
        assert 0 <= pi["pct_complete"] <= 100
