from security.dns_intelligence import DNSIntelligence, DNSIntelligenceService
from security.risk_core import CriterionStatus, default_config
from security.risk_core.detectors import (
    ScanObservations,
    add_dns_intelligence,
    build_criteria_evidence,
)


def test_email_security_missing_controls_is_risk():
    intel = DNSIntelligence("example.test", ("203.0.113.1",), ("ns.example",),
                            ("mx.example",), True, False, False, True, ())
    obs = ScanObservations("https://example.test")
    add_dns_intelligence(obs, intel)
    by_id = {e.criterion_id: e for e in build_criteria_evidence(obs, default_config())}
    assert by_id[45].status == CriterionStatus.SUSPICIOUS
    assert by_id[44].status == CriterionStatus.NOT_APPLICABLE


def test_no_mx_is_not_applicable_not_clean():
    intel = DNSIntelligence("example.test", ("203.0.113.1",), ("ns.example",),
                            (), False, False, False, True, ())
    obs = ScanObservations("https://example.test")
    add_dns_intelligence(obs, intel)
    by_id = {e.criterion_id: e for e in build_criteria_evidence(obs, default_config())}
    assert by_id[45].status == CriterionStatus.NOT_APPLICABLE


def test_doh_nxdomain_is_valid_no_hit(monkeypatch):
    class Response:
        def raise_for_status(self):
            return None
        def json(self):
            return {"Status": 3}
    monkeypatch.setattr("security.dns_intelligence.httpx.get", lambda *a, **k: Response())
    values, error = DNSIntelligenceService()._query("missing.test", "A")
    assert values == [] and error is None
