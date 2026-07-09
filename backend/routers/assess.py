"""Assessment endpoints (design.md §7 API Contract)."""

from __future__ import annotations

import asyncio

from fastapi import APIRouter, Depends, UploadFile

from backend.dependencies import get_inference_service
from backend.middleware import sanitize_text
from backend.services.inference_service import InferenceService
from security.browser_sandbox import BrowserSandboxRunner
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


@router.post("/url", response_model=AssessResponse)
def assess_url(req: AssessURLRequest, svc: InferenceService = Depends(get_inference_service)):
    return svc.assess_url(sanitize_text(req.url))


@router.post("/url/sandbox", response_model=SandboxURLResponse)
async def sandbox_url(req: SandboxURLRequest):
    url = sanitize_text(req.url)
    return await asyncio.to_thread(sandbox_runner.inspect, url)


@router.post("/url/browser-sandbox", response_model=BrowserSandboxURLResponse)
async def browser_sandbox_url(req: BrowserSandboxRequest):
    url = sanitize_text(req.url)
    return await asyncio.to_thread(browser_sandbox_runner.inspect, url, req.canary_mode)


@router.post("/text", response_model=AssessResponse)
def assess_text(req: AssessTextRequest, svc: InferenceService = Depends(get_inference_service)):
    return svc.assess_text(sanitize_text(req.text), req.modality, req.metadata)


@router.post("/prompt", response_model=AssessResponse)
def assess_prompt(req: ScanPromptRequest, svc: InferenceService = Depends(get_inference_service)):
    return svc.assess_prompt(sanitize_text(req.content))


@router.post("/action", response_model=AgentRiskResponse)
def assess_action(req: AssessActionRequest, svc: InferenceService = Depends(get_inference_service)):
    target = sanitize_text(req.target_url or req.target or "") or None
    return svc.assess_action(req.action_type, target, req.data_types, req.agent_context)


@router.post("/file", response_model=AssessResponse)
async def assess_file(
    file: UploadFile, svc: InferenceService = Depends(get_inference_service)
):
    data = await file.read()
    return svc.assess_file(data, file.filename or "")
