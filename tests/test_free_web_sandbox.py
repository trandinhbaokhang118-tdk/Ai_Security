from __future__ import annotations

import socket
from datetime import datetime, timedelta
from types import SimpleNamespace

import pytest

from security.free_web_sandbox import FreeWebSandboxManager


def test_free_sandbox_rejects_private_ip() -> None:
    with pytest.raises(PermissionError):
        FreeWebSandboxManager.assert_public_url("http://127.0.0.1/admin")


def test_free_sandbox_normalizes_public_url(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(socket, "getaddrinfo", lambda *args, **kwargs: [
        (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 443))
    ])
    assert FreeWebSandboxManager.assert_public_url("example.com") == "https://example.com/"


def test_free_sandbox_only_allows_navigation_keys() -> None:
    manager = FreeWebSandboxManager()
    with pytest.raises(ValueError):
        manager.key("missing", "Control+O")


def test_expired_session_closes_without_resubmitting_to_executor(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    manager = FreeWebSandboxManager()
    session_id = "expired-session"
    manager._sessions[session_id] = SimpleNamespace(
        expires_at=datetime.utcnow() - timedelta(seconds=1)
    )
    closed: list[str] = []
    monkeypatch.setattr(manager, "_close", lambda value: closed.append(value))

    with pytest.raises(TimeoutError, match="free_browser_session_expired"):
        manager._get(session_id)

    assert closed == [session_id]


def test_type_text_runs_on_browser_executor_and_returns_updated_state() -> None:
    manager = FreeWebSandboxManager()
    session_id = "typing-session"
    typed: list[str] = []
    page = SimpleNamespace(
        keyboard=SimpleNamespace(type=lambda value: typed.append(value)),
        url="https://example.com/form",
        title=lambda: "Typing form",
        screenshot=lambda **kwargs: b"image",
    )
    manager._sessions[session_id] = SimpleNamespace(
        page=page,
        expires_at=datetime.utcnow() + timedelta(minutes=1),
    )

    state = manager.type_text(session_id, "sandbox-test")

    assert typed == ["sandbox-test"]
    assert state["url"] == "https://example.com/form"
    assert state["title"] == "Typing form"
    assert state["image"].startswith("data:image/jpeg;base64,")
