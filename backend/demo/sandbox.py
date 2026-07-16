"""Adapter from isolated URL/browser sandboxes to demo response models."""

from __future__ import annotations

import asyncio

from backend.demo.models import SandboxReport
from security.browser_sandbox import BrowserSandboxRunner
from security.url_sandbox import URLSandboxRunner


class SandboxRunner:
    """Run layered deep analysis, falling back to safe HTTP inspection if needed."""

    def __init__(
        self,
        browser_runner: BrowserSandboxRunner | None = None,
        url_runner: URLSandboxRunner | None = None,
    ) -> None:
        self.browser_runner = browser_runner or BrowserSandboxRunner()
        self.url_runner = url_runner or URLSandboxRunner()

    async def analyze_url(self, url: str) -> SandboxReport:
        browser_result = await asyncio.to_thread(self.browser_runner.inspect, url, "dry_run")
        if browser_result.ok:
            return self._from_browser(browser_result)

        # Playwright/browser binaries are optional in local and production deployments.
        # Still perform a process-isolated, SSRF-protected live HTTP inspection rather
        # than presenting the whole deep scan as unavailable.
        url_result = await asyncio.to_thread(self.url_runner.inspect, url)
        report = self._from_url(url_result)
        if not url_result.ok:
            browser_error = browser_result.issues[0].message if browser_result.issues else "Browser sandbox failed"
            report.error = f"Browser sandbox: {browser_error}; HTTP sandbox: {report.error or 'failed'}"
        return report

    @staticmethod
    def _from_browser(result) -> SandboxReport:
        behaviors = [
            {"code": issue.code, "category": issue.category, "severity": issue.severity.value,
             "message": issue.message, "detail": issue.detail}
            for issue in result.issues
        ]
        redirects = [event for event in result.browser_events if event.get("type") in {"redirect", "navigation"}]
        scripts = [event.url for event in result.network_events if event.resource_type == "script" and event.url]
        network_calls = [event.url for event in result.network_events if event.url]
        dom_modifications = [event for event in result.browser_events if event.get("type") == "dom_mutation"]
        return SandboxReport(
            behaviors=behaviors,
            redirects=redirects,
            scripts_executed=list(dict.fromkeys(scripts)),
            network_calls=list(dict.fromkeys(network_calls)),
            dom_modifications=dom_modifications,
            cookies_set=[],
            storage_access=[],
            analysis_time_ms=round(result.elapsed_ms),
            error=None,
        )

    @staticmethod
    def _from_url(result) -> SandboxReport:
        behaviors = [
            {"code": issue.code, "category": issue.category, "severity": issue.severity.value,
             "message": issue.message, "detail": issue.detail}
            for issue in result.issues
        ]
        page_signals = result.page_signals or {}
        scripts = [f"observed:{count}" for name, count in (
            ("scripts", page_signals.get("scripts", 0)),
            ("external_scripts", page_signals.get("external_scripts", 0)),
        ) if count]
        return SandboxReport(
            behaviors=behaviors,
            redirects=[redirect.model_dump() for redirect in result.redirects],
            scripts_executed=scripts,
            network_calls=[],
            dom_modifications=[],
            cookies_set=[],
            storage_access=[],
            analysis_time_ms=round(result.elapsed_ms),
            error=None if result.ok else (result.issues[0].message if result.issues else "HTTP sandbox failed"),
        )


sandbox_runner = SandboxRunner()
