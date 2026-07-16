"""Gateway middleware: input sanitization + token-bucket rate limiting.

- Input Sanitization Layer (required.md §9): Unicode NFC + zero-width strip applied
  uniformly to Extension and MCP input.
- Rate limiting (VULN-5.3): 60 req/min/IP default, separate concern from auth.
"""

from __future__ import annotations

import time
import unicodedata
from collections import defaultdict, deque

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

_ZERO_WIDTH = dict.fromkeys(map(ord, "\u200b\u200c\u200d\u2060\ufeff"), None)


def sanitize_text(text: str) -> str:
    """NFC normalize + strip zero-width characters."""
    if not isinstance(text, str):
        return text
    return unicodedata.normalize("NFC", text).translate(_ZERO_WIDTH)


class RateLimiterMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, limit_per_min: int = 60):
        super().__init__(app)
        self.limit = limit_per_min
        self._buckets: dict[str, deque[float]] = defaultdict(deque)

    async def dispatch(self, request: Request, call_next):
        if request.url.path.startswith("/v1/") and request.url.path != "/v1/health":
            client = request.client.host if request.client else "unknown"
            now = time.time()
            bucket = self._buckets[client]
            while bucket and now - bucket[0] > 60:
                bucket.popleft()
            if len(bucket) >= self.limit:
                retry_after = max(1, int(61 - (now - bucket[0])))
                return JSONResponse(
                    status_code=429,
                    content={
                        "error": "rate_limited",
                        "detail": "Quá số yêu cầu cho phép",
                        "retry_after": retry_after,
                    },
                    headers={"Retry-After": str(retry_after)},
                )
            bucket.append(now)
        return await call_next(request)
