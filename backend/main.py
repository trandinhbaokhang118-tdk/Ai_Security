"""FastAPI Security Gateway entry point.

Run: uvicorn backend.main:app --reload --port 8000
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import settings
from backend.db import initialize_database
from backend.middleware import RateLimiterMiddleware
from backend.routers import assess, auth, chat, health, admin
from backend.routers import demo

app = FastAPI(
    title="AI Security Armor — Security Gateway",
    version="0.1.0",
    description="Robust Risk Core + Policy Engine + MCP-ready assessment API.",
)

# CORS: web dev origin + chrome-extension:// origins (regex).
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allow_origins,
    allow_origin_regex=r"chrome-extension://.*",
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
app.add_middleware(RateLimiterMiddleware, limit_per_min=settings.rate_limit_per_min)

app.include_router(health.router)
app.include_router(assess.router)
app.include_router(chat.router)
app.include_router(auth.router)
app.include_router(demo.router)
app.include_router(admin.router)


@app.get("/")
def root():
    return {"name": "AI Security Armor Gateway", "docs": "/docs", "health": "/v1/health"}


@app.on_event("startup")
def startup() -> None:
    initialize_database()
