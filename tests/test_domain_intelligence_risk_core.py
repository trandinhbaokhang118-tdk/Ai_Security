from security.domain_intelligence import DomainIntelligence, DomainIntelligenceService
from security.risk_core import CriterionStatus, default_config
from security.risk_core.detectors import (
    ScanObservations,
    add_domain_intelligence,
    build_criteria_evidence,
)


def _intel(**overrides):
    values = dict(
        domain="example.test", age_days=20, created_at="2026-01-01",
        registrar="Example Registrar", reputation_status="not_listed",
        reputation_source="urlscan.io", listed=False, score=0.2,
        reasons=(), available=True, expiry_days=10, certificate_age_days=3,
    )
    values.update(overrides)
    return DomainIntelligence(**values)


def test_expiry_and_certificate_observations_activate_criteria():
    obs = ScanObservations("https://example.test")
    add_domain_intelligence(obs, _intel())
    by_id = {e.criterion_id: e for e in build_criteria_evidence(obs, default_config())}
    assert by_id[1].status == CriterionStatus.MALICIOUS
    assert by_id[2].status == CriterionStatus.MALICIOUS
    assert by_id[9].status == CriterionStatus.SUSPICIOUS
    assert by_id[3].status == CriterionStatus.UNAVAILABLE


def test_missing_expiry_is_not_reported_clean():
    obs = ScanObservations("https://example.test")
    add_domain_intelligence(obs, _intel(expiry_days=None, certificate_age_days=None))
    by_id = {e.criterion_id: e for e in build_criteria_evidence(obs, default_config())}
    assert by_id[2].status == CriterionStatus.UNAVAILABLE
    assert by_id[9].status == CriterionStatus.UNAVAILABLE


def test_rdap_expiration_parser():
    rdap = {"events": [{"eventAction": "expiration", "eventDate": "2099-01-01T00:00:00Z"}]}
    assert DomainIntelligenceService._expiry_days(None, None, rdap) > 1000
