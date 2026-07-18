"""Small asyncio scheduler for bounded threat-feed refresh jobs."""
from __future__ import annotations

import asyncio
import logging
import time

from backend.config import settings
from backend.db import SessionLocal
from backend.services.ai_context_weight_service import get_operational_switches
from backend.services.threat_feed_service import sync_all_feeds

logger = logging.getLogger(__name__)


async def run_threat_feed_scheduler() -> None:
    """Refresh feeds when enabled in Admin without requiring a process restart."""

    interval = max(5, settings.threat_feed_scheduler_interval_minutes) * 60
    poll_seconds = min(60, interval)
    last_sync_at = 0.0
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
            if switches["threatFeedSchedulerEnabled"] and now - last_sync_at >= interval:
                await asyncio.to_thread(
                    sync_all_feeds,
                    openphish_enabled=switches["openphishEnabled"],
                )
                last_sync_at = now
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Unexpected threat-feed scheduler failure")
        await asyncio.sleep(poll_seconds)
