"""Backward compatibility tests for the additive Risk Core v2 API payload."""

from backend.services.risk_core_mapper import risk_core_trace_from_mapping
from backend.services.scan_log_service import _audit_metadata
from shared.schemas import AssessResponse, Decision, Modality, RiskCoreTrace, RiskLevel


def _legacy_response() -> AssessResponse:
    return AssessResponse(
        risk_score=0.42,
        risk_level=RiskLevel.MEDIUM,
        decision=Decision.WARN,
        confidence=0.71,
        modality=Modality.URL,
    )


def test_legacy_assess_response_remains_valid_without_v2_payload() -> None:
    result = _legacy_response()

    assert result.risk_score == 0.42
    assert result.confidence == 0.71
    assert result.risk_core is None
    assert result.schema_version == "1"


def test_v2_payload_has_explicit_independent_score_scale() -> None:
    trace = RiskCoreTrace(
        scoring_version="risk-core-v2",
        raw_score=63.5,
        final_score=58.0,
        confidence=84.0,
        verdict="warn",
        criteria=[{"id": "content", "score": 63.5, "status": "available"}],
        risk_score=58.0,
        confidence_score=84.0,
        unavailable_checks=["external_reputation"],
    )
    result = _legacy_response().model_copy(
        update={"schema_version": "2", "scoring_version": trace.scoring_version, "risk_core": trace}
    )

    payload = result.model_dump(mode="json")
    assert payload["risk_score"] == 0.42
    assert payload["risk_core"]["score_scale"] == "0..100"
    assert payload["risk_core"]["final_score"] == 58.0
    assert payload["risk_core"]["confidence"] == 84.0
    assert payload["risk_core"]["criteria"][0]["id"] == "content"
    assert payload["risk_core"]["risk_score"] == payload["risk_core"]["final_score"]
    assert payload["risk_core"]["unavailable_checks"] == ["external_reputation"]


def test_v2_audit_metadata_is_additive_and_serializable() -> None:
    trace = RiskCoreTrace(
        scoring_version="risk-core-v2",
        raw_score=63.5,
        final_score=58.0,
        confidence=84.0,
        verdict="warn",
    )
    result = _legacy_response().model_copy(
        update={"schema_version": "2", "scoring_version": trace.scoring_version, "risk_core": trace}
    )

    metadata = _audit_metadata(result, {"channel": "api"})
    assert metadata["channel"] == "api"
    assert metadata["schema_version"] == "2"
    assert metadata["risk_core"]["score_scale"] == "0..100"
    assert metadata["risk_core"]["final_score"] == 58.0


def test_mapper_populates_stable_score_aliases() -> None:
    trace = risk_core_trace_from_mapping(
        {
            "scoring_version": "risk-core-v2",
            "raw_score": 63.5,
            "final_score": 58.0,
            "confidence": 84.0,
            "verdict": "warn",
        }
    )

    assert trace.risk_score == 58.0
    assert trace.confidence_score == 84.0
    assert trace.criteria == []
