"""Isolated, dependency-free HTTP worker used by the URL sandbox runner."""

from __future__ import annotations

import os

if os.name == "nt" and not os.environ.get("SYSTEMROOT"):
    try:
        import ctypes

        _windows_dir = ctypes.create_unicode_buffer(260)
        if ctypes.windll.kernel32.GetWindowsDirectoryW(_windows_dir, len(_windows_dir)):
            os.environ["SYSTEMROOT"] = _windows_dir.value
            os.environ["WINDIR"] = _windows_dir.value
    except (AttributeError, OSError):
        pass
    if not os.environ.get("SYSTEMROOT"):
        os.environ["SYSTEMROOT"] = r"C:\Windows"
        os.environ["WINDIR"] = r"C:\Windows"

import http.client  # noqa: E402
import ipaddress  # noqa: E402
import json  # noqa: E402
import socket  # noqa: E402
import ssl  # noqa: E402
import sys  # noqa: E402
import time  # noqa: E402
from html.parser import HTMLParser  # noqa: E402
from urllib.parse import unquote, urljoin, urlsplit, urlunsplit  # noqa: E402

REDIRECT_STATUSES = {301, 302, 303, 307, 308}
SUSPICIOUS_TEXT = (
    "verify your account",
    "account suspended",
    "urgent",
    "act now",
    "xac minh tai khoan",
    "tai khoan bi khoa",
    "khẩn cấp",
    "xác minh ngay",
)

SCAN_STEPS = (
    ("normalize_url", "Normalize URL and reject unsafe schemes"),
    ("resolve_public_ip", "Resolve DNS and block private networks"),
    ("connect_fetch", "Open isolated HTTP request"),
    ("follow_redirects", "Follow redirects inside limit"),
    ("inspect_response", "Inspect HTTP, TLS and security headers"),
    ("inspect_html", "Parse HTML forms, scripts and page text"),
    ("summarize_issues", "Summarize sandbox findings"),
)

FAILURE_STEP = {
    "unsupported_scheme": "normalize_url",
    "missing_hostname": "normalize_url",
    "credentials_in_url": "normalize_url",
    "invalid_port": "normalize_url",
    "private_network_blocked": "resolve_public_ip",
    "dns_error": "resolve_public_ip",
    "tls_certificate_error": "connect_fetch",
    "timeout": "connect_fetch",
    "connection_refused": "connect_fetch",
    "network_error": "connect_fetch",
    "redirect_loop": "follow_redirects",
    "too_many_redirects": "follow_redirects",
    "worker_error": "summarize_issues",
}


def _issue(code: str, severity: str, category: str, message: str, detail: str = "") -> dict:
    return {
        "code": code,
        "severity": severity,
        "category": category,
        "message": message,
        "detail": detail,
    }


def _scan_steps(
    failed_code: str = "",
    detail: str = "",
    issues: list[dict] | None = None,
) -> list[dict]:
    failed_key = FAILURE_STEP.get(failed_code, failed_code)
    steps: list[dict] = []
    failed_seen = False
    for key, label in SCAN_STEPS:
        if failed_key and key == failed_key:
            steps.append({"key": key, "label": label, "status": "failed", "detail": detail[:180]})
            failed_seen = True
        elif failed_seen:
            steps.append({"key": key, "label": label, "status": "skipped"})
        else:
            steps.append({"key": key, "label": label, "status": "passed"})
    if issues and not failed_code:
        issue_step = {
            "http": "inspect_response",
            "headers": "inspect_response",
            "resource": "inspect_response",
            "content": "inspect_html",
        }
        issue_details: dict[str, list[str]] = {}
        for issue in issues:
            step_key = issue_step.get(str(issue.get("category", "")))
            if step_key:
                issue_details.setdefault(step_key, []).append(str(issue.get("code", "")))
        for step in steps:
            codes = issue_details.get(step["key"])
            if codes:
                step["status"] = "failed"
                step["detail"] = ", ".join(code for code in codes if code)[:180]
    return steps


class PageInspector(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.title = ""
        self._in_title = False
        self.password_inputs = 0
        self.sensitive_inputs = 0
        self.forms: list[str] = []
        self.scripts: list[str] = []
        self.iframes: list[str] = []
        self.meta_refresh: list[str] = []
        self.links: list[tuple[str, str]] = []
        self.meta: dict[str, str] = {}
        self.favicons: list[str] = []
        self.text_parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = {key.lower(): value or "" for key, value in attrs}
        tag = tag.lower()
        if tag == "title":
            self._in_title = True
        elif tag == "form":
            self.forms.append(values.get("action", ""))
        elif tag == "input":
            input_type = values.get("type", "text").lower()
            name = f"{values.get('name', '')} {values.get('id', '')}".lower()
            if input_type == "password":
                self.password_inputs += 1
            if input_type in {"password", "tel"} or any(
                token in name for token in ("otp", "card", "cccd", "cvv", "pin")
            ):
                self.sensitive_inputs += 1
        elif tag == "script" and values.get("src"):
            self.scripts.append(values["src"])
        elif tag == "iframe" and values.get("src"):
            self.iframes.append(values["src"])
        elif tag == "meta":
            if values.get("http-equiv", "").lower() == "refresh":
                self.meta_refresh.append(values.get("content", ""))
            key = values.get("name") or values.get("property")
            if key:
                self.meta[key.lower()] = values.get("content", "")[:500]
        elif tag == "a" and values.get("href"):
            self.links.append((values["href"], values.get("aria-label", "")))
        elif tag == "link" and "icon" in values.get("rel", "").lower():
            self.favicons.append(values.get("href", ""))

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "title":
            self._in_title = False

    def handle_data(self, data: str) -> None:
        clean = " ".join(data.split())
        if not clean:
            return
        if self._in_title and len(self.title) < 200:
            self.title = f"{self.title} {clean}".strip()[:200]
        if len(self.text_parts) < 2000:
            self.text_parts.append(clean)


class PinnedHTTPConnection(http.client.HTTPConnection):
    def __init__(self, host: str, port: int, connect_ip: str, timeout: float) -> None:
        super().__init__(host, port, timeout=timeout)
        self.connect_ip = connect_ip

    def connect(self) -> None:
        self.sock = socket.create_connection((self.connect_ip, self.port), self.timeout)


class PinnedHTTPSConnection(http.client.HTTPSConnection):
    def __init__(self, host: str, port: int, connect_ip: str, timeout: float) -> None:
        super().__init__(host, port, timeout=timeout, context=ssl.create_default_context())
        self.connect_ip = connect_ip

    def connect(self) -> None:
        raw = socket.create_connection((self.connect_ip, self.port), self.timeout)
        self.sock = self._context.wrap_socket(raw, server_hostname=self.host)


def _normalize_url(raw_url: str) -> str:
    value = raw_url.strip()
    if "://" not in value:
        value = f"https://{value}"
    parts = urlsplit(value)
    if parts.scheme.lower() not in {"http", "https"}:
        raise ValueError("unsupported_scheme")
    if not parts.hostname:
        raise ValueError("missing_hostname")
    if parts.username or parts.password:
        raise ValueError("credentials_in_url")
    host = parts.hostname.encode("idna").decode("ascii")
    try:
        port = parts.port
    except ValueError as exc:
        raise ValueError("invalid_port") from exc
    default_port = 443 if parts.scheme.lower() == "https" else 80
    display_host = f"[{host}]" if ":" in host else host
    netloc = display_host if not port or port == default_port else f"{display_host}:{port}"
    return urlunsplit((parts.scheme.lower(), netloc, parts.path or "/", parts.query, ""))


def _public_addresses(host: str, port: int) -> list[str]:
    try:
        literal = ipaddress.ip_address(host)
        addresses = [str(literal)]
    except ValueError:
        records = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
        addresses = []
        for record in records:
            address = record[4][0]
            if address not in addresses:
                addresses.append(address)
    if not addresses:
        raise socket.gaierror(f"Khong tim thay dia chi IP cho {host}")
    blocked = [address for address in addresses if not ipaddress.ip_address(address).is_global]
    if blocked:
        raise PermissionError(", ".join(blocked))
    return addresses


def _certificate_info(sock: socket.socket | None) -> dict:
    if sock is None or not hasattr(sock, "getpeercert"):
        return {}
    cert = sock.getpeercert()  # type: ignore[attr-defined]
    subject = dict(item[0] for item in cert.get("subject", ()))
    issuer = dict(item[0] for item in cert.get("issuer", ()))
    return {
        "protocol": sock.version() if hasattr(sock, "version") else "",  # type: ignore[attr-defined]
        "subject": subject.get("commonName", ""),
        "issuer": issuer.get("commonName", ""),
        "expires_at": cert.get("notAfter", ""),
    }


def _request_once(url: str, timeout: float, max_bytes: int) -> dict:
    parts = urlsplit(url)
    host = parts.hostname or ""
    port = parts.port or (443 if parts.scheme == "https" else 80)
    addresses = _public_addresses(host, port)
    path = urlunsplit(("", "", parts.path or "/", parts.query, ""))
    display_host = f"[{host}]" if ":" in host else host
    host_header = display_host if port in {80, 443} else f"{display_host}:{port}"
    last_error: Exception | None = None

    for address in addresses:
        conn: http.client.HTTPConnection | None = None
        try:
            conn = (
                PinnedHTTPSConnection(host, port, address, timeout)
                if parts.scheme == "https"
                else PinnedHTTPConnection(host, port, address, timeout)
            )
            conn.request(
                "GET",
                path,
                headers={
                    "Host": host_header,
                    "User-Agent": "AI-Security-Armor-Sandbox/1.0",
                    "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
                    "Accept-Encoding": "identity",
                    "Connection": "close",
                },
            )
            response = conn.getresponse()
            tls = _certificate_info(conn.sock) if parts.scheme == "https" else {}
            body = response.read(max_bytes + 1)
            return {
                "status": response.status,
                "reason": response.reason,
                "headers": {key.lower(): value for key, value in response.getheaders()},
                "body": body[:max_bytes],
                "truncated": len(body) > max_bytes,
                "resolved_ip": address,
                "tls": tls,
            }
        except (OSError, ssl.SSLError, http.client.HTTPException) as exc:
            last_error = exc
        finally:
            if conn is not None:
                conn.close()
    if last_error is not None:
        raise last_error
    raise ConnectionError(f"Khong the ket noi den {host}")


def _same_host(base_url: str, candidate: str) -> bool:
    target = urlsplit(urljoin(base_url, candidate))
    return (target.hostname or "").lower() == (urlsplit(base_url).hostname or "").lower()


def _inspect_html(body: bytes, content_type: str, url: str) -> tuple[dict, list[dict]]:
    if "html" not in content_type.lower():
        return {}, []
    charset = "utf-8"
    if "charset=" in content_type.lower():
        charset = content_type.lower().split("charset=", 1)[1].split(";", 1)[0].strip()
    text = body.decode(charset, errors="replace")
    parser = PageInspector()
    parser.feed(text)
    issues: list[dict] = []
    external_forms = [action for action in parser.forms if action and not _same_host(url, action)]
    external_iframes = [src for src in parser.iframes if src and not _same_host(url, src)]
    external_scripts = [src for src in parser.scripts if src and not _same_host(url, src)]
    page_text = unquote(" ".join(parser.text_parts)).lower()
    urgency_hits = [keyword for keyword in SUSPICIOUS_TEXT if keyword in page_text]

    if parser.password_inputs:
        issues.append(_issue("password_form", "high", "content", "Trang có ô nhập mật khẩu.", f"Số ô: {parser.password_inputs}"))
    if external_forms:
        issues.append(_issue("external_form_action", "critical", "content", "Biểu mẫu gửi dữ liệu sang tên miền khác.", ", ".join(external_forms[:3])))
    if external_iframes:
        issues.append(_issue("external_iframe", "medium", "content", "Trang nhúng iframe từ tên miền khác.", ", ".join(external_iframes[:3])))
    if urgency_hits:
        issues.append(_issue("urgency_language", "medium", "content", "Trang có ngôn ngữ thúc ép hoặc đe dọa.", ", ".join(urgency_hits[:5])))
    if parser.meta_refresh:
        issues.append(_issue("meta_refresh", "medium", "content", "Trang sử dụng chuyển hướng bằng meta refresh.", ", ".join(parser.meta_refresh[:3])))

    signals = {
        "forms": len(parser.forms),
        "password_inputs": parser.password_inputs,
        "sensitive_inputs": parser.sensitive_inputs,
        "external_form_actions": len(external_forms),
        "scripts": len(parser.scripts),
        "external_scripts": len(external_scripts),
        "iframes": len(parser.iframes),
        "external_iframes": len(external_iframes),
        "urgency_hits": urgency_hits[:10],
    }
    return {"page_title": parser.title, "page_signals": signals}, issues


def run(payload: dict) -> dict:
    started = time.perf_counter()
    raw_url = str(payload.get("url", ""))
    timeout = min(max(float(payload.get("timeout_seconds", 5.0)), 1.0), 10.0)
    max_bytes = min(max(int(payload.get("max_bytes", 1_048_576)), 16_384), 2_097_152)
    max_redirects = min(max(int(payload.get("max_redirects", 5)), 0), 8)
    issues: list[dict] = []
    redirects: list[dict] = []
    current = _normalize_url(raw_url)
    visited: set[str] = set()

    for redirect_index in range(max_redirects + 1):
        if current in visited:
            raise RuntimeError("redirect_loop")
        visited.add(current)
        response = _request_once(current, timeout, max_bytes)
        status = int(response["status"])
        location = response["headers"].get("location", "")
        if status in REDIRECT_STATUSES and location:
            next_url = _normalize_url(urljoin(current, location))
            redirects.append({"status_code": status, "from_url": current, "to_url": next_url})
            if redirect_index >= max_redirects:
                raise RuntimeError("too_many_redirects")
            current = next_url
            continue

        content_type = response["headers"].get("content-type", "")
        if status >= 500:
            issues.append(_issue("http_server_error", "high", "http", f"Máy chủ trả về lỗi HTTP {status}.", str(response["reason"])))
        elif status >= 400:
            issues.append(_issue("http_client_error", "medium", "http", f"Trang trả về lỗi HTTP {status}.", str(response["reason"])))
        if response["truncated"]:
            issues.append(_issue("response_too_large", "medium", "resource", "Nội dung vượt giới hạn sandbox và đã bị cắt.", f"Giới hạn {max_bytes} byte"))

        for header in ("content-security-policy", "x-content-type-options", "referrer-policy"):
            if header not in response["headers"]:
                issues.append(_issue(f"missing_{header}", "low", "headers", f"Thiếu header bảo mật {header}."))

        inspected, html_issues = _inspect_html(response["body"], content_type, current)
        issues.extend(html_issues)
        return {
            "ok": True,
            "execution_status": "completed",
            "url": raw_url,
            "final_url": current,
            "status_code": status,
            "http_reason": response["reason"],
            "content_type": content_type,
            "bytes_read": len(response["body"]),
            "resolved_ip": response["resolved_ip"],
            "redirects": redirects,
            "tls": response["tls"],
            "page_title": inspected.get("page_title", ""),
            "page_signals": inspected.get("page_signals", {}),
            "issues": issues,
            "scan_steps": _scan_steps(issues=issues),
            "elapsed_ms": round((time.perf_counter() - started) * 1000, 2),
        }

    raise RuntimeError("too_many_redirects")


def _failure(raw_url: str, code: str, detail: str, started: float) -> dict:
    messages = {
        "unsupported_scheme": "Sandbox chỉ cho phép URL HTTP hoặc HTTPS.",
        "missing_hostname": "URL không có tên miền hợp lệ.",
        "credentials_in_url": "URL chứa thông tin đăng nhập và đã bị chặn.",
        "invalid_port": "Cổng trong URL không hợp lệ.",
        "private_network_blocked": "Sandbox đã chặn địa chỉ nội bộ hoặc IP không công khai.",
        "dns_error": "Không phân giải được tên miền.",
        "tls_certificate_error": "Chứng chỉ TLS không hợp lệ hoặc không khớp tên miền.",
        "timeout": "Trang không phản hồi trong thời gian cho phép.",
        "connection_refused": "Máy chủ từ chối kết nối.",
        "redirect_loop": "Phát hiện vòng lặp chuyển hướng.",
        "too_many_redirects": "Trang chuyển hướng quá số lần cho phép.",
        "network_error": "Không thể kết nối đến trang web.",
        "worker_error": "Sandbox gặp lỗi khi phân tích trang.",
    }
    return {
        "ok": False,
        "execution_status": "failed",
        "url": raw_url,
        "final_url": "",
        "status_code": None,
        "http_reason": "",
        "content_type": "",
        "bytes_read": 0,
        "resolved_ip": "",
        "redirects": [],
        "tls": {},
        "page_title": "",
        "page_signals": {},
        "issues": [_issue(code, "high", "execution", messages.get(code, messages["worker_error"]), detail[:500])],
        "scan_steps": _scan_steps(code, detail),
        "elapsed_ms": round((time.perf_counter() - started) * 1000, 2),
    }


def main() -> None:
    if hasattr(sys.stdin, "reconfigure"):
        sys.stdin.reconfigure(encoding="utf-8")
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    started = time.perf_counter()
    raw_url = ""
    try:
        payload = json.loads(sys.stdin.read())
        raw_url = str(payload.get("url", ""))
        result = run(payload)
    except PermissionError as exc:
        result = _failure(raw_url, "private_network_blocked", str(exc), started)
    except socket.gaierror as exc:
        result = _failure(raw_url, "dns_error", str(exc), started)
    except ssl.SSLCertVerificationError as exc:
        result = _failure(raw_url, "tls_certificate_error", str(exc), started)
    except TimeoutError as exc:
        result = _failure(raw_url, "timeout", str(exc), started)
    except ConnectionRefusedError as exc:
        result = _failure(raw_url, "connection_refused", str(exc), started)
    except ValueError as exc:
        result = _failure(raw_url, str(exc), str(exc), started)
    except RuntimeError as exc:
        code = str(exc) if str(exc) in {"redirect_loop", "too_many_redirects"} else "worker_error"
        result = _failure(raw_url, code, str(exc), started)
    except (OSError, http.client.HTTPException) as exc:
        result = _failure(raw_url, "network_error", f"{type(exc).__name__}: {exc}", started)
    except Exception as exc:
        result = _failure(raw_url, "worker_error", f"{type(exc).__name__}: {exc}", started)
    sys.stdout.write(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
