from __future__ import annotations

import socket

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
