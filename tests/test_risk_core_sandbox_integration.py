from backend.services.inference_service import InferenceService
from security.risk_core import CriterionStatus
from shared.schemas import SandboxIssue, SandboxURLResponse, Severity


def test_http_sandbox_report_is_scored_by_risk_core():
    report = SandboxURLResponse(
        ok=True, execution_status="completed", url="https://example.test",
        issues=[
            SandboxIssue(code="urgency_language", severity=Severity.MEDIUM,
                         category="content", message="Urgent action requested"),
            SandboxIssue(code="external_form_action", severity=Severity.CRITICAL,
                         category="content", message="Form posts cross-origin"),
        ],
    )
    trace = InferenceService().assess_sandbox_report(report.url, report)
    by_id = {item["criterion_id"]: item for item in trace.criteria}
    assert by_id[28]["status"] in {CriterionStatus.SUSPICIOUS, CriterionStatus.MALICIOUS}
    assert by_id[30]["status"] == CriterionStatus.MALICIOUS
    assert trace.internal_score > 0


def test_failed_sandbox_is_unavailable_not_clean():
    report = SandboxURLResponse.failed("https://example.test", "timeout", "Timed out")
    trace = InferenceService().assess_sandbox_report(report.url, report)
    by_id = {item["criterion_id"]: item for item in trace.criteria}
    assert by_id[30]["status"] == CriterionStatus.UNAVAILABLE
    assert by_id[30]["adjusted_score"] == 0
