import pytest

from backend.demo.sandbox import SandboxRunner
from shared.schemas import (
    BrowserSandboxURLResponse,
    SandboxIssue,
    SandboxNetworkEvent,
    SandboxURLResponse,
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
            page_title="Example Security Portal",
            page_identity={"phones": ["0901234567"], "forms": 1},
            screenshot_data_url="data:image/jpeg;base64,dGVzdA==",
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


class FakeURLRunner:
    def inspect(self, url: str) -> SandboxURLResponse:
        return SandboxURLResponse(
            ok=True,
            execution_status="completed",
            url=url,
            final_url=url,
            elapsed_ms=4.0,
        )


@pytest.mark.asyncio
async def test_demo_sandbox_maps_real_browser_result() -> None:
    report = await SandboxRunner(FakeRunner(), FakeURLRunner()).analyze_url("https://example.com")  # type: ignore[arg-type]
    assert report.error is None
    assert report.analysis_time_ms == 13
    assert report.scripts_executed == ["https://example.com/app.js"]
    assert report.behaviors[0]["code"] == "password_form"
    assert report.page_identity["page_title"] == "Example Security Portal"
    assert report.page_identity["phones"] == ["0901234567"]
    assert report.screenshot_data_url == "data:image/jpeg;base64,dGVzdA=="


@pytest.mark.asyncio
async def test_balanced_scan_runs_http_without_browser() -> None:
    class BrowserMustNotRun(FakeRunner):
        def inspect(self, url: str, canary_mode: str) -> BrowserSandboxURLResponse:
            raise AssertionError("balanced scan must not start the browser")

    report, sources = await SandboxRunner(
        BrowserMustNotRun(), FakeURLRunner()
    ).analyze_url_detailed("https://example.com", prefer_browser=False)  # type: ignore[arg-type]

    assert report.error is None
    assert len(sources) == 1
    assert sources[0][1] is False
