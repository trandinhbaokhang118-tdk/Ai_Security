"""Local, web-only interactive Chromium sessions for the Free sandbox tier.

A Playwright context is kept server-side. Users navigate and click through a
screenshot coordinate API. Text entered by the user is never typed into the
remote page verbatim: each editable field receives a per-session canary value.
Canary submissions are observed so the UI can show where the page attempted to
send data. Downloads and private-network access remain blocked, and the
temporary browser profile is destroyed with the session.
"""
from __future__ import annotations

import base64
import ipaddress
import secrets
import socket
import threading
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from datetime import datetime
from urllib.parse import unquote_plus, urljoin, urlsplit

from security.sandbox_worker import _normalize_url

MAX_SECURITY_EVENTS = 30
DOWNLOAD_EXTENSIONS = frozenset(
    {
        ".7z",
        ".apk",
        ".appimage",
        ".bat",
        ".bin",
        ".cmd",
        ".deb",
        ".dmg",
        ".doc",
        ".docm",
        ".docx",
        ".exe",
        ".img",
        ".iso",
        ".jar",
        ".js",
        ".lnk",
        ".msi",
        ".pdf",
        ".pkg",
        ".ppt",
        ".pptm",
        ".pptx",
        ".ps1",
        ".rar",
        ".rpm",
        ".scr",
        ".tar",
        ".tgz",
        ".vbs",
        ".xls",
        ".xlsm",
        ".xlsx",
        ".zip",
    }
)
SENSITIVE_FIELD_TYPES = frozenset({"password", "otp", "card"})


@dataclass
class CanaryField:
    kind: str
    value: str


@dataclass
class FreeBrowserSession:
    playwright: object
    browser: object
    context: object
    page: object
    expires_at: datetime
    canary_token: str
    canary_fields: dict[str, CanaryField] = field(default_factory=dict)
    events: list[dict[str, object]] = field(default_factory=list)
    seen_event_signatures: set[str] = field(default_factory=set)
    input_counter: int = 0
    event_counter: int = 0


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

    @staticmethod
    def _host(url: str) -> str:
        return (urlsplit(url).hostname or "").lower()

    @staticmethod
    def _safe_event_url(url: str) -> str:
        parts = urlsplit(url)
        if not parts.scheme or not parts.netloc:
            return ""
        return f"{parts.scheme}://{parts.netloc}{parts.path}"

    @staticmethod
    def _request_value(request: object, name: str, default: object = None) -> object:
        value = getattr(request, name, default)
        return value() if callable(value) else value

    @staticmethod
    def _looks_like_download_url(url: str) -> bool:
        path = urlsplit(url).path.lower().rstrip("/")
        return any(path.endswith(extension) for extension in DOWNLOAD_EXTENSIONS)

    @staticmethod
    def _classify_field(metadata: dict[str, object]) -> str:
        input_type = str(metadata.get("type") or "").lower()
        combined = " ".join(
            str(metadata.get(key) or "").lower()
            for key in ("type", "name", "autocomplete", "placeholder", "ariaLabel", "inputMode")
        )
        if input_type == "password" or "password" in combined or "mật khẩu" in combined:
            return "password"
        if input_type == "email" or "email" in combined or "e-mail" in combined:
            return "email"
        if (
            "one-time-code" in combined
            or "otp" in combined
            or "verification code" in combined
            or "mã xác minh" in combined
            or "pin code" in combined
        ):
            return "otp"
        if (
            "cc-number" in combined
            or "card number" in combined
            or "credit card" in combined
            or "số thẻ" in combined
        ):
            return "card"
        if input_type == "tel" or "phone" in combined or "mobile" in combined or "điện thoại" in combined:
            return "phone"
        if (
            "username" in combined
            or "user name" in combined
            or "login" in combined
            or "account" in combined
            or "tài khoản" in combined
        ):
            return "username"
        if input_type == "search" or "search" in combined or "tìm kiếm" in combined:
            return "search"
        return "text"

    @staticmethod
    def _generate_canary(session: FreeBrowserSession, kind: str) -> str:
        session.input_counter += 1
        counter = session.input_counter
        marker = f"SBX-{session.canary_token}-{counter}"
        if kind == "password":
            return f"Pw-{marker}!"
        if kind == "email":
            return f"{marker.lower()}@example.invalid"
        if kind == "otp":
            return f"{700000 + (counter % 100000):06d}"
        if kind == "card":
            return "4242424242424242"
        if kind == "phone":
            return f"0900{counter % 1000000:06d}"
        if kind == "username":
            return f"user-{marker.lower()}"
        if kind == "search":
            return f"query-{marker.lower()}"
        return f"text-{marker.lower()}"

    @staticmethod
    def _active_field_metadata(page: object) -> dict[str, object] | None:
        return page.evaluate(
            """
            () => {
              let element = document.activeElement;
              while (element?.shadowRoot?.activeElement) {
                element = element.shadowRoot.activeElement;
              }
              if (!element) return null;
              const tag = element.tagName?.toLowerCase() || '';
              const type = (element.getAttribute?.('type') || '').toLowerCase();
              const editable = tag === 'textarea' || element.isContentEditable ||
                (tag === 'input' && !['button', 'checkbox', 'file', 'hidden', 'radio', 'reset', 'submit'].includes(type));
              if (!editable) return null;
              let fieldId = element.getAttribute('data-prewise-canary-id');
              if (!fieldId) {
                fieldId = `pw-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
                element.setAttribute('data-prewise-canary-id', fieldId);
              }
              return {
                fieldId,
                tag,
                type,
                name: element.getAttribute('name') || '',
                autocomplete: element.getAttribute('autocomplete') || '',
                placeholder: element.getAttribute('placeholder') || '',
                ariaLabel: element.getAttribute('aria-label') || '',
                inputMode: element.getAttribute('inputmode') || '',
              };
            }
            """
        )

    @staticmethod
    def _apply_canary_to_active_field(page: object, field_id: str, value: str) -> bool:
        return bool(
            page.evaluate(
                """
                ({ fieldId, value }) => {
                  const element = document.querySelector(`[data-prewise-canary-id="${fieldId}"]`);
                  if (!element) return false;
                  element.focus();
                  const tag = element.tagName.toLowerCase();
                  if (element.isContentEditable) {
                    element.textContent = value;
                  } else {
                    const prototype = tag === 'textarea'
                      ? HTMLTextAreaElement.prototype
                      : HTMLInputElement.prototype;
                    const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
                    if (setter) setter.call(element, value);
                    else element.value = value;
                  }
                  element.dispatchEvent(new InputEvent('input', {
                    bubbles: true,
                    inputType: 'insertText',
                    data: value,
                  }));
                  element.dispatchEvent(new Event('change', { bubbles: true }));
                  return true;
                }
                """,
                {"fieldId": field_id, "value": value},
            )
        )

    @staticmethod
    def _inspect_click_target(page: object, x: float, y: float) -> dict[str, object] | None:
        return page.evaluate(
            """
            ({ x, y }) => {
              const element = document.elementFromPoint(x, y);
              if (!element) return null;
              const anchor = element.closest?.('a');
              const control = element.closest?.('button,input[type="submit"],input[type="image"]');
              const form = control?.form || element.closest?.('form');
              const controlType = (control?.getAttribute?.('type') ||
                (control?.tagName?.toLowerCase() === 'button' ? 'submit' : '')).toLowerCase();
              const isSubmit = Boolean(form && ['submit', 'image'].includes(controlType));
              if (!anchor && !isSubmit) return null;
              return {
                href: anchor?.href || '',
                download: Boolean(anchor?.hasAttribute('download')),
                filename: anchor?.getAttribute('download') || '',
                text: (anchor?.textContent || control?.textContent || '').trim().slice(0, 160),
                isSubmit,
                formAction: form?.action || '',
                formMethod: (form?.method || 'get').toUpperCase(),
                fieldIds: form
                  ? Array.from(form.querySelectorAll('[data-prewise-canary-id]'))
                      .map((item) => item.getAttribute('data-prewise-canary-id'))
                      .filter(Boolean)
                  : [],
              };
            }
            """,
            {"x": x, "y": y},
        )

    @staticmethod
    def _inspect_active_form(page: object) -> dict[str, object] | None:
        return page.evaluate(
            """
            () => {
              let element = document.activeElement;
              while (element?.shadowRoot?.activeElement) {
                element = element.shadowRoot.activeElement;
              }
              const form = element?.form || element?.closest?.('form');
              if (!form) return null;
              return {
                isSubmit: true,
                formAction: form.action || location.href,
                formMethod: (form.method || 'get').toUpperCase(),
                fieldIds: Array.from(form.querySelectorAll('[data-prewise-canary-id]'))
                  .map((item) => item.getAttribute('data-prewise-canary-id'))
                  .filter(Boolean),
              };
            }
            """
        )

    def _append_event(
        self,
        session: FreeBrowserSession,
        *,
        event_type: str,
        severity: str,
        title: str,
        message: str,
        signature: str | None = None,
        **details: object,
    ) -> None:
        if signature and signature in session.seen_event_signatures:
            return
        if signature:
            session.seen_event_signatures.add(signature)
        session.event_counter += 1
        session.events.append(
            {
                "id": f"event-{session.event_counter}",
                "type": event_type,
                "severity": severity,
                "title": title,
                "message": message,
                "createdAt": datetime.utcnow().isoformat(timespec="seconds") + "Z",
                **details,
            }
        )
        if len(session.events) > MAX_SECURITY_EVENTS:
            session.events[:] = session.events[-MAX_SECURITY_EVENTS:]

    def _record_form_attempt(
        self,
        session: FreeBrowserSession,
        target: dict[str, object],
    ) -> None:
        raw_field_ids = target.get("fieldIds")
        field_ids = raw_field_ids if isinstance(raw_field_ids, list) else []
        field_types = sorted(
            {
                session.canary_fields[field_id].kind
                for field_id in field_ids
                if isinstance(field_id, str) and field_id in session.canary_fields
            }
        )
        if not field_types:
            field_types = sorted({canary.kind for canary in session.canary_fields.values()})
        if not field_types:
            return
        action = str(target.get("formAction") or getattr(session.page, "url", "") or "")
        action = urljoin(str(getattr(session.page, "url", "") or ""), action)
        method = str(target.get("formMethod") or "GET").upper()
        destination = self._host(action)
        current_host = self._host(str(getattr(session.page, "url", "") or ""))
        cross_domain = bool(destination and current_host and destination != current_host)
        severe_fields = bool(SENSITIVE_FIELD_TYPES.intersection(field_types))
        severity = "high" if cross_domain and severe_fields else "medium"
        title = (
            "Sắp gửi canary sang domain khác"
            if cross_domain
            else "Sắp gửi biểu mẫu bằng dữ liệu canary"
        )
        message = (
            f"Sandbox sẽ gửi dữ liệu thử nghiệm ({', '.join(field_types)})"
            + (f" tới {destination}" if destination else "")
            + "; dữ liệu thật của bạn vẫn được giữ lại."
        )
        safe_url = self._safe_event_url(action)
        self._append_event(
            session,
            event_type="form_submission_attempt",
            severity=severity,
            title=title,
            message=message,
            signature=f"form:{method}:{safe_url}:{','.join(field_types)}",
            destination=destination or None,
            url=safe_url or None,
            method=method,
            fieldTypes=field_types,
            crossDomain=cross_domain,
            blocked=False,
        )

    def _record_download(
        self,
        session: FreeBrowserSession,
        *,
        url: str,
        filename: str = "",
    ) -> None:
        safe_url = self._safe_event_url(url)
        destination = self._host(url)
        displayed_name = filename or urlsplit(url).path.rsplit("/", 1)[-1] or "tệp không rõ tên"
        self._append_event(
            session,
            event_type="download_blocked",
            severity="high",
            title="Đã chặn tải tệp",
            message=(
                f"Website cố tải “{displayed_name}”"
                + (f" từ {destination}" if destination else "")
                + ". Tệp chưa chạm vào thiết bị của bạn."
            ),
            signature=f"download:{safe_url}:{displayed_name}",
            destination=destination or None,
            url=safe_url or None,
            filename=displayed_name,
            blocked=True,
        )

    def _observe_canary_request(self, session: FreeBrowserSession, request: object) -> None:
        request_url = str(self._request_value(request, "url", "") or "")
        post_data = str(self._request_value(request, "post_data", "") or "")
        decoded = unquote_plus(f"{request_url}\n{post_data}").lower()
        field_types = sorted(
            {
                canary.kind
                for canary in session.canary_fields.values()
                if canary.value.lower() in decoded
            }
        )
        marker = f"sbx-{session.canary_token.lower()}"
        if not field_types and marker not in decoded:
            return
        if not field_types:
            field_types = ["unknown"]
        method = str(self._request_value(request, "method", "GET") or "GET").upper()
        destination = self._host(request_url)
        current_host = self._host(str(getattr(session.page, "url", "") or ""))
        cross_domain = bool(destination and current_host and destination != current_host)
        severe_fields = bool(SENSITIVE_FIELD_TYPES.intersection(field_types))
        severity = "high" if cross_domain and severe_fields else "medium"
        title = "Canary được gửi sang domain khác" if cross_domain else "Đã quan sát gửi biểu mẫu"
        if cross_domain:
            message = (
                f"Dữ liệu thử nghiệm ({', '.join(field_types)}) được gửi tới {destination}. "
                "Dữ liệu thật của bạn không được gửi."
            )
        else:
            message = (
                f"Website đã gửi dữ liệu thử nghiệm ({', '.join(field_types)})"
                + (f" tới {destination}." if destination else ".")
                + " Dữ liệu thật của bạn không được gửi."
            )
        safe_url = self._safe_event_url(request_url)
        self._append_event(
            session,
            event_type="canary_submission",
            severity=severity,
            title=title,
            message=message,
            signature=f"submit:{method}:{safe_url}:{','.join(field_types)}",
            destination=destination or None,
            url=safe_url or None,
            method=method,
            fieldTypes=field_types,
            crossDomain=cross_domain,
            blocked=False,
        )

    def _request_is_download(self, request: object) -> bool:
        request_url = str(self._request_value(request, "url", "") or "")
        resource_type = str(self._request_value(request, "resource_type", "") or "")
        is_navigation = bool(self._request_value(request, "is_navigation_request", False))
        return self._looks_like_download_url(request_url) and (
            is_navigation or resource_type in {"document", "other"}
        )

    def _guard_request(self, session: FreeBrowserSession, route: object, request: object) -> None:
        request_url = str(self._request_value(request, "url", "") or "")
        resource_type = str(self._request_value(request, "resource_type", "") or "")
        try:
            self.assert_public_url(request_url)
        except Exception:
            if resource_type in {"document", "fetch", "xhr", "websocket"}:
                self._append_event(
                    session,
                    event_type="private_network_blocked",
                    severity="high",
                    title="Đã chặn truy cập mạng nội bộ",
                    message="Website cố kết nối tới địa chỉ nội bộ hoặc không công khai.",
                    signature=f"private:{self._safe_event_url(request_url)}",
                    destination=self._host(request_url) or None,
                    url=self._safe_event_url(request_url) or None,
                    blocked=True,
                )
            route.abort()
            return
        if self._request_is_download(request):
            self._record_download(session, url=request_url)
            route.abort()
            return
        self._observe_canary_request(session, request)
        if resource_type in {"media", "font"}:
            route.abort()
        else:
            route.continue_()

    def _handle_download(self, session: FreeBrowserSession, download: object) -> None:
        try:
            url = str(self._request_value(download, "url", "") or "")
            filename = str(self._request_value(download, "suggested_filename", "") or "")
            self._record_download(session, url=url, filename=filename)
        finally:
            try:
                download.cancel()
            except Exception:
                pass

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
            browser = pw.chromium.launch(
                headless=True,
                args=[
                    "--disable-extensions",
                    "--disable-sync",
                    "--disable-quic",
                    "--disable-background-networking",
                    "--no-first-run",
                ],
            )
            context = browser.new_context(
                viewport={"width": 1280, "height": 720},
                accept_downloads=False,
                java_script_enabled=True,
                service_workers="block",
                permissions=[],
                user_agent="Prewise-Free-Web-Sandbox/1.0",
            )
            page = context.new_page()
            session = FreeBrowserSession(
                playwright=pw,
                browser=browser,
                context=context,
                page=page,
                expires_at=expires_at,
                canary_token=secrets.token_hex(3).upper(),
            )
            self._sessions[session_id] = session
            context.route("**/*", lambda route, request: self._guard_request(session, route, request))
            page.on("download", lambda download: self._handle_download(session, download))
            try:
                page.goto("https://example.com", wait_until="domcontentloaded", timeout=15_000)
            except Exception:
                self._close(session_id)
                raise
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
            bounded_x = max(0, min(x, 1280))
            bounded_y = max(0, min(y, 720))
            target = self._inspect_click_target(session.page, bounded_x, bounded_y)
            if target:
                href = str(target.get("href") or "")
                download_url = urljoin(str(getattr(session.page, "url", "") or ""), href)
                if bool(target.get("download")) or self._looks_like_download_url(download_url):
                    self._record_download(
                        session,
                        url=download_url,
                        filename=str(target.get("filename") or ""),
                    )
                    return self._state(session_id)
                if bool(target.get("isSubmit")):
                    self._record_form_attempt(session, target)
            session.page.mouse.click(bounded_x, bounded_y)
            session.page.wait_for_timeout(300)
            return self._state(session_id)

    def key(self, session_id: str, key: str) -> dict:
        allowed = {
            "Enter",
            "Escape",
            "Tab",
            "Backspace",
            "ArrowUp",
            "ArrowDown",
            "ArrowLeft",
            "ArrowRight",
            "PageUp",
            "PageDown",
        }
        if key not in allowed:
            raise ValueError("key_not_allowed")
        return self._executor.submit(self._key, session_id, key).result()

    def _key(self, session_id: str, key: str) -> dict:
        with self._lock:
            session = self._get(session_id)
            if key == "Enter":
                target = self._inspect_active_form(session.page)
                if target:
                    self._record_form_attempt(session, target)
            session.page.keyboard.press(key)
            return self._state(session_id)

    def type_text(self, session_id: str, text: str) -> dict:
        if len(text) > 500 or any(ord(char) < 32 and char not in "\t\n" for char in text):
            raise ValueError("invalid_text")
        return self._executor.submit(self._type_text, session_id, text).result()

    def _type_text(self, session_id: str, text: str) -> dict:
        with self._lock:
            session = self._get(session_id)
            metadata = self._active_field_metadata(session.page)
            field_id = str(metadata.get("fieldId")) if metadata else "unfocused"
            canary = session.canary_fields.get(field_id)
            if canary is None:
                kind = self._classify_field(metadata or {})
                canary = CanaryField(kind=kind, value=self._generate_canary(session, kind))
                session.canary_fields[field_id] = canary
            applied = False
            if metadata:
                applied = self._apply_canary_to_active_field(session.page, field_id, canary.value)
            if not applied:
                session.page.keyboard.type(canary.value)
            self._append_event(
                session,
                event_type="input_substituted",
                severity="info",
                title="Dữ liệu thật đã được thay bằng canary",
                message=(
                    f"Nội dung bạn nhập không được gửi vào website. Sandbox dùng dữ liệu thử "
                    f"“{canary.value}” để quan sát hành vi."
                ),
                signature=f"input:{field_id}:{canary.value}",
                fieldType=canary.kind,
                replacement=canary.value,
                blocked=True,
            )
            return self._state(session_id)

    def state(self, session_id: str) -> dict:
        return self._executor.submit(self._state, session_id).result()

    def _state(self, session_id: str) -> dict:
        session = self._get(session_id)
        screenshot = session.page.screenshot(type="jpeg", quality=70)
        events = list(reversed(session.events[-12:]))
        submissions = sum(event.get("type") == "canary_submission" for event in session.events)
        downloads = sum(event.get("type") == "download_blocked" for event in session.events)
        return {
            "url": session.page.url,
            "title": session.page.title()[:200],
            "image": "data:image/jpeg;base64," + base64.b64encode(screenshot).decode("ascii"),
            "width": 1280,
            "height": 720,
            "protection": {
                "canaryEnabled": True,
                "realInputSent": False,
                "downloadBlockingEnabled": True,
                "submissionsObserved": submissions,
                "downloadsBlocked": downloads,
            },
            "events": events,
            "lastEvent": events[0] if events else None,
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
