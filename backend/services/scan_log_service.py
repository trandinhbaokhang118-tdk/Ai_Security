"""Persist scan events and evidence for account history and auditability."""

from __future__ import annotations

from fastapi import Request
from sqlalchemy.orm import Session

from backend.models import ScanEvent, ScanEvidence
from backend.routers.auth import ActorContext
from backend.security_utils import hash_metadata, input_preview, input_sha256
from shared.schemas import AssessResponse


def _value(value) -> str:
    return value.value if hasattr(value, "value") else str(value)


def log_assessment(
    db: Session,
    *,
    result: AssessResponse,
    actor: ActorContext,
    request: Request,
    raw_input: str | bytes,
    normalized_url: str | None = None,
    metadata: dict | None = None,
) -> None:
    event = ScanEvent(
        request_id=result.request_id,
        user_id=actor.user.id if actor.user is not None else None,
        api_key_id=actor.api_key.id if actor.api_key is not None else None,
        channel=actor.channel,
        modality=_value(result.modality),
        normalized_url=normalized_url,
        input_sha256=input_sha256(raw_input),
        input_preview=input_preview(raw_input),
        input_size_bytes=len(raw_input) if isinstance(raw_input, bytes) else len(raw_input.encode("utf-8")),
        risk_score=float(result.risk_score),
        risk_level=_value(result.risk_level),
        decision=_value(result.decision),
        confidence=float(result.confidence),
        model_version=result.model_version,
        latency_ms=float(result.latency_ms),
        source_ip_hash=hash_metadata(request.client.host if request.client else None),
        user_agent_hash=hash_metadata(request.headers.get("user-agent")),
        extra_metadata=metadata or {},
    )
    db.add(event)
    db.flush()
    for item in result.evidence:
        db.add(
            ScanEvidence(
                scan_event_id=event.id,
                source=item.source,
                message=item.message,
                severity=_value(item.severity),
                feature=item.feature,
                contribution=item.contribution,
            )
        )
    db.commit()
