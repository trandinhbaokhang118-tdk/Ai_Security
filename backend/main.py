"""FastAPI Security Gateway entry point.

Run: uvicorn backend.main:app --reload --port 8000
"""

from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import settings
from backend.db import initialize_database
from backend.middleware import (
    RateLimiterMiddleware,
    RequestSizeLimitMiddleware,
    SecurityHeadersMiddleware,
)
from backend.routers import (
    admin,
    agent_security,
    assess,
    auth,
    chat,
    demo,
    gmail,
    health,
    sandbox_cloud,
    telemetry,
)
from backend.services.operational_maintenance_scheduler import run_operational_maintenance_scheduler
from backend.services.threat_feed_scheduler import run_threat_feed_scheduler


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialize_database()
    # The workers are lightweight while disabled and read persistent Admin
    # switches every minute, so turning them on does not need a deployment.
    feed_task = asyncio.create_task(
        run_threat_feed_scheduler(), name="threat-feed-scheduler"
    )
    maintenance_task = asyncio.create_task(
        run_operational_maintenance_scheduler(), name="operational-maintenance-scheduler"
    )
    try:
        yield
    finally:
        if feed_task is not None:
            feed_task.cancel()
            with suppress(asyncio.CancelledError):
                await feed_task
        if maintenance_task is not None:
            maintenance_task.cancel()
            with suppress(asyncio.CancelledError):
                await maintenance_task


app = FastAPI(
    title="AI Security Armor — Security Gateway",
    version="0.2.0",
    description="Pre-action Risk Core for AI agents, MCP clients, and human-facing apps.",
    lifespan=lifespan,
    docs_url=None if settings.app_env == "production" else "/docs",
    redoc_url=None if settings.app_env == "production" else "/redoc",
    openapi_url=None if settings.app_env == "production" else "/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allow_origins,
    allow_origin_regex=r"chrome-extension://.*",
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)
app.add_middleware(RateLimiterMiddleware, limit_per_min=settings.rate_limit_per_min)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    RequestSizeLimitMiddleware,
    # Multipart boundaries/headers need a small allowance beyond the file cap.
    max_body_bytes=settings.max_upload_bytes + 1024 * 1024,
    paths=("/v1/assess/email-file", "/v1/assess/file/"),
)
app.add_middleware(
    RequestSizeLimitMiddleware,
    max_body_bytes=16 * 1024 * 1024,
    exact_paths=("/v1/demo/deepfake/analyze",),
)
app.add_middleware(
    RequestSizeLimitMiddleware,
    max_body_bytes=51 * 1024 * 1024,
    exact_paths=("/v1/demo/deepfake/analyze-video",),
)

app.include_router(health.router)
app.include_router(agent_security.router)
app.include_router(assess.router)
app.include_router(chat.router)
app.include_router(auth.router)
app.include_router(gmail.router)
app.include_router(sandbox_cloud.router)
app.include_router(demo.router)
app.include_router(admin.router)
app.include_router(telemetry.router)


@app.get("/")
def root():
    return {
        "name": "Prewise Agent Security Gateway",
        "docs": "/docs" if settings.app_env != "production" else None,
        "health": "/v1/health",
        "agent_security": "/v1/agent/check/*",
        "mcp": "/mcp",
    }
