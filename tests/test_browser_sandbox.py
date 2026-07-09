from __future__ import annotations

import socket

from security import browser_sandbox_worker
from security.browser_sandbox import BrowserSandboxRunner


def test_browser_runner_blocks_private_network_before_navigation() -> None:
    result = BrowserSandboxRunner(process_timeout_seconds=6).inspect("http://127.0.0.1:8000")

    assert result.ok is False
    assert result.execution_status == "failed"
    assert result.issues[0].code == "private_network_blocked"
    assert any(step.status == "failed" for step in result.scan_steps)


def test_payload_contains_canary_values() -> None:
    canary = {
        "email": "clone-test@example.invalid",
        "username": "clone_test",
        "password": "ASArmor-test-canary",
        "otp": "123456",
        "phone": "0900000000",
    }

    assert browser_sandbox_worker._payload_contains_canary("otp=123456", canary) is True
    assert browser_sandbox_worker._payload_contains_canary({"email": canary["email"]}, canary)
    assert browser_sandbox_worker._payload_contains_canary("ordinary payload", canary) is False


def test_browser_signal_issues_include_otp_password_and_canary_exfil() -> None:
    canary = {
        "email": "clone-test@example.invalid",
        "username": "clone_test",
        "password": "ASArmor-test-canary",
        "otp": "123456",
        "phone": "0900000000",
    }
    fill_report = {
        "fields": [{"kind": "email"}, {"kind": "password"}, {"kind": "otp"}],
        "forms": [{"external": True, "action": "https://collector.example/login"}],
    }
    browser_events = [{"type": "form_submit_blocked", "body": "otp=123456"}]
    network_events = [
        {"reason": "canary_payload_blocked", "url": "https://collector.example/login"}
    ]

    issues = browser_sandbox_worker._issues_from_signals(
        fill_report,
        browser_events,
        network_events,
        canary,
    )
    codes = {issue["code"] for issue in issues}

    assert {
        "otp_input_detected",
        "password_input_detected",
        "cross_origin_form_action",
        "canary_exfiltration_blocked",
        "form_submission_blocked",
    } <= codes
    steps = browser_sandbox_worker._scan_steps(issues=issues)
    by_key = {step["key"]: step for step in steps}
    assert by_key["probe_forms"]["status"] == "failed"
    assert by_key["inspect_events"]["status"] == "failed"


def test_pinned_egress_proxy_blocks_private_connect_targets() -> None:
    with browser_sandbox_worker._PinnedEgressProxy() as proxy:
        with socket.create_connection(proxy.server.server_address, timeout=3) as connection:
            connection.sendall(
                b"CONNECT 127.0.0.1:8000 HTTP/1.1\r\nHost: 127.0.0.1:8000\r\n\r\n"
            )
            response = connection.recv(1024)

        events = proxy.events

    assert b"403 Sandbox Blocked" in response
    assert any(event["reason"] == "private_network_blocked" for event in events)


def test_browser_launch_blocks_service_workers_and_direct_network_paths() -> None:
    captured: dict = {}
    expected_context = object()

    class Chromium:
        def launch_persistent_context(self, user_data_dir, **kwargs):
            captured.update(kwargs)
            return expected_context

    class Playwright:
        chromium = Chromium()

    context = browser_sandbox_worker._launch_browser(
        Playwright(),
        "temporary-profile",
        "http://127.0.0.1:43210",
    )

    assert context is expected_context
    assert captured["service_workers"] == "block"
    assert captured["proxy"] == {"server": "http://127.0.0.1:43210"}
    assert "--disable-quic" in captured["args"]
    assert "--force-webrtc-ip-handling-policy=disable_non_proxied_udp" in captured["args"]


def test_websocket_attempt_is_reported_as_blocked() -> None:
    issues = browser_sandbox_worker._issues_from_signals(
        {"fields": [], "forms": []},
        [{"type": "websocket_blocked", "url": "wss://collector.example"}],
        [],
        {"email": "clone@example.invalid"},
    )

    assert "websocket_request_blocked" in {issue["code"] for issue in issues}
