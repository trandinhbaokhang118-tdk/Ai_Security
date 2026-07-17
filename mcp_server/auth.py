"""Production authentication and abuse controls for Streamable HTTP MCP."""

from __future__ import annotations

import hmac
import time
from collections import defaultdict, deque
from contextvars import ContextVar
from dataclasses import dataclass
from typing import Any

from fastapi import Request
from sqlalchemy import select
from starlette.datastructures import Headers

from backend.config import settings
from backend.db import SessionLocal, initialize_database
from backend.models import ApiKey, AuditLog, OAuthTokenRecord, User
from backend.routers.auth import ActorContext
from backend.security_utils import hash_api_key, hash_metadata, session_key, utcnow
from backend.services.quota_service import reserve_scan_quota


@dataclass(frozen=True)
class MCPIdentity:
    user_id: str | None
    api_key_id: str | None
    client_ip: str
    user_agent: str

    @property
    def authenticated(self) -> bool:
        return self.user_id is not None


current_mcp_identity: ContextVar[MCPIdentity | None] = ContextVar(
    "current_mcp_identity", default=None
)


def reserve_mcp_scan_quota() -> MCPIdentity | None:
    """Consume one plan scan for the authenticated MCP user."""
    identity = current_mcp_identity.get()
    if identity is None:
        return None
    with SessionLocal() as db:
        user = db.get(User, identity.user_id) if identity.user_id else None
        api_key = db.get(ApiKey, identity.api_key_id) if identity.api_key_id else None
        actor = ActorContext(
            user=user,
            api_key=api_key,
            channel="mcp",
            anonymous_id=None if user is not None else hash_metadata(identity.client_ip),
        )
        request = Request(
            {
                "type": "http",
                "method": "POST",
                "path": "/mcp",
                "headers": [(b"user-agent", identity.user_agent.encode("latin-1", "ignore"))],
                "client": (identity.client_ip, 0),
            }
        )
        reserve_scan_quota(db, actor, request)
    return identity


class MCPApiKeyMiddleware:
    """Authenticate every HTTP MCP request before it reaches the MCP protocol layer.

    Stdio remains local and does not pass through this middleware. Streamable HTTP
    requires a scoped API key in production. Anonymous HTTP can only be enabled
    explicitly for controlled demos.
    """

    def __init__(self, app: Any) -> None:
        self.app = app
        self._buckets: dict[str, deque[float]] = defaultdict(deque)

    async def __call__(self, scope: dict, receive: Any, send: Any) -> None:
        if scope["type"] == "lifespan":
            initialize_database()
            await self.app(scope, receive, send)
            return
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        # OAuth discovery, registration, authorization and token endpoints are public.
        # Authentication is enforced only on the protected MCP resource.
        if scope.get("path") != "/mcp":
            await self.app(scope, receive, send)
            return

        headers = Headers(scope=scope)
        request_id = headers.get("x-request-id", "")[:64]
        client_ip = scope.get("client", ("unknown", 0))[0]
        raw_key = self._bearer(headers.get("authorization", ""))

        if raw_key is None and settings.mcp_allow_anonymous:
            identity = f"anon:{hash_metadata(client_ip)}"
            if not self._consume(identity, settings.mcp_anonymous_rate_limit_per_min):
                await self._reject(send, 429, "rate_limited", request_id)
                return
            token = current_mcp_identity.set(
                MCPIdentity(None, None, client_ip, headers.get("user-agent", ""))
            )
            try:
                await self.app(scope, receive, send)
            finally:
                current_mcp_identity.reset(token)
            return

        if raw_key is None:
            await self._reject(send, 401, "missing_api_key", request_id, authenticate=True)
            return

        with SessionLocal() as db:
            record = None
            oauth_token = None
            if raw_key.startswith("pw_live_"):
                record = db.execute(
                    select(ApiKey).where(ApiKey.key_hash == hash_api_key(raw_key))
                ).scalar_one_or_none()
            elif raw_key.startswith("pw_oauth_at_"):
                oauth_token = db.execute(
                    select(OAuthTokenRecord).where(
                        OAuthTokenRecord.access_token_hash == session_key(raw_key)
                    )
                ).scalar_one_or_none()
                if (
                    oauth_token is None
                    or oauth_token.revoked_at is not None
                    or oauth_token.access_expires_at <= utcnow()
                    or "mcp:invoke" not in (oauth_token.scopes or [])
                ):
                    oauth_token = None
            if oauth_token is not None:
                user = db.get(User, oauth_token.user_id)
                if user is None or user.status != "active":
                    await self._reject(send, 401, "invalid_access_token", request_id, authenticate=True)
                    return
                api_key_id = None
                user_id = user.id
            else:
                user = None
            valid = (
                record is not None
                and record.status == "active"
                and record.revoked_at is None
                and (record.expires_at is None or record.expires_at > utcnow())
            )
            if oauth_token is None and (not valid or record is None):
                await self._reject(send, 401, "invalid_api_key", request_id, authenticate=True)
                return
            if oauth_token is not None:
                pass
            else:
                user = db.get(User, record.user_id)
            if user is None or user.status != "active":
                await self._reject(send, 401, "invalid_api_key", request_id, authenticate=True)
                return
            if oauth_token is None and "mcp:invoke" not in (record.scopes or []):
                await self._reject(send, 403, "missing_scope:mcp:invoke", request_id)
                return
            identity = f"key:{record.id}" if oauth_token is None else f"oauth:{oauth_token.id}"
            if not self._consume(identity, settings.mcp_api_key_rate_limit_per_min):
                await self._reject(send, 429, "rate_limited", request_id)
                return

            if oauth_token is None:
                record.last_used_at = utcnow()
                db.add(
                AuditLog(
                    actor_user_id=user.id,
                    actor_api_key_id=record.id,
                    actor_channel="mcp",
                    action="mcp.invoke",
                    resource_type="mcp_session",
                    source_ip_hash=hash_metadata(client_ip),
                    user_agent_hash=hash_metadata(headers.get("user-agent")),
                    extra_metadata={"request_id": request_id, "path": scope.get("path", "/mcp")},
                    )
                )
                api_key_id = record.id
                user_id = user.id
                db.commit()
            else:
                db.add(
                    AuditLog(
                        actor_user_id=user.id,
                        actor_channel="mcp",
                        action="mcp.invoke",
                        resource_type="oauth_session",
                        resource_id=oauth_token.id,
                        source_ip_hash=hash_metadata(client_ip),
                        user_agent_hash=hash_metadata(headers.get("user-agent")),
                        extra_metadata={"request_id": request_id, "client_id": oauth_token.client_id},
                    )
                )
                db.commit()

        scope.setdefault("state", {})["prewise_api_key_id"] = api_key_id
        scope["state"]["prewise_user_id"] = user_id
        token = current_mcp_identity.set(
            MCPIdentity(user_id, api_key_id, client_ip, headers.get("user-agent", ""))
        )
        try:
            await self.app(scope, receive, send)
        finally:
            current_mcp_identity.reset(token)

    @staticmethod
    def _bearer(value: str) -> str | None:
        scheme, separator, credential = value.partition(" ")
        if not separator or not hmac.compare_digest(scheme.lower(), "bearer"):
            return None
        credential = credential.strip()
        accepted = credential.startswith("pw_live_") or credential.startswith("pw_oauth_at_")
        return credential if accepted and len(credential) >= 40 else None

    def _consume(self, identity: str, limit: int) -> bool:
        now = time.monotonic()
        bucket = self._buckets[identity]
        while bucket and now - bucket[0] >= 60:
            bucket.popleft()
        if len(bucket) >= limit:
            return False
        bucket.append(now)
        return True

    @staticmethod
    async def _reject(
        send: Any,
        status: int,
        detail: str,
        request_id: str,
        *,
        authenticate: bool = False,
    ) -> None:
        import json

        body = json.dumps(
            {"error": "mcp_access_denied", "detail": detail, "request_id": request_id},
            separators=(",", ":"),
        ).encode()
        headers = [(b"content-type", b"application/json"), (b"cache-control", b"no-store")]
        if authenticate:
            metadata = settings.mcp_public_url.rstrip("/") + "/.well-known/oauth-protected-resource/mcp"
            headers.append(
                (b"www-authenticate", f'Bearer realm="prewise-mcp", resource_metadata="{metadata}"'.encode())
            )
        await send({"type": "http.response.start", "status": status, "headers": headers})
        await send({"type": "http.response.body", "body": body})
