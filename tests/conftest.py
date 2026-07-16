"""Shared test isolation for settings backed by persistent local storage."""

import pytest

from backend.config import settings


@pytest.fixture(autouse=True)
def isolate_anonymous_quota(monkeypatch: pytest.MonkeyPatch) -> None:
    """Prevent repeated local test runs from exhausting the production-like quota DB."""

    monkeypatch.setattr(settings, "anonymous_daily_scan_limit", 1_000_000)
