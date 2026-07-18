from __future__ import annotations

import pytest

from backend.middleware import RequestSizeLimitMiddleware


@pytest.mark.asyncio
async def test_upload_is_rejected_from_content_length_before_app_runs() -> None:
    called = False
    messages: list[dict] = []

    async def app(_scope, _receive, _send) -> None:
        nonlocal called
        called = True

    async def receive() -> dict:
        return {"type": "http.request", "body": b"", "more_body": False}

    async def send(message: dict) -> None:
        messages.append(message)

    middleware = RequestSizeLimitMiddleware(
        app, max_body_bytes=100, paths=("/v1/assess/email-file",)
    )
    await middleware(
        {
            "type": "http",
            "path": "/v1/assess/email-file",
            "headers": [(b"content-length", b"101")],
        },
        receive,
        send,
    )

    assert called is False
    assert messages[0]["status"] == 413


@pytest.mark.asyncio
async def test_chunked_upload_is_stopped_when_limit_is_crossed() -> None:
    messages: list[dict] = []
    chunks = iter(
        [
            {"type": "http.request", "body": b"123456", "more_body": True},
            {"type": "http.request", "body": b"789012", "more_body": False},
        ]
    )

    async def app(_scope, receive, _send) -> None:
        while True:
            message = await receive()
            if not message.get("more_body"):
                break

    async def receive() -> dict:
        return next(chunks)

    async def send(message: dict) -> None:
        messages.append(message)

    middleware = RequestSizeLimitMiddleware(
        app, max_body_bytes=10, paths=("/v1/assess/email-file",)
    )
    await middleware(
        {"type": "http", "path": "/v1/assess/email-file", "headers": []},
        receive,
        send,
    )

    assert messages[0]["status"] == 413


@pytest.mark.asyncio
async def test_exact_path_limit_does_not_match_longer_sibling_endpoint() -> None:
    called = False

    async def app(_scope, _receive, _send) -> None:
        nonlocal called
        called = True

    async def receive() -> dict:
        return {"type": "http.request", "body": b"", "more_body": False}

    async def send(_message: dict) -> None:
        return None

    middleware = RequestSizeLimitMiddleware(
        app,
        max_body_bytes=10,
        exact_paths=("/v1/demo/deepfake/analyze",),
    )
    await middleware(
        {
            "type": "http",
            "path": "/v1/demo/deepfake/analyze-video",
            "headers": [(b"content-length", b"100")],
        },
        receive,
        send,
    )

    assert called is True


@pytest.mark.asyncio
async def test_negative_content_length_is_rejected_as_invalid() -> None:
    called = False
    messages: list[dict] = []

    async def app(_scope, _receive, _send) -> None:
        nonlocal called
        called = True

    async def receive() -> dict:
        return {"type": "http.request", "body": b"", "more_body": False}

    async def send(message: dict) -> None:
        messages.append(message)

    middleware = RequestSizeLimitMiddleware(
        app, max_body_bytes=10, exact_paths=("/v1/demo/deepfake/analyze",)
    )
    await middleware(
        {
            "type": "http",
            "path": "/v1/demo/deepfake/analyze",
            "headers": [(b"content-length", b"-1")],
        },
        receive,
        send,
    )

    assert called is False
    assert messages[0]["status"] == 400
