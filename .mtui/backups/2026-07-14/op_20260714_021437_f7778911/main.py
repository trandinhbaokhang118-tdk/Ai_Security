"""FastAPI Security Gateway entry point.

Run: uvicorn backend.main:app --reload --port 8000
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import settings
from backend.db import initialize_database
from backend.middleware import RateLimiterMiddleware
from backend.routers import admin, agent_security, assess, auth, chat, demo, health, sandbox_cloud


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialize_database()
    yield


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
app.include_router(demo.router)
app.include_router(admin.router)


@app.get("/")
def root():
    return {
        "name": "Prewise Agent Security Gateway",
        "docs": "/docs",
        "health": "/v1/health",
        "agent_security": "/v1/agent/check/*",
        "mcp": "/mcp",
    }
