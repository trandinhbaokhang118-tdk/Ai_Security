"""Assessment endpoints (design.md §7 API Contract)."""

from __future__ import annotations

import asyncio

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, status
from sqlalchemy.orm import Session as DbSession

from backend.config import settings
from backend.db import get_db
from backend.dependencies import get_inference_service
from backend.middleware import sanitize_text
from backend.routers.auth import BearerCredentials, resolve_actor
from backend.services.inference_service import InferenceService
from backend.services.quota_service import reserve_scan_quota
from backend.services.scan_log_service import log_assessment
from security.browser_sandbox import BrowserSandboxRunner
from security.exe_sandbox import ExeSandboxRunner
from security.url_sandbox import URLSandboxRunner
from shared.schemas import (
    AgentRiskResponse,
    AssessActionRequest,
    AssessResponse,
    AssessTextRequest,
    AssessURLRequest,
    BrowserSandboxRequest,
    BrowserSandboxURLResponse,
    SandboxURLRequest,
    SandboxURLResponse,
    ScanPromptRequest,
)

router = APIRouter(prefix="/v1/assess", tags=["assess"])
sandbox_runner = URLSandboxRunner()
browser_sandbox_runner = BrowserSandboxRunner()
exe_sandbox_runner = ExeSandboxRunner()


@router.post("/url", response_model=AssessResponse)
def assess_url(
    req: AssessURLRequest,
    request: Request,
    credentials: BearerCredentials,
    db: DbSession = Depends(get_db),
    svc: InferenceService = Depends(get_inference_service),
):
    actor = resolve_actor(credentials, db, request)
    reserve_scan_quota(db, actor, request)
    url = sanitize_text(req.url)
    result = svc.assess_url(url)
    log_assessment(db, result=result, actor=actor, request=request, raw_input=url, normalized_url=url)
    return result


@router.post("/url/sandbox", response_model=SandboxURLResponse)
async def sandbox_url(
    req: SandboxURLRequest,
    request: Request,
    credentials: BearerCredentials,
    db: DbSession = Depends(get_db),
):
    actor = resolve_actor(credentials, db, request)
    reserve_scan_quota(db, actor, request)
    url = sanitize_text(req.url)
    return await asyncio.to_thread(sandbox_runner.inspect, url)


@router.post("/url/browser-sandbox", response_model=BrowserSandboxURLResponse)
async def browser_sandbox_url(
    req: BrowserSandboxRequest,
    request: Request,
    credentials: BearerCredentials,
    db: DbSession = Depends(get_db),
):
    actor = resolve_actor(credentials, db, request)
    reserve_scan_quota(db, actor, request)
    url = sanitize_text(req.url)
    return await asyncio.to_thread(browser_sandbox_runner.inspect, url, req.canary_mode)


@router.post("/text", response_model=AssessResponse)
def assess_text(
    req: AssessTextRequest,
    request: Request,
    credentials: BearerCredentials,
    db: DbSession = Depends(get_db),
    svc: InferenceService = Depends(get_inference_service),
):
    actor = resolve_actor(credentials, db, request)
    reserve_scan_quota(db, actor, request)
    text = sanitize_text(req.text)
    result = svc.assess_text(text, req.modality, req.metadata)
    log_assessment(db, result=result, actor=actor, request=request, raw_input=text, metadata=req.metadata)
    return result


@router.post("/prompt", response_model=AssessResponse)
def assess_prompt(
    req: ScanPromptRequest,
    request: Request,
    credentials: BearerCredentials,
    db: DbSession = Depends(get_db),
    svc: InferenceService = Depends(get_inference_service),
):
    actor = resolve_actor(credentials, db, request)
    reserve_scan_quota(db, actor, request)
    content = sanitize_text(req.content)
    result = svc.assess_prompt(content)
    log_assessment(db, result=result, actor=actor, request=request, raw_input=content)
    return result


@router.post("/action", response_model=AgentRiskResponse)
def assess_action(
    req: AssessActionRequest,
    request: Request,
    credentials: BearerCredentials,
    db: DbSession = Depends(get_db),
    svc: InferenceService = Depends(get_inference_service),
):
    actor = resolve_actor(credentials, db, request)
    reserve_scan_quota(db, actor, request)
    target = sanitize_text(req.target_url or req.target or "") or None
    return svc.assess_action(req.action_type, target, req.data_types, req.agent_context)


@router.post("/file", response_model=AssessResponse)
async def assess_file(
    file: UploadFile,
    request: Request,
    credentials: BearerCredentials,
    db: DbSession = Depends(get_db),
    svc: InferenceService = Depends(get_inference_service),
):
    actor = resolve_actor(credentials, db, request)
    reserve_scan_quota(db, actor, request)
    content_length = request.headers.get("content-length")
    if content_length:
        try:
            if int(content_length) > settings.max_upload_bytes:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail="File too large",
                )
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid Content-Length") from None
    data = await file.read(settings.max_upload_bytes + 1)
    if len(data) > settings.max_upload_bytes:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File too large")
    result = svc.assess_file(data, file.filename or "")
    log_assessment(
        db,
        result=result,
        actor=actor,
        request=request,
        raw_input=data,
        metadata={"filename": file.filename or ""},
    )
    return result
