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
        report, _ = await self.analyze_url_detailed(url, prefer_browser=True)
        return report

    async def analyze_url_detailed(
        self,
        url: str,
        *,
        prefer_browser: bool,
    ) -> tuple[SandboxReport, tuple[tuple[object, bool], ...]]:
        """Return the UI report and every raw result used by Risk Core.

        Balanced scans perform live HTTP/HTML inspection. Advanced scans execute
        both HTTP and browser sandboxes so browser success does not hide static
        form, header, certificate or policy-page evidence.
        """
        if not prefer_browser:
            url_result = await asyncio.to_thread(self.url_runner.inspect, url)
            return self._from_url(url_result), ((url_result, False),)

        browser_result, url_result = await asyncio.gather(
            asyncio.to_thread(self.browser_runner.inspect, url, "dry_run"),
            asyncio.to_thread(self.url_runner.inspect, url),
        )
        browser_report = self._from_browser(browser_result)
        http_report = self._from_url(url_result)
        report = self._merge_reports(browser_report, http_report)
        if not browser_result.ok:
            browser_error = (
                browser_result.issues[0].message
                if browser_result.issues
                else "Browser sandbox failed"
            )
            report.error = f"Browser sandbox: {browser_error}"
            if not url_result.ok:
                report.error += f"; HTTP sandbox: {http_report.error or 'failed'}"
        return report, ((url_result, False), (browser_result, True))

    @staticmethod
    def _merge_reports(primary: SandboxReport, secondary: SandboxReport) -> SandboxReport:
        behaviors: list[dict] = []
        seen_behaviors: set[tuple[str, str]] = set()
        for item in [*primary.behaviors, *secondary.behaviors]:
            key = (str(item.get("code", "")), str(item.get("message", "")))
            if key not in seen_behaviors:
                seen_behaviors.add(key)
                behaviors.append(item)
        return SandboxReport(
            analysis_mode="browser_http",
            behaviors=behaviors,
            redirects=[*primary.redirects, *secondary.redirects],
            scripts_executed=list(dict.fromkeys([*primary.scripts_executed, *secondary.scripts_executed])),
            network_calls=list(dict.fromkeys([*primary.network_calls, *secondary.network_calls])),
            dom_modifications=[*primary.dom_modifications, *secondary.dom_modifications],
            cookies_set=[*primary.cookies_set, *secondary.cookies_set],
            storage_access=[*primary.storage_access, *secondary.storage_access],
            page_identity=primary.page_identity or secondary.page_identity,
            screenshot_data_url=primary.screenshot_data_url or secondary.screenshot_data_url,
            analysis_time_ms=max(primary.analysis_time_ms, secondary.analysis_time_ms),
            error=primary.error if secondary.error else secondary.error if primary.error else None,
        )

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
            analysis_mode="browser",
            behaviors=behaviors,
            redirects=redirects,
            scripts_executed=list(dict.fromkeys(scripts)),
            network_calls=list(dict.fromkeys(network_calls)),
            dom_modifications=dom_modifications,
            cookies_set=[],
            storage_access=[],
            page_identity={
                **(getattr(result, "page_identity", {}) or {}),
                "page_title": getattr(result, "page_title", ""),
                "final_url": getattr(result, "final_url", ""),
                "status_code": getattr(result, "status_code", None),
            },
            screenshot_data_url=getattr(result, "screenshot_data_url", None),
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
            analysis_mode="http",
            behaviors=behaviors,
            redirects=[redirect.model_dump() for redirect in result.redirects],
            scripts_executed=scripts,
            network_calls=[],
            dom_modifications=[],
            cookies_set=[],
            storage_access=[],
            page_identity={},
            screenshot_data_url=None,
            analysis_time_ms=round(result.elapsed_ms),
            error=None if result.ok else (result.issues[0].message if result.issues else "HTTP sandbox failed"),
        )


sandbox_runner = SandboxRunner()
