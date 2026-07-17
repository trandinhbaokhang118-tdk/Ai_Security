"""Local, web-only interactive Chromium sessions for the Free sandbox tier.

A Playwright context is kept server-side. Users can navigate and click through a
screenshot coordinate API, but cannot upload/download files or access host/private
networks. The temporary profile is destroyed with the session.
"""
from __future__ import annotations

import base64
import ipaddress
import socket
import threading
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from datetime import datetime
from urllib.parse import urlsplit

from security.sandbox_worker import _normalize_url


@dataclass
class FreeBrowserSession:
    playwright: object
    browser: object
    context: object
    page: object
    expires_at: datetime


class FreeWebSandboxManager:
    def __init__(self) -> None:
        self._sessions: dict[str, FreeBrowserSession] = {}
        self._lock = threading.RLock()
        # Playwright's synchronous API is thread-affine. FastAPI may execute each
        # sync route in a different worker thread, so every browser operation must
        # be marshalled onto the same dedicated thread.
        self._executor = ThreadPoolExecutor(
            max_workers=1,
            thread_name_prefix="free-web-sandbox",
        )

    @staticmethod
    def assert_public_url(raw_url: str) -> str:
        url = _normalize_url(raw_url)
        parts = urlsplit(url)
        port = parts.port or (443 if parts.scheme == "https" else 80)
        addresses = socket.getaddrinfo(parts.hostname or "", port, type=socket.SOCK_STREAM)
        if not addresses or any(not ipaddress.ip_address(item[4][0]).is_global for item in addresses):
            raise PermissionError("private_network_blocked")
        return url

    def create(self, session_id: str, expires_at: datetime) -> dict:
        return self._executor.submit(self._create, session_id, expires_at).result()

    def _create(self, session_id: str, expires_at: datetime) -> dict:
        try:
            from playwright.sync_api import sync_playwright
        except ImportError as exc:
            raise RuntimeError("Chưa cài Playwright cho Free Web Sandbox") from exc
        with self._lock:
            self._close(session_id)
            pw = sync_playwright().start()
            browser = pw.chromium.launch(headless=True, args=[
                "--disable-extensions", "--disable-sync", "--disable-quic",
                "--disable-background-networking", "--no-first-run",
            ])
            context = browser.new_context(
                viewport={"width": 1280, "height": 720}, accept_downloads=False,
                java_script_enabled=True, service_workers="block",
                permissions=[], user_agent="Prewise-Free-Web-Sandbox/1.0",
            )
            page = context.new_page()

            def guard(route, request) -> None:
                try:
                    self.assert_public_url(request.url)
                    if request.resource_type in {"media", "font"}:
                        route.abort()
                    else:
                        route.continue_()
                except Exception:
                    route.abort()

            context.route("**/*", guard)
            page.on("download", lambda download: download.cancel())
            page.goto("https://example.com", wait_until="domcontentloaded", timeout=15_000)
            self._sessions[session_id] = FreeBrowserSession(pw, browser, context, page, expires_at)
            return self._state(session_id)

    def _get(self, session_id: str) -> FreeBrowserSession:
        session = self._sessions.get(session_id)
        if session is None:
            raise KeyError("free_browser_session_not_found")
        if session.expires_at <= datetime.utcnow():
            # Already running on the dedicated executor thread. Calling the
            # public close() would submit back to the same executor and deadlock.
            self._close(session_id)
            raise TimeoutError("free_browser_session_expired")
        return session

    def navigate(self, session_id: str, url: str) -> dict:
        return self._executor.submit(self._navigate, session_id, url).result()

    def _navigate(self, session_id: str, url: str) -> dict:
        with self._lock:
            session = self._get(session_id)
            target = self.assert_public_url(url)
            session.page.goto(target, wait_until="domcontentloaded", timeout=15_000)
            return self._state(session_id)

    def click(self, session_id: str, x: float, y: float) -> dict:
        return self._executor.submit(self._click, session_id, x, y).result()

    def _click(self, session_id: str, x: float, y: float) -> dict:
        with self._lock:
            session = self._get(session_id)
            session.page.mouse.click(max(0, min(x, 1280)), max(0, min(y, 720)))
            session.page.wait_for_timeout(300)
            return self._state(session_id)

    def key(self, session_id: str, key: str) -> dict:
        allowed = {"Enter", "Escape", "Tab", "Backspace", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "PageUp", "PageDown"}
        if key not in allowed:
            raise ValueError("key_not_allowed")
        return self._executor.submit(self._key, session_id, key).result()

    def _key(self, session_id: str, key: str) -> dict:
        with self._lock:
            self._get(session_id).page.keyboard.press(key)
            return self._state(session_id)

    def type_text(self, session_id: str, text: str) -> dict:
        if len(text) > 500 or any(ord(char) < 32 and char not in "\t\n" for char in text):
            raise ValueError("invalid_text")
        return self._executor.submit(self._type_text, session_id, text).result()

    def _type_text(self, session_id: str, text: str) -> dict:
        with self._lock:
            self._get(session_id).page.keyboard.type(text[:500])
            return self._state(session_id)

    def state(self, session_id: str) -> dict:
        return self._executor.submit(self._state, session_id).result()

    def _state(self, session_id: str) -> dict:
        session = self._get(session_id)
        screenshot = session.page.screenshot(type="jpeg", quality=70)
        return {
            "url": session.page.url, "title": session.page.title()[:200],
            "image": "data:image/jpeg;base64," + base64.b64encode(screenshot).decode("ascii"),
            "width": 1280, "height": 720,
        }

    def close(self, session_id: str) -> None:
        self._executor.submit(self._close, session_id).result()

    def _close(self, session_id: str) -> None:
        with self._lock:
            session = self._sessions.pop(session_id, None)
            if session is None:
                return
            try:
                session.context.close()
                session.browser.close()
            finally:
                session.playwright.stop()


free_web_sandbox = FreeWebSandboxManager()
