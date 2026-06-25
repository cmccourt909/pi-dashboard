"""
Tests for GET /api/pis/{pi}/features endpoint.
"""
import pytest


class TestGetPIFeatures:
    """Test the FeatureItem API endpoint."""

    def test_invalid_pi_returns_404(self, client):
        """WHEN the PI does not exist THEN return 404."""
        resp = client.get("/api/pis/99.99/features")
        assert resp.status_code == 404
        assert "not found" in resp.json()["detail"].lower()

    def test_valid_pi_returns_200(self, seeded_client):
        """WHEN the PI exists THEN return 200 with feature list."""
        # First get list of PIs to find a valid name
        pis_resp = seeded_client.get("/api/pis")
        assert pis_resp.status_code == 200
        pis = pis_resp.json()
        assert len(pis) > 0

        pi_name = pis[0]["name"]
        resp = seeded_client.get(f"/api/pis/{pi_name}/features")
        assert resp.status_code == 200
        features = resp.json()
        assert isinstance(features, list)

    def test_feature_item_schema(self, seeded_client):
        """Verify each FeatureItem has required fields."""
        pis_resp = seeded_client.get("/api/pis")
        pis = pis_resp.json()
        if not pis:
            pytest.skip("No PIs in seeded data")

        pi_name = pis[0]["name"]
        resp = seeded_client.get(f"/api/pis/{pi_name}/features")
        features = resp.json()

        if not features:
            pytest.skip("No features found for this PI")

        for feat in features:
            # Required fields
            assert "feature_key" in feat
            assert "summary" in feat
            assert "team" in feat
            assert "status" in feat
            assert "status_category" in feat
            assert "rag_status" in feat
            assert feat["rag_status"] in ("red", "amber", "green")
            assert "pi_completion" in feat
            assert "blockers" in feat
            assert "is_blocked_by" in feat
            assert "sprint_breakdown" in feat
            assert "lodestar_static" in feat

            # PI completion structure
            assert isinstance(feat["pi_completion"], list)
            for pc in feat["pi_completion"]:
                assert "pi_name" in pc
                assert "done_pct" in pc
                assert "prog_pct" in pc
                assert "todo_pct" in pc
                assert "story_count" in pc
                assert "sp_done" in pc
                assert "sp_total" in pc
                # Percentages must sum to 100
                total = pc["done_pct"] + pc["prog_pct"] + pc["todo_pct"]
                assert abs(total - 100.0) < 0.2, f"Percentages sum to {total}, expected 100"

            # Sprint breakdown structure
            assert isinstance(feat["sprint_breakdown"], list)
            for sb in feat["sprint_breakdown"]:
                assert "sprint_name" in sb
                assert "state" in sb
                assert "story_count" in sb
                assert "done_count" in sb

    def test_team_derivation(self, seeded_client):
        """Verify team is derived from project key prefix."""
        pis_resp = seeded_client.get("/api/pis")
        pis = pis_resp.json()
        if not pis:
            pytest.skip("No PIs in seeded data")

        pi_name = pis[0]["name"]
        resp = seeded_client.get(f"/api/pis/{pi_name}/features")
        features = resp.json()

        valid_teams = {"Alpha", "Bravo", "Charlie", "Unassigned"}
        for feat in features:
            assert feat["team"] in valid_teams, f"Unexpected team: {feat['team']}"
