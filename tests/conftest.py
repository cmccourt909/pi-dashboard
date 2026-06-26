"""
Pytest configuration and shared fixtures for Waypoint regression tests.
"""
import os
import tempfile

# MUST be set before any app imports
# Use a separate test database so we don't clobber the dev app.db
TEST_DB_PATH = os.path.join(os.path.dirname(__file__), "test_app.db")
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_PATH}"
os.environ.setdefault("UPLOAD_API_KEY", "test-key-123")
os.environ["SKIP_STARTUP_MIGRATIONS"] = "1"

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


@pytest.fixture(scope="session", autouse=True)
def setup_db():
    """Create a fresh test database schema once for the session."""
    from app.models import Base, get_engine
    # Remove any existing test DB so create_all builds the latest schema
    try:
        os.remove(TEST_DB_PATH)
    except OSError:
        pass
    eng = get_engine()
    Base.metadata.create_all(eng)
    yield eng
    # Cleanup
    try:
        os.remove(TEST_DB_PATH)
    except OSError:
        pass


@pytest.fixture
def engine(setup_db):
    return setup_db


@pytest.fixture
def session(engine):
    """Create a fresh database session for each test."""
    Session = sessionmaker(bind=engine)
    sess = Session()
    yield sess
    sess.rollback()
    sess.close()


@pytest.fixture
def client():
    """Create a FastAPI test client."""
    from fastapi.testclient import TestClient
    from app.api.main import app
    return TestClient(app)


@pytest.fixture
def seeded_client(client):
    """Test client with demo data loaded."""
    from app.seed_demo import seed
    seed()
    from app.engine import invalidate_cache
    invalidate_cache()
    return client
