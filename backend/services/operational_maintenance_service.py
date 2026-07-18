"""Bounded cleanup for expired result data and retained scan history."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime, timedelta

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from backend.config import settings
from backend.models import AssessmentCache, ScanEvent, ScanEvidence
from backend.security_utils import utcnow


@dataclass(frozen=True)
class OperationalCleanupResult:
    """Counts for an idempotent cleanup run; safe to expose to administrators."""

    expired_cache_entries: int = 0
    expired_scan_events: int = 0
    expired_scan_evidence: int = 0

    def as_dict(self) -> dict[str, int]:
        return asdict(self)


def normalized_scan_history_retention_days(value: int | None = None) -> int:
    """Keep a minimum retention period so a bad environment value cannot purge all history."""

    raw = settings.scan_history_retention_days if value is None else value
    return max(1, min(3650, int(raw)))


def cleanup_expired_operational_data(
    db: Session,
    *,
    now: datetime | None = None,
    scan_history_retention_days: int | None = None,
) -> OperationalCleanupResult:
    """Delete expired cache records and old scan history in one transaction.

    Evidence is removed before its parent scan event. This makes the operation
    safe on SQLite deployments where foreign-key cascade enforcement may not be
    enabled, and on PostgreSQL where it avoids orphaned rows during migrations.
    """

    current = now or utcnow()
    retention_days = normalized_scan_history_retention_days(scan_history_retention_days)
    history_cutoff = current - timedelta(days=retention_days)

    cache_deleted = db.execute(
        delete(AssessmentCache).where(AssessmentCache.expires_at <= current)
    ).rowcount or 0

    expired_scan_ids = select(ScanEvent.id).where(ScanEvent.created_at < history_cutoff)
    evidence_deleted = db.execute(
        delete(ScanEvidence).where(ScanEvidence.scan_event_id.in_(expired_scan_ids))
    ).rowcount or 0
    scans_deleted = db.execute(
        delete(ScanEvent).where(ScanEvent.created_at < history_cutoff)
    ).rowcount or 0
    db.commit()

    return OperationalCleanupResult(
        expired_cache_entries=int(cache_deleted),
        expired_scan_events=int(scans_deleted),
        expired_scan_evidence=int(evidence_deleted),
    )
