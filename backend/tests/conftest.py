import os
import sys
from pathlib import Path

import pytest

# The app is laid out as a flat package rooted at backend/, matching how uvicorn runs it.
BACKEND_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_ROOT))

# Deterministic signing so token tests do not depend on a generated key.
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-pytest-only")
os.environ.setdefault("DEBUG", "true")


@pytest.fixture(scope="session")
def client():
    from fastapi.testclient import TestClient

    import main

    with TestClient(main.app) as test_client:
        yield test_client


@pytest.fixture(autouse=True)
def _clear_cache():
    """Keep cached extractions from leaking between tests."""
    from services.cache import metadata_cache

    metadata_cache.clear()
    yield
    metadata_cache.clear()


@pytest.fixture(autouse=True)
def _reset_limiter():
    """Rate limits are per-IP and the test client always presents the same one."""
    from middleware.rate_limit import limiter

    limiter.reset()
    yield
