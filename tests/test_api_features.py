"""
Regression tests: /api/features endpoint.
"""


def test_features_endpoint_returns_list(seeded_client):
    """GET /api/features returns a list of feature summaries."""
    r = seeded_client.get("/api/features")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) > 0


def test_feature_has_required_fields(seeded_client):
    """Each feature has all required FeatureSummary fields."""
    r = seeded_client.get("/api/features")
    feature = r.json()[0]
    required = ["feature_key", "feature_summary", "total_stories", "done_stories",
                "blocked_stories", "pct_complete", "health", "stories"]
    for field in required:
        assert field in feature, f"Missing field: {field}"


def test_feature_stories_have_required_fields(seeded_client):
    """Stories within a feature have the correct schema."""
    r = seeded_client.get("/api/features")
    feature_with_stories = next((f for f in r.json() if len(f["stories"]) > 0), None)
    assert feature_with_stories is not None

    story = feature_with_stories["stories"][0]
    required = ["jira_key", "summary", "status", "status_category", "project_key",
                "sprint_name", "assignee", "story_points", "blocked"]
    for field in required:
        assert field in story, f"Story missing field: {field}"


def test_feature_pct_complete_range(seeded_client):
    """Feature pct_complete is between 0 and 100."""
    r = seeded_client.get("/api/features")
    for f in r.json():
        assert 0 <= f["pct_complete"] <= 100
