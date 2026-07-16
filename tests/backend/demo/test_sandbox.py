import pytest

from backend.demo.sandbox import SandboxRunner
from shared.schemas import (
    BrowserSandboxURLResponse,
    SandboxIssue,
    SandboxNetworkEvent,
    Severity,
)


class FakeRunner:
    def inspect(self, url: str, canary_mode: str) -> BrowserSandboxURLResponse:
        assert canary_mode == "dry_run"
        return BrowserSandboxURLResponse(
            ok=True,
            execution_status="completed",
            url=url,
            final_url=url,
            elapsed_ms=12.6,
            network_events=[
                SandboxNetworkEvent(url="https://example.com/app.js", resource_type="script")
            ],
            issues=[
                SandboxIssue(
                    code="password_form",
                    severity=Severity.HIGH,
                    category="content",
                    message="Password form detected",
                )
            ],
        )


@pytest.mark.asyncio
async def test_demo_sandbox_maps_real_browser_result() -> None:
    report = await SandboxRunner(FakeRunner()).analyze_url("https://example.com")  # type: ignore[arg-type]
    assert report.error is None
    assert report.analysis_time_ms == 13
    assert report.scripts_executed == ["https://example.com/app.js"]
    assert report.behaviors[0]["code"] == "password_form"
