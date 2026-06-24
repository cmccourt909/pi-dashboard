"""
Regression tests: /api/seed-demo endpoint.
"""


def test_seed_requires_auth(client):
    """Seed endpoint requires X-Upload-Key or Entra ID auth."""
    r = client.post("/api/seed-demo")
    assert r.status_code == 401


def test_seed_with_valid_key(client):
    """Seed endpoint succeeds with correct API key."""
    r = client.post("/api/seed-demo", headers={"X-Upload-Key": "test-key-123"})
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert "Demo data seeded" in data["message"]


def test_seed_creates_data(client):
    """After seeding, PIs and findings are available."""
    # Seed
    client.post("/api/seed-demo", headers={"X-Upload-Key": "test-key-123"})

    # Verify PIs exist
    r = client.get("/api/pis")
    assert r.status_code == 200
    pis = r.json()
    assert len(pis) >= 2
    pi_names = [p["name"] for p in pis]
    assert "26.2" in pi_names
    assert "26.3" in pi_names

    # Verify findings exist
    r = client.get("/api/findings")
    assert r.status_code == 200
    assert len(r.json()) > 0


def test_seed_is_idempotent(client):
    """Seeding twice doesn't error or create duplicates."""
    headers = {"X-Upload-Key": "test-key-123"}
    r1 = client.post("/api/seed-demo", headers=headers)
    assert r1.status_code == 200

    r2 = client.post("/api/seed-demo", headers=headers)
    assert r2.status_code == 200

    # Should still have exactly 2 PIs, not 4
    r = client.get("/api/pis")
    pi_names = [p["name"] for p in r.json()]
    assert pi_names.count("26.2") == 1
    assert pi_names.count("26.3") == 1


def test_seed_accepts_entra_header(client):
    """Seed endpoint accepts x-ms-client-principal as auth (Entra ID)."""
    r = client.post("/api/seed-demo", headers={"x-ms-client-principal": "dGVzdA=="})
    assert r.status_code == 200
