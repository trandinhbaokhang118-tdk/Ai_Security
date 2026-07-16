"""CoreGuide v2 confidence: coverage, weighted agreement and freshness."""

from __future__ import annotations

from .types import (
    ConfidenceComponents,
    CriterionResult,
    CriterionStatus,
    EvidenceV2,
    ProviderVerdict,
)

_NEUTRAL = {
    ProviderVerdict.NO_HIT,
    ProviderVerdict.UNKNOWN,
    ProviderVerdict.UNAVAILABLE,
    ProviderVerdict.NOT_OBSERVED,
}


def compute_confidence(
    criteria: list[CriterionResult], evidence: list[EvidenceV2]
) -> ConfidenceComponents:
    applicable = [
        c for c in criteria if c.criterion_id != 50 and c.status != CriterionStatus.NOT_APPLICABLE
    ]
    denominator = sum(c.coverage_weight for c in applicable)
    completed = {CriterionStatus.CLEAN, CriterionStatus.SUSPICIOUS, CriterionStatus.MALICIOUS}
    coverage = (
        sum(c.coverage_weight for c in applicable if c.status in completed) / denominator
        if denominator
        else 0.0
    )
    sm = sb = 0.0
    family_support = {}
    freshness_num = freshness_den = 0.0
    for e in evidence:
        if e.provider_verdict in _NEUTRAL or e.evidence_quality <= 0:
            continue
        support = (
            e.evidence_quality
            * e.independence_coefficient
            * e.freshness_factor
            * e.match_strength
            * min(1.0, max(0.25, e.authority_tier / 4))
        )
        if e.provider_verdict == ProviderVerdict.MALICIOUS:
            sm += support
        elif e.provider_verdict == ProviderVerdict.SUSPICIOUS:
            sm += 0.5 * support
        elif e.provider_verdict == ProviderVerdict.CLEAN:
            sb += support
        family_support[e.source_family] = family_support.get(e.source_family, 0.0) + support
        freshness_num += e.freshness_factor * e.evidence_quality
        freshness_den += e.evidence_quality
    volume = sm + sb
    consensus = max(sm, sb) / volume if volume else 0.0
    independent = sum(1 for value in family_support.values() if value >= 0.5)
    agreement = (
        consensus * (0.25 + 0.45 * min(1.0, independent / 3) + 0.30 * min(1.0, volume / 2))
        if volume
        else 0.0
    )
    freshness = freshness_num / freshness_den if freshness_den else 0.0
    score = 100 * (0.45 * coverage + 0.35 * agreement + 0.20 * freshness)
    return ConfidenceComponents(coverage, agreement, freshness, max(0.0, min(100.0, score)))
