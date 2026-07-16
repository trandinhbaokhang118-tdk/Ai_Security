"""Adapter from the process-isolated browser sandbox to demo response models."""

from __future__ import annotations

import asyncio

from backend.demo.models import SandboxReport
from security.browser_sandbox import BrowserSandboxRunner


class SandboxRunner:
    """Run deep demo analysis in the same isolated worker used by the public API."""

    def __init__(self, runner: BrowserSandboxRunner | None = None) -> None:
        self.runner = runner or BrowserSandboxRunner()

    async def analyze_url(self, url: str) -> SandboxReport:
        result = await asyncio.to_thread(self.runner.inspect, url, "dry_run")
        behaviors = [
            {
                "code": issue.code,
                "category": issue.category,
                "severity": issue.severity.value,
                "message": issue.message,
                "detail": issue.detail,
            }
            for issue in result.issues
        ]
        redirects = [
            event
            for event in result.browser_events
            if event.get("type") in {"redirect", "navigation"}
        ]
        scripts = [
            event.url
            for event in result.network_events
            if event.resource_type == "script" and event.url
        ]
        network_calls = [event.url for event in result.network_events if event.url]
        dom_modifications = [
            event for event in result.browser_events if event.get("type") == "dom_mutation"
        ]
        error = None
        if not result.ok:
            error = result.issues[0].message if result.issues else "Browser sandbox failed"

        return SandboxReport(
            behaviors=behaviors,
            redirects=redirects,
            scripts_executed=list(dict.fromkeys(scripts)),
            network_calls=list(dict.fromkeys(network_calls)),
            dom_modifications=dom_modifications,
            cookies_set=[],
            storage_access=[],
            analysis_time_ms=round(result.elapsed_ms),
            error=error,
        )


sandbox_runner = SandboxRunner()
