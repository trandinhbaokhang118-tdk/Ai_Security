"""Single-process scheduler for operational retention cleanup."""

from __future__ import annotations

import asyncio
import logging
import time

from backend.config import settings
from backend.db import SessionLocal
from backend.services.ai_context_weight_service import get_operational_switches
from backend.services.operational_maintenance_service import cleanup_expired_operational_data

logger = logging.getLogger(__name__)


def run_operational_maintenance_once() -> dict[str, int]:
    with SessionLocal() as db:
        result = cleanup_expired_operational_data(db)
    payload = result.as_dict()
    logger.info("Operational retention cleanup completed: %s", payload)
    return payload


async def run_operational_maintenance_scheduler() -> None:
    """Run bounded cleanup periodically; enable on one application worker only."""

    interval = max(5, settings.operational_maintenance_interval_minutes) * 60
    poll_seconds = min(60, interval)
    last_cleanup_at = 0.0
    while True:
        try:
            with SessionLocal() as db:
                switches = get_operational_switches(
                    db,
                    threat_feed_scheduler_default=settings.threat_feed_scheduler_enabled,
                    openphish_default=settings.threat_feed_openphish_enabled,
                    maintenance_scheduler_default=settings.operational_maintenance_scheduler_enabled,
                )
            now = time.monotonic()
            if (
                switches["operationalMaintenanceSchedulerEnabled"]
                and now - last_cleanup_at >= interval
            ):
                await asyncio.to_thread(run_operational_maintenance_once)
                last_cleanup_at = now
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Unexpected operational maintenance failure")
        await asyncio.sleep(poll_seconds)
