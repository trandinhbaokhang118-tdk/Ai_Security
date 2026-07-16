"""Structured risk floors; overrides never add to the base score."""

from __future__ import annotations

from dataclasses import dataclass

from .types import EvidenceV2, OverrideResult


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
    findings = {e.finding_type: e.evidence_id for e in evidence if e.evidence_quality > 0}
    matches = []
    for rule in rules:
        if rule.required_finding_types and rule.required_finding_types <= findings.keys():
            ids = tuple(sorted(findings[t] for t in rule.required_finding_types))
            matches.append(
                OverrideResult(rule.rule_id, rule.floor, rule.minimum_decision, ids, rule.reason)
            )
    matches.sort(key=lambda m: (-m.floor, m.rule_id))
    return matches, matches[0] if matches else None
