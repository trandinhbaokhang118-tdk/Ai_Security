from __future__ import annotations

import asyncio
import json
from datetime import timedelta

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.db import Base
from backend.models import ApiKey, DailyQuotaUsage, User
from backend.security_utils import create_api_key_value, hash_api_key, utcnow
from mcp_server import auth as mcp_auth
from mcp_server.auth import (
    MCPApiKeyMiddleware,
    MCPIdentity,
    current_mcp_identity,
    reserve_mcp_scan_quota,
)


class Downstream:
    def __init__(self) -> None:
        self.called = False

    async def __call__(self, scope, receive, send) -> None:
        self.called = True
        await send({"type": "http.response.start", "status": 200, "headers": []})
        await send({"type": "http.response.body", "body": b"ok"})


async def invoke(app, authorization: str | None = None):
    messages = []
    headers = []
    if authorization:
        headers.append((b"authorization", authorization.encode()))
    scope = {
        "type": "http",
        "method": "POST",
        "path": "/mcp",
        "headers": headers,
        "client": ("127.0.0.1", 1234),
        "state": {},
    }

    async def receive():
        return {"type": "http.request", "body": b"", "more_body": False}

    async def send(message):
        messages.append(message)

    await app(scope, receive, send)
    return messages, scope


def setup_db(monkeypatch):
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, expire_on_commit=False)
    monkeypatch.setattr(mcp_auth, "SessionLocal", factory)
    monkeypatch.setattr(mcp_auth, "initialize_database", lambda: None)
    return factory


def issue_key(factory, scopes=None, *, revoked=False, expired=False):
    raw = create_api_key_value()
    with factory() as db:
        user = User(
            email=f"{raw[-8:]}@test.local",
            display_name="MCP Test",
            password_salt="00" * 16,
            password_hash="x",
        )
        db.add(user)
        db.flush()
        record = ApiKey(
            user_id=user.id,
            key_prefix=raw[:16],
            key_tail=raw[-4:],
            key_hash=hash_api_key(raw),
            scopes=scopes or ["mcp:invoke"],
            status="revoked" if revoked else "active",
            revoked_at=utcnow() if revoked else None,
            expires_at=utcnow() - timedelta(seconds=1) if expired else None,
        )
        db.add(record)
        db.commit()
        return raw, record.id


def status(messages):
    return messages[0]["status"]


def body(messages):
    return json.loads(messages[-1]["body"])


def test_mcp_http_rejects_missing_key(monkeypatch) -> None:
    setup_db(monkeypatch)
    downstream = Downstream()
    messages, _ = asyncio.run(invoke(MCPApiKeyMiddleware(downstream)))
    assert status(messages) == 401
    assert body(messages)["detail"] == "missing_api_key"
    assert downstream.called is False


def test_mcp_http_accepts_scoped_key_and_sets_identity(monkeypatch) -> None:
    factory = setup_db(monkeypatch)
    raw, key_id = issue_key(factory)
    downstream = Downstream()
    messages, scope = asyncio.run(
        invoke(MCPApiKeyMiddleware(downstream), f"Bearer {raw}")
    )
    assert status(messages) == 200
    assert downstream.called is True
    assert scope["state"]["prewise_api_key_id"] == key_id


def test_mcp_http_rejects_missing_scope(monkeypatch) -> None:
    factory = setup_db(monkeypatch)
    raw, _ = issue_key(factory, ["assess:url"])
    messages, _ = asyncio.run(invoke(MCPApiKeyMiddleware(Downstream()), f"Bearer {raw}"))
    assert status(messages) == 403
    assert body(messages)["detail"] == "missing_scope:mcp:invoke"


def test_mcp_http_rejects_revoked_and_expired_keys(monkeypatch) -> None:
    factory = setup_db(monkeypatch)
    for options in ({"revoked": True}, {"expired": True}):
        raw, _ = issue_key(factory, **options)
        messages, _ = asyncio.run(invoke(MCPApiKeyMiddleware(Downstream()), f"Bearer {raw}"))
        assert status(messages) == 401


def test_mcp_scan_consumes_authenticated_users_plan_quota(monkeypatch) -> None:
    factory = setup_db(monkeypatch)
    _, key_id = issue_key(factory)
    with factory() as db:
        key = db.get(ApiKey, key_id)
        assert key is not None
        user_id = key.user_id

    token = current_mcp_identity.set(
        MCPIdentity(user_id, key_id, "127.0.0.1", "mcp-test")
    )
    try:
        reserve_mcp_scan_quota()
    finally:
        current_mcp_identity.reset(token)

    with factory() as db:
        usage = db.query(DailyQuotaUsage).filter_by(user_id=user_id).one()
        assert usage.api_key_id == key_id
        assert usage.scan_count == 1
