"""Evidence resolution: retry/revision dedup, lineage dependence and conflicts."""

from __future__ import annotations

from dataclasses import replace

from .types import CriterionStatus, EvidenceV2, ProviderVerdict


def canonical_evidence(items: list[EvidenceV2]) -> EvidenceV2:
    return sorted(
        items,
        key=lambda e: (
            -e.authority_tier,
            -e.evidence_quality,
            -e.freshness_factor,
            e.source_id,
            e.evidence_id,
        ),
    )[0]


def resolve_evidence(items: list[EvidenceV2]) -> tuple[list[EvidenceV2], list[dict]]:
    by_finding: dict[str, list[EvidenceV2]] = {}
    for item in items:
        by_finding.setdefault(item.finding_key, []).append(item)
    resolved = [canonical_evidence(group) for group in by_finding.values()]
    resolved.sort(key=lambda e: (e.criterion_id or 999, e.incident_key, e.source_id, e.evidence_id))

    # Same organization/feed lineage is corroboration-dependent, never independent support.
    result: list[EvidenceV2] = []
    for item in resolved:
        dependent = any(
            prior.incident_key == item.incident_key
            and (
                prior.organization_id == item.organization_id
                or bool(set(prior.feed_lineage) & set(item.feed_lineage))
            )
            for prior in result
        )
        result.append(replace(item, independence_coefficient=0.0) if dependent else item)

    conflicts: list[dict] = []
    by_incident: dict[str, list[EvidenceV2]] = {}
    for item in result:
        by_incident.setdefault(item.incident_key, []).append(item)
    positive = {ProviderVerdict.MALICIOUS, ProviderVerdict.SUSPICIOUS}
    for incident, group in sorted(by_incident.items()):
        bad = [e.evidence_id for e in group if e.provider_verdict in positive]
        clean = [e.evidence_id for e in group if e.provider_verdict == ProviderVerdict.CLEAN]
        if bad and clean:
            conflicts.append(
                {
                    "incident_key": incident,
                    "malicious_evidence_ids": bad,
                    "clean_evidence_ids": clean,
                }
            )
    return result, conflicts


def eligible_risk_evidence(e: EvidenceV2) -> bool:
    if e.status in {
        CriterionStatus.NOT_APPLICABLE,
        CriterionStatus.NOT_CHECKED,
        CriterionStatus.UNAVAILABLE,
        CriterionStatus.CLEAN,
    }:
        return False
    return e.evidence_quality > 0 and e.provider_verdict not in {
        ProviderVerdict.NO_HIT,
        ProviderVerdict.CLEAN,
        ProviderVerdict.UNKNOWN,
        ProviderVerdict.NOT_OBSERVED,
        ProviderVerdict.UNAVAILABLE,
    }
