"""Authenticated ingestion endpoint for distributed URL IOC observations."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session as DbSession

from backend.db import get_db
from backend.routers.auth import BearerCredentials, require_api_key_scope, resolve_actor
from backend.services.url_telemetry_service import ingest_url_events
from shared.schemas import URLTelemetryBatchRequest, URLTelemetryBatchResponse

router = APIRouter(prefix="/v1/telemetry", tags=["telemetry"])


@router.post("/url-events", response_model=URLTelemetryBatchResponse)
def ingest_url_telemetry(
    payload: URLTelemetryBatchRequest,
    request: Request,
    credentials: BearerCredentials,
    db: DbSession = Depends(get_db),
) -> URLTelemetryBatchResponse:
    actor = resolve_actor(credentials, db, request)
    if actor.api_key is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Telemetry ingestion requires a scoped sensor API key.",
        )
    require_api_key_scope(actor, "telemetry:write")
    try:
        accepted, duplicates = ingest_url_events(
            db,
            payload.events,
            api_key_id=actor.api_key.id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return URLTelemetryBatchResponse(accepted=accepted, duplicates=duplicates)
