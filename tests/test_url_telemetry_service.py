from datetime import UTC, datetime

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from backend.db import Base
from backend.models import URLTelemetryObservation
from backend.services.url_telemetry_service import (
    build_distributed_url_evidence,
    ingest_url_events,
)
from shared.schemas import URLTelemetryEvent


def _event(sensor: str, event_id: str, url: str, verdict: str = "malicious"):
    return URLTelemetryEvent(
        event_id=event_id,
        sensor_id=sensor,
        url=url,
        verdict=verdict,
        event_type="endpoint",
        confidence=0.9,
        observed_at=datetime.now(UTC),
        malware_family="test-family",
    )


def _session():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    return Session(engine)


def test_two_independent_sensors_create_exact_malicious_consensus():
    db = _session()
    url = "https://new-threat.test/login"
    accepted_a, duplicates_a = ingest_url_events(
        db,
        [_event("sensor-alpha", "event-0001", url)],
        api_key_id="api-key-alpha",
    )
    accepted_b, duplicates_b = ingest_url_events(
        db,
        [_event("sensor-bravo", "event-0002", url)],
        api_key_id="api-key-bravo",
    )
    evidence = build_distributed_url_evidence(db, url)

    assert (accepted_a + accepted_b, duplicates_a + duplicates_b) == (2, 0)
    assert "distributed_exact_malicious_consensus" in {
        item.finding_type for item in evidence
    }
    assert evidence[0].metadata["sensor_count"] == 2


def test_duplicate_and_same_sensor_cannot_fake_consensus():
    db = _session()
    url = "https://single-sensor.test/login"
    first = _event("sensor-alpha", "event-0001", url)
    ingest_url_events(db, [first], api_key_id="api-key-test")
    accepted, duplicates = ingest_url_events(db, [first], api_key_id="api-key-test")
    ingest_url_events(
        db,
        [_event("sensor-alpha", "event-0002", url)],
        api_key_id="api-key-test",
    )
    evidence = build_distributed_url_evidence(db, url)

    assert (accepted, duplicates) == (0, 1)
    assert "distributed_exact_malicious_consensus" not in {
        item.finding_type for item in evidence
    }
    assert evidence[0].metadata["sensor_count"] == 1
    assert evidence[0].metadata["checks"][0]["status"] == "review"


def test_one_api_key_cannot_invent_multiple_sensors_to_fake_consensus():
    db = _session()
    url = "https://fabricated-consensus.test/login"
    ingest_url_events(
        db,
        [
            _event("fabricated-sensor-one", "event-0001", url),
            _event("fabricated-sensor-two", "event-0002", url),
        ],
        api_key_id="one-compromised-key",
    )

    evidence = build_distributed_url_evidence(db, url)

    assert "distributed_exact_malicious_consensus" not in {
        item.finding_type for item in evidence
    }
    assert evidence[0].metadata["sensor_count"] == 1


def test_storage_contains_sensor_hmac_and_no_raw_url():
    db = _session()
    raw_url = "https://private-path.test/user/secret"
    ingest_url_events(
        db,
        [_event("sensitive-machine-name", "event-0001", raw_url)],
        api_key_id="api-key-test",
    )
    row = db.execute(select(URLTelemetryObservation)).scalar_one()

    assert row.sensor_hash != "sensitive-machine-name"
    assert len(row.sensor_hash) == 64
    assert not hasattr(row, "url")
    assert raw_url not in str(row.__dict__)
