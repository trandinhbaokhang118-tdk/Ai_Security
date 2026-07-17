"""Small asyncio scheduler for bounded threat-feed refresh jobs."""
from __future__ import annotations

import asyncio
import logging

from backend.config import settings
from backend.services.threat_feed_service import sync_all_feeds

logger = logging.getLogger(__name__)


async def run_threat_feed_scheduler() -> None:
    interval = max(5, settings.threat_feed_scheduler_interval_minutes) * 60
    while True:
        try:
            await asyncio.to_thread(sync_all_feeds)
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Unexpected threat-feed scheduler failure")
        await asyncio.sleep(interval)
