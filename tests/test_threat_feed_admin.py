import asyncio
from datetime import timedelta

import pytest
from fastapi import BackgroundTasks, HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.config import settings
from backend.db import Base
from backend.models import ThreatFeedSyncState
from backend.routers import admin
from backend.security_utils import utcnow
from backend.services import threat_feed_service
from backend.services.threat_feed_service import (
    FeedSpec,
    FeedSyncResult,
    configured_feed_specs,
    feed_status,
    sync_configured_feeds,
)


def _session_factory():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)


def test_phishtank_configured_endpoint_always_uses_https(monkeypatch) -> None:
    monkeypatch.setattr(settings, "threat_feed_phishtank_app_key", "app-key")
    monkeypatch.setattr(
        settings,
        "threat_feed_phishtank_url",
        "https://data.phishtank.com/data/online-valid.csv.gz",
    )

    phishtank = next(spec for spec in configured_feed_specs() if spec.source == "phishtank")

    assert settings.threat_feed_phishtank_url.startswith("https://")
    assert phishtank.url == "https://data.phishtank.com/data/app-key/online-valid.csv.gz"


def test_feed_status_marks_enabled_old_feed_as_stale(monkeypatch) -> None:
    factory = _session_factory()
    specs = (
        FeedSpec("openphish", "https://raw.githubusercontent.com/feed", "openphish", True, timedelta(hours=1)),
    )
    monkeypatch.setattr(threat_feed_service, "configured_feed_specs", lambda: specs)
    with factory() as db:
        db.add(
            ThreatFeedSyncState(
                source="openphish",
                endpoint="https://raw.githubusercontent.com",
                status="completed",
                last_success_at=utcnow() - timedelta(hours=3),
            )
        )
        db.commit()

        status = feed_status(db)

    assert status[0]["source"] == "openphish"
    assert status[0]["health"] == "stale"
    assert status[0]["active_indicators"] == 0


def test_manual_service_sync_honors_provider_interval_without_force(monkeypatch) -> None:
    factory = _session_factory()
    specs = (
        FeedSpec("openphish", "https://raw.githubusercontent.com/feed", "openphish", True, timedelta(hours=1)),
    )
    calls: list[bool] = []
    monkeypatch.setattr(threat_feed_service, "SessionLocal", factory)
    monkeypatch.setattr(threat_feed_service, "configured_feed_specs", lambda: specs)
    monkeypatch.setattr(
        threat_feed_service,
        "sync_feed",
        lambda spec, *, force: calls.append(force) or FeedSyncResult(spec.source, "not_due"),
    )

    results = sync_configured_feeds(("openphish",))

    assert [result.status for result in results] == ["not_due"]
    assert calls == [False]


def test_admin_manual_sync_queues_only_enabled_allowlisted_sources(monkeypatch) -> None:
    specs = (
        FeedSpec("openphish", "https://raw.githubusercontent.com/feed", "openphish", True, timedelta(hours=1)),
        FeedSpec("phishtank", "https://data.phishtank.com/feed", "phishtank", False, timedelta(hours=1)),
    )
    calls: list[tuple[str, ...]] = []
    monkeypatch.setattr(admin, "configured_feed_specs", lambda **_: specs)
    monkeypatch.setattr(
        admin, "_operational_switches", lambda _: {"openphishEnabled": True}
    )
    monkeypatch.setattr(
        admin, "sync_configured_feeds", lambda sources, **_: calls.append(sources)
    )
    tasks = BackgroundTasks()

    result = admin.trigger_threat_feed_sync(
        tasks,
        admin.ThreatFeedSyncRequest(sources=["openphish", "phishtank"]),
        db=object(),
    )
    asyncio.run(tasks())

    assert result == {
        "status": "queued",
        "sources": ["openphish"],
        "rateLimitHonored": True,
    }
    assert calls == [("openphish",)]


def test_admin_manual_sync_rejects_no_enabled_sources(monkeypatch) -> None:
    monkeypatch.setattr(
        admin,
        "configured_feed_specs",
        lambda **_: (
            FeedSpec("openphish", "https://raw.githubusercontent.com/feed", "openphish", False, timedelta(hours=1)),
        ),
    )
    monkeypatch.setattr(
        admin, "_operational_switches", lambda _: {"openphishEnabled": False}
    )

    with pytest.raises(HTTPException) as exc:
        admin.trigger_threat_feed_sync(
            BackgroundTasks(),
            admin.ThreatFeedSyncRequest(sources=["openphish"]),
            db=object(),
        )

    assert exc.value.status_code == 409


def test_manual_sync_request_rejects_unknown_or_duplicate_sources() -> None:
    with pytest.raises(ValueError):
        admin.ThreatFeedSyncRequest(sources=["untrusted"])
    with pytest.raises(ValueError):
        admin.ThreatFeedSyncRequest(sources=["openphish", "openphish"])
