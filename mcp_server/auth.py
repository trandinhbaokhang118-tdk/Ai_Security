"""Production authentication and abuse controls for Streamable HTTP MCP."""

from __future__ import annotations

import hmac
import time
from collections import defaultdict, deque
from typing import Any

from sqlalchemy import select
from starlette.datastructures import Headers

from backend.config import settings
from backend.db import SessionLocal, initialize_database
from backend.models import ApiKey, AuditLog, User
from backend.security_utils import hash_api_key, hash_metadata, utcnow


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

        headers = Headers(scope=scope)
        request_id = headers.get("x-request-id", "")[:64]
        client_ip = scope.get("client", ("unknown", 0))[0]
        raw_key = self._bearer(headers.get("authorization", ""))

        if raw_key is None and settings.mcp_allow_anonymous:
            identity = f"anon:{hash_metadata(client_ip)}"
            if not self._consume(identity, settings.mcp_anonymous_rate_limit_per_min):
                await self._reject(send, 429, "rate_limited", request_id)
                return
            await self.app(scope, receive, send)
            return

        if raw_key is None:
            await self._reject(send, 401, "missing_api_key", request_id, authenticate=True)
            return

        with SessionLocal() as db:
            record = db.execute(
                select(ApiKey).where(ApiKey.key_hash == hash_api_key(raw_key))
            ).scalar_one_or_none()
            valid = (
                record is not None
                and record.status == "active"
                and record.revoked_at is None
                and (record.expires_at is None or record.expires_at > utcnow())
            )
            if not valid or record is None:
                await self._reject(send, 401, "invalid_api_key", request_id, authenticate=True)
                return
            user = db.get(User, record.user_id)
            if user is None or user.status != "active":
                await self._reject(send, 401, "invalid_api_key", request_id, authenticate=True)
                return
            if "mcp:invoke" not in (record.scopes or []):
                await self._reject(send, 403, "missing_scope:mcp:invoke", request_id)
                return
            identity = f"key:{record.id}"
            if not self._consume(identity, settings.mcp_api_key_rate_limit_per_min):
                await self._reject(send, 429, "rate_limited", request_id)
                return

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

        scope.setdefault("state", {})["prewise_api_key_id"] = api_key_id
        scope["state"]["prewise_user_id"] = user_id
        await self.app(scope, receive, send)

    @staticmethod
    def _bearer(value: str) -> str | None:
        scheme, separator, credential = value.partition(" ")
        if not separator or not hmac.compare_digest(scheme.lower(), "bearer"):
            return None
        credential = credential.strip()
        return credential if credential.startswith("pw_live_") and len(credential) >= 40 else None

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
            headers.append((b"www-authenticate", b'Bearer realm="prewise-mcp"'))
        await send({"type": "http.response.start", "status": status, "headers": headers})
        await send({"type": "http.response.body", "body": body})
