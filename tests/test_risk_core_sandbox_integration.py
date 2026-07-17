from backend.services.inference_service import InferenceService
from security.dns_intelligence import DNSIntelligence
from security.domain_intelligence import DomainIntelligence
from security.ip_intelligence import IPIntelligence
from security.risk_core import CriterionStatus, default_config
from security.risk_core.detectors import (
    ScanObservations,
    add_browser_sandbox,
    add_cross_source_intelligence,
    add_dns_intelligence,
    add_domain_intelligence,
    add_http_sandbox,
    build_criteria_evidence,
)
from security.scan_history import LocalScanHistory
from shared.schemas import (
    BrowserSandboxURLResponse,
    SandboxIssue,
    SandboxURLResponse,
    Severity,
)


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


def test_advanced_scan_completes_requested_criteria_without_fabricating_clean(tmp_path):
    url = "https://shop.example.test"
    domain = DomainIntelligence(
        domain="example.test",
        age_days=800,
        created_at="2024-01-01T00:00:00Z",
        registrar="Example Registrar",
        reputation_status="not_listed",
        reputation_source="urlscan.io",
        listed=False,
        score=0.0,
        reasons=(),
        available=True,
        expiry_days=400,
        certificate_age_days=700,
        registrant=None,
        registration_available=True,
        reputation_ips=("203.0.113.10",),
    )
    dns = DNSIntelligence(
        "shop.example.test",
        ("203.0.113.10",),
        ("ns1.example.test",),
        (),
        False,
        False,
        False,
        True,
        (),
    )
    ip = IPIntelligence(
        ip="203.0.113.10",
        country="Viet Nam",
        country_code="VN",
        available=True,
        status="completed",
    )
    http = SandboxURLResponse(
        ok=True,
        execution_status="completed",
        url=url,
        page_title="Example information page",
        page_signals={
            "is_commercial": False,
            "social_links": [],
            "review_context": False,
            "metadata": {"description": "Example"},
            "content_fingerprint": "content-a",
        },
    )
    browser = BrowserSandboxURLResponse(
        ok=True,
        execution_status="completed",
        url=url,
        page_title="Example information page",
        page_identity={
            "site_name": "Example",
            "is_commercial": False,
            "social_links": [],
            "addresses": [],
            "content_fingerprint": "content-a",
        },
        visual_analysis={"status": "no_reference", "dhash64": "0123456789abcdef"},
    )
    observations = ScanObservations(url)
    add_domain_intelligence(observations, domain)
    add_dns_intelligence(observations, dns)
    add_http_sandbox(observations, http)
    add_browser_sandbox(observations, browser)
    add_cross_source_intelligence(
        observations,
        domain_intelligence=domain,
        dns_intelligence=dns,
        ip_intelligence=ip,
        sandbox_reports=((http, False), (browser, True)),
        history_store=LocalScanHistory(tmp_path / "history.json"),
    )
    by_id = {
        item.criterion_id: item
        for item in build_criteria_evidence(observations, default_config())
    }
    requested = {
        2, 3, 4, 13, 14, 19, 21, 22, 23, 27, 31, 32, 33, 35, 37,
        38, 39, 40, 41, 42, 43, 44, 46, 47, 48, 49,
    }
    incomplete = {CriterionStatus.NOT_CHECKED, CriterionStatus.UNAVAILABLE}
    assert not {criterion for criterion in requested if by_id[criterion].status in incomplete}
    assert by_id[3].status == CriterionStatus.NOT_APPLICABLE
    assert by_id[14].status == CriterionStatus.NOT_APPLICABLE
    assert by_id[44].status == CriterionStatus.NOT_APPLICABLE
