from security.risk_core import default_config
from security.risk_core.detectors import (
    CRITERION_FIELDS,
    ScanObservations,
    add_structured_snapshot,
    build_criteria_evidence,
)
from security.risk_core.external_adapters import SPECS, collect_external
from security.risk_core.types import CriterionStatus, ProviderVerdict


def test_every_internal_criterion_has_typed_collector_field():
    assert set(CRITERION_FIELDS) == set(range(1, 50))
    assert len(set(CRITERION_FIELDS.values())) == 49


def test_snapshot_emits_all_50_criterion_statuses_without_fabricating_clean():
    obs = ScanObservations("https://example.com")
    add_structured_snapshot(
        obs,
        {
            "domain_expiry": {
                "status": "suspicious",
                "severity": 0.5,
                "quality": 0.8,
                "summary": "Short registration period",
            },
            "privacy_policy": {"status": "clean"},
            "business_address": {"status": "not_applicable", "summary": "Personal blog"},
        },
    )
    evidence = build_criteria_evidence(obs, default_config())
    assert {item.criterion_id for item in evidence} == set(range(1, 51))
    by_id = {item.criterion_id: item for item in evidence}
    assert by_id[2].status == CriterionStatus.SUSPICIOUS
    assert by_id[24].status == CriterionStatus.CLEAN
    assert by_id[22].status == CriterionStatus.NOT_APPLICABLE
    assert by_id[23].status == CriterionStatus.NOT_CHECKED


def test_all_external_adapters_exist_and_unconfigured_is_not_no_hit(monkeypatch):
    for spec in SPECS:
        monkeypatch.delenv(spec.endpoint_env, raising=False)
        monkeypatch.delenv(spec.key_env, raising=False)
        if spec.enable_env:
            monkeypatch.delenv(spec.enable_env, raising=False)
    monkeypatch.delenv("GOOGLE_SAFE_BROWSING_API_KEY", raising=False)
    evidence = collect_external("https://example.com", default_config())
    assert len(evidence) == 14
    assert {item.source_id for item in evidence} == {str(i) for i in range(51, 65)}
    assert all(item.status == CriterionStatus.NOT_CHECKED for item in evidence)
    assert all(item.provider_verdict == ProviderVerdict.UNKNOWN for item in evidence)
