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
from backend.middleware import RateLimiterMiddleware
from backend.routers import (
    admin,
    agent_security,
    assess,
    auth,
    chat,
    demo,
    health,
    integrations,
    sandbox_cloud,
    telemetry,
)
from backend.services.model_retrain_scheduler import run_model_retrain_scheduler
from backend.services.threat_feed_scheduler import run_threat_feed_scheduler


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialize_database()
    feed_task = None
    retrain_task = None
    if settings.threat_feed_scheduler_enabled:
        feed_task = asyncio.create_task(
            run_threat_feed_scheduler(), name="threat-feed-scheduler"
        )
    if settings.model_retrain_scheduler_enabled:
        retrain_task = asyncio.create_task(
            run_model_retrain_scheduler(), name="model-retrain-scheduler"
        )
    try:
        yield
    finally:
        if feed_task is not None:
            feed_task.cancel()
            with suppress(asyncio.CancelledError):
                await feed_task
        if retrain_task is not None:
            retrain_task.cancel()
            with suppress(asyncio.CancelledError):
                await retrain_task


app = FastAPI(
    title="AI Security Armor — Security Gateway",
    version="0.2.0",
    description="Pre-action Risk Core for AI agents, MCP clients, and human-facing apps.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allow_origins,
    allow_origin_regex=r"chrome-extension://.*",
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)
app.add_middleware(RateLimiterMiddleware, limit_per_min=settings.rate_limit_per_min)

app.include_router(health.router)
app.include_router(agent_security.router)
app.include_router(assess.router)
app.include_router(chat.router)
app.include_router(auth.router)
app.include_router(sandbox_cloud.router)
app.include_router(demo.router)
app.include_router(admin.router)
app.include_router(telemetry.router)
app.include_router(integrations.router)


@app.get("/")
def root():
    return {
        "name": "Prewise Agent Security Gateway",
        "docs": "/docs",
        "health": "/v1/health",
        "agent_security": "/v1/agent/check/*",
        "mcp": "/mcp",
    }
