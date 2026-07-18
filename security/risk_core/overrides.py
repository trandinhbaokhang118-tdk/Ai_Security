"""Structured risk floors; overrides never add to the base score."""

from __future__ import annotations

from dataclasses import dataclass

from .types import CriterionStatus, EvidenceV2, OverrideResult, ProviderVerdict


@dataclass(frozen=True)
class OverrideRule:
    rule_id: str
    required_finding_types: frozenset[str]
    floor: float
    minimum_decision: str
    reason: str


def evaluate_overrides(
    evidence: list[EvidenceV2], rules: tuple[OverrideRule, ...]
) -> tuple[list[OverrideResult], OverrideResult | None]:
    positive_statuses = {CriterionStatus.SUSPICIOUS, CriterionStatus.MALICIOUS}
    positive_verdicts = {ProviderVerdict.SUSPICIOUS, ProviderVerdict.MALICIOUS}
    findings = {
        e.finding_type: e.evidence_id
        for e in evidence
        if e.evidence_quality > 0
        and e.status in positive_statuses
        and e.provider_verdict in positive_verdicts
    }
    matches = []
    for rule in rules:
        if rule.required_finding_types and rule.required_finding_types <= findings.keys():
            ids = tuple(sorted(findings[t] for t in rule.required_finding_types))
            matches.append(
                OverrideResult(rule.rule_id, rule.floor, rule.minimum_decision, ids, rule.reason)
            )
    # Prefer the strongest floor, then the most specific matching rule.  Stable
    # name ordering remains the final tie-breaker for deterministic traces.
    specificity = {rule.rule_id: len(rule.required_finding_types) for rule in rules}
    matches.sort(key=lambda m: (-m.floor, -specificity.get(m.rule_id, 0), m.rule_id))
    return matches, matches[0] if matches else None
