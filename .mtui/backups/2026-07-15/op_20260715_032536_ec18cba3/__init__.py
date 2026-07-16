"""Deterministic CoreGuide v2 Risk and Policy Engine public API."""

from .config import CriterionConfig, RiskConfig, SourceConfig, default_config
from .engine import assess
from .normalization import make_finding_key, make_incident_key, normalize_url
from .overrides import OverrideRule
from .policy import PolicyEngineV2
from .types import (
    AdapterStatus,
    ConfidenceComponents,
    CriterionResult,
    CriterionStatus,
    EvidenceV2,
    ExternalAward,
    MatchedSubject,
    NextAction,
    OverrideResult,
    PolicyDecision,
    PolicyProfile,
    PolicyResult,
    ProviderVerdict,
    RiskResultV2,
    SubjectKeys,
)


def default_risk_config() -> RiskConfig:
    return default_config()


def validate_config(config: RiskConfig) -> None:
    config.validate()


class RiskEngineV2:
    """Small stable facade over deterministic two-phase evidence scoring."""

    def __init__(self, config: RiskConfig | None = None) -> None:
        self.config = config or default_config()
        self.config.validate()

    def evaluate(
        self,
        evidence: list[EvidenceV2],
        *,
        override_rules: tuple[OverrideRule, ...] = (),
    ) -> RiskResultV2:
        return assess(evidence, config=self.config, override_rules=override_rules)


__all__ = [
    "AdapterStatus",
    "ConfidenceComponents",
    "CriterionConfig",
    "CriterionResult",
    "CriterionStatus",
    "EvidenceV2",
    "ExternalAward",
    "MatchedSubject",
    "NextAction",
    "OverrideResult",
    "OverrideRule",
    "PolicyDecision",
    "PolicyEngineV2",
    "PolicyProfile",
    "PolicyResult",
    "ProviderVerdict",
    "RiskConfig",
    "RiskEngineV2",
    "RiskResultV2",
    "SourceConfig",
    "SubjectKeys",
    "assess",
    "default_config",
    "default_risk_config",
    "make_finding_key",
    "make_incident_key",
    "normalize_url",
    "validate_config",
]
