from __future__ import annotations

from security import sandbox_worker
from security.url_sandbox import URLSandboxRunner


def test_runner_blocks_private_network() -> None:
    result = URLSandboxRunner(process_timeout_seconds=4).inspect("http://127.0.0.1:8000")

    assert result.ok is False
    assert result.execution_status == "failed"
    assert result.issues[0].code == "private_network_blocked"
    assert any(step.status == "failed" for step in result.scan_steps)


def test_worker_reports_live_html_signals(monkeypatch) -> None:
    html = b"""
        <html><head><title>Secure account verification</title></head>
        <body>
          <p>Verify your account. Act now.</p>
          <form action="https://collector.example/submit">
            <input name="user"><input type="password" name="password">
          </form>
          <iframe src="https://tracker.example/frame"></iframe>
        </body></html>
    """

    def fake_request(url: str, timeout: float, max_bytes: int) -> dict:
        return {
            "status": 200,
            "reason": "OK",
            "headers": {"content-type": "text/html; charset=utf-8"},
            "body": html,
            "truncated": False,
            "resolved_ip": "93.184.216.34",
            "tls": {"protocol": "TLSv1.3"},
        }

    monkeypatch.setattr(sandbox_worker, "_request_once", fake_request)
    result = sandbox_worker.run({"url": "https://safe.example/login"})
    codes = {issue["code"] for issue in result["issues"]}

    assert result["ok"] is True
    assert result["status_code"] == 200
    assert result["page_title"] == "Secure account verification"
    assert result["page_signals"]["password_inputs"] == 1
    assert {"password_form", "external_form_action", "external_iframe"} <= codes
    html_step = next(step for step in result["scan_steps"] if step["key"] == "inspect_html")
    assert html_step["status"] == "failed"


def test_worker_follows_and_records_redirect(monkeypatch) -> None:
    responses = iter(
        [
            {
                "status": 302,
                "reason": "Found",
                "headers": {"location": "/landing"},
                "body": b"",
                "truncated": False,
                "resolved_ip": "93.184.216.34",
                "tls": {},
            },
            {
                "status": 404,
                "reason": "Not Found",
                "headers": {"content-type": "text/html"},
                "body": b"<title>Missing</title>",
                "truncated": False,
                "resolved_ip": "93.184.216.34",
                "tls": {},
            },
        ]
    )
    monkeypatch.setattr(sandbox_worker, "_request_once", lambda *args: next(responses))

    result = sandbox_worker.run({"url": "https://example.com/start"})

    assert result["final_url"] == "https://example.com/landing"
    assert result["redirects"][0]["status_code"] == 302
    assert any(issue["code"] == "http_client_error" for issue in result["issues"])
    response_step = next(step for step in result["scan_steps"] if step["key"] == "inspect_response")
    assert response_step["status"] == "failed"
