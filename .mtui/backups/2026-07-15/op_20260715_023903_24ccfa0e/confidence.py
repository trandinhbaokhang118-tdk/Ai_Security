"""Confidence is evidence quality, never a hidden risk contribution."""
from __future__ import annotations

from .types import ConfidenceComponents, CriterionResult, EvidenceV2, ProviderVerdict


def compute_confidence(criteria: list[CriterionResult], evidence: list[EvidenceV2]) -> ConfidenceComponents:
    denominator = sum(c.coverage_weight for c in criteria)
    observed = sum(c.coverage_weight for c in criteria if c.status.value in {"clean", "suspicious", "malicious"})
    coverage = observed / denominator if denominator else 0.0
    usable = [e for e in evidence if e.evidence_quality > 0 and e.provider_verdict not in {ProviderVerdict.UNKNOWN, ProviderVerdict.UNAVAILABLE, ProviderVerdict.NOT_OBSERVED}]
    organizations = {e.organization_id for e in usable if e.organization_id and e.independence_coefficient > 0}
    if len(organizations) < 2:
        agreement = 0.0
    else:
        bad = sum(e.evidence_quality for e in usable if e.provider_verdict in {ProviderVerdict.MALICIOUS, ProviderVerdict.SUSPICIOUS})
        benign = sum(e.evidence_quality for e in usable if e.provider_verdict == ProviderVerdict.CLEAN)
        agreement = abs(bad - benign) / (bad + benign) if bad + benign else 0.0
    freshness = sum(e.freshness_factor * e.evidence_quality for e in usable) / sum(e.evidence_quality for e in usable) if usable else 0.0
    score = 100 * (0.45 * coverage + 0.35 * agreement + 0.20 * freshness)
    return ConfidenceComponents(coverage, agreement, freshness, min(100.0, max(0.0, score)))
