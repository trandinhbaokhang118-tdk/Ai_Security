from datetime import datetime, timedelta
from uuid import uuid4

from backend.db import SessionLocal
from backend.models import AssessmentCache, ScanEvent, ScanEvidence
from backend.routers import admin
from backend.services.operational_maintenance_service import cleanup_expired_operational_data


def _scan_event(request_id: str, created_at: datetime) -> ScanEvent:
    return ScanEvent(
        request_id=request_id,
        channel="test",
        modality="url",
        input_preview="https://example.test",
        risk_score=0.2,
        risk_level="low",
        decision="ALLOW",
        confidence=0.9,
        model_version="test",
        latency_ms=12,
        created_at=created_at,
    )


def test_cleanup_removes_expired_cache_and_old_history_with_evidence() -> None:
    now = datetime(2000, 1, 10)
    suffix = uuid4().hex
    old_event = _scan_event(f"retention-old-{suffix}", now - timedelta(days=3))
    fresh_event = _scan_event(f"retention-fresh-{suffix}", now - timedelta(hours=1))
    old_cache_key = f"retention-expired-cache-{suffix}"
    fresh_cache_key = f"retention-fresh-cache-{suffix}"

    with SessionLocal() as db:
        db.add_all([old_event, fresh_event])
        db.flush()
        old_event_id = old_event.id
        fresh_event_id = fresh_event.id
        db.add(ScanEvidence(scan_event_id=old_event.id, source="test", message="old evidence"))
        db.add_all(
            [
                AssessmentCache(
                    cache_key=old_cache_key,
                    modality="url",
                    response={"ok": True},
                    expires_at=now - timedelta(seconds=1),
                ),
                AssessmentCache(
                    cache_key=fresh_cache_key,
                    modality="url",
                    response={"ok": True},
                    expires_at=now + timedelta(days=1),
                ),
            ]
        )
        db.commit()

        result = cleanup_expired_operational_data(db, now=now, scan_history_retention_days=1)
        assert result.expired_cache_entries >= 1
        assert result.expired_scan_events == 1
        assert result.expired_scan_evidence == 1
        assert db.get(AssessmentCache, old_cache_key) is None
        assert db.get(AssessmentCache, fresh_cache_key) is not None
        assert db.get(ScanEvent, old_event_id) is None
        assert db.get(ScanEvent, fresh_event_id) is not None

        db.delete(db.get(AssessmentCache, fresh_cache_key))
        db.delete(db.get(ScanEvent, fresh_event_id))
        db.commit()


def test_operational_metrics_expose_aggregate_scan_health() -> None:
    event = _scan_event(f"operational-metrics-{uuid4().hex}", datetime.now())
    event.decision = "BLOCK"
    event.risk_level = "high"

    with SessionLocal() as db:
        db.add(event)
        db.commit()
        payload = admin.get_operational_metrics(db)
        assert payload["windowHours"] == 24
        assert payload["scansLast24h"] >= 1
        assert payload["blockedLast24h"] >= 1
        assert payload["byDecisionLast24h"]["BLOCK"] >= 1
        assert payload["byModalityLast24h"]["url"] >= 1
        assert payload["retention"]["scanHistoryDays"] >= 1

        db.delete(db.get(ScanEvent, event.id))
        db.commit()
