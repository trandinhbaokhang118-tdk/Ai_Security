"""Explicit admin-only export of reviewed local IOC rows into a MISP event."""
from __future__ import annotations

from urllib.parse import urlsplit

import httpx
from sqlalchemy import select

from backend.config import settings
from backend.db import SessionLocal
from backend.models import ThreatFeedIndicator
from backend.security_utils import utcnow


def export_local_iocs_to_misp(
    *,
    event_id: str,
    source: str = "",
    limit: int = 100,
) -> dict[str, object]:
    """Push selected public-feed URL IOCs; never called automatically."""
    if not settings.misp_enabled or not settings.misp_api_key:
        raise ValueError("MISP integration is disabled or missing an API key")
    parsed = urlsplit(settings.misp_base_url)
    host = (parsed.hostname or "").lower()
    if parsed.scheme != "https" or not host:
        raise ValueError("MISP_BASE_URL must be HTTPS")
    if not settings.misp_verify_tls and host not in {"127.0.0.1", "localhost", "::1"}:
        raise ValueError("TLS verification can be disabled only for loopback MISP")
    if not event_id.isdigit():
        raise ValueError("MISP event_id must be numeric")

    query = select(ThreatFeedIndicator).where(ThreatFeedIndicator.expires_at > utcnow())
    if source:
        query = query.where(ThreatFeedIndicator.source == source)
    with SessionLocal() as db:
        rows = list(
            db.execute(
                query.order_by(ThreatFeedIndicator.last_seen_at.desc()).limit(limit)
            ).scalars()
        )
    endpoint = settings.misp_base_url.rstrip("/") + f"/attributes/add/{event_id}"
    headers = {
        "Authorization": settings.misp_api_key,
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    exported = failures = 0
    with httpx.Client(
        verify=settings.misp_verify_tls,
        timeout=settings.misp_timeout_seconds,
        follow_redirects=False,
    ) as client:
        for row in rows:
            try:
                response = client.post(
                    endpoint,
                    headers=headers,
                    json={
                        "type": "url",
                        "category": "Network activity",
                        "value": row.normalized_value,
                        "to_ids": True,
                        "comment": f"Imported from local {row.source} feed; ref={row.source_ref or '-'}",
                    },
                )
                response.raise_for_status()
                exported += 1
            except httpx.HTTPError:
                failures += 1
    return {
        "event_id": event_id,
        "selected": len(rows),
        "exported": exported,
        "failures": failures,
        "automatic": False,
    }
