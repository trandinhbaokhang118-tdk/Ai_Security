"""Deterministic internal (80) and external family-capped (20) scoring."""

from __future__ import annotations

from dataclasses import replace

from .config import RiskConfig
from .evidence import eligible_risk_evidence
from .mitigations import mitigate_subsignal
from .types import (
    CriterionResult,
    CriterionStatus,
    EvidenceV2,
    ExternalAward,
    MatchedSubject,
    ProviderVerdict,
)

_CORRELATION = {
    "identity_lexical": ({5, 6, 7, 46}, 7.5),
    "brand_copy_assets": ({19, 39, 40}, 4.5),
    "infrastructure_reputation": ({11, 12, 13, 14, 15, 44}, 8.0),
    "credential_form": ({29, 30, 35}, 8.0),
    "commerce_pressure": ({27, 28, 31, 32}, 9.0),
}
_HARD = {29, 30, 34, 35}
_MATCH = {
    MatchedSubject.EXACT_URL: 5,
    MatchedSubject.FINAL_REDIRECT_URL: 4,
    MatchedSubject.EXACT_DOMAIN: 3,
    MatchedSubject.IP: 2,
    MatchedSubject.RELATED_SUBJECT: 1,
}
_VERDICT = {ProviderVerdict.MALICIOUS: 1.0, ProviderVerdict.SUSPICIOUS: 0.5}


def _reason(items: list[EvidenceV2], fallback: str) -> str:
    summaries: list[str] = []
    for item in items:
        value = str(item.metadata.get("summary", "")).strip()
        if value and value not in summaries:
            summaries.append(value)
    return "; ".join(summaries[:3]) or fallback


def score_internal(
    evidence: list[EvidenceV2], config: RiskConfig
) -> tuple[float, list[CriterionResult], list[EvidenceV2]]:
    adjusted = []
    results = []
    for cfg in config.criteria:
        group = sorted(
            (e for e in evidence if e.criterion_id == cfg.criterion_id), key=lambda e: e.evidence_id
        )
        eligible = [e for e in group if eligible_risk_evidence(e)]
        if not group:
            results.append(
                CriterionResult(
                    cfg.criterion_id,
                    CriterionStatus.NOT_CHECKED,
                    cfg.max_weight,
                    cfg.coverage_weight,
                    name=cfg.name,
                    reason="Required observation was not collected in this scan mode.",
                    checked=False,
                )
            )
            continue
        best = max(
            eligible,
            key=lambda e: (
                e.severity * e.evidence_quality,
                e.authority_tier,
                e.freshness_factor,
                e.source_id,
                e.evidence_id,
            ),
            default=None,
        )
        if best is None:
            status = (
                CriterionStatus.CLEAN
                if any(e.status == CriterionStatus.CLEAN for e in group)
                else group[0].status
            )
            results.append(
                CriterionResult(
                    cfg.criterion_id,
                    status,
                    cfg.max_weight,
                    cfg.coverage_weight,
                    evidence_ids=[e.evidence_id for e in group],
                    name=cfg.name,
                    reason=_reason(group, "Check completed without a risk finding."),
                    applicable=status != CriterionStatus.NOT_APPLICABLE,
                    checked=status
                    in {
                        CriterionStatus.CLEAN,
                        CriterionStatus.SUSPICIOUS,
                        CriterionStatus.MALICIOUS,
                    },
                )
            )
            continue
        raw = cfg.max_weight * best.severity * best.evidence_quality
        mitigation = (
            0.0 if cfg.criterion_id in _HARD else float(best.metadata.get("mitigation", 0.0))
        )
        score = mitigate_subsignal(raw, mitigation)
        scored = replace(best, max_weight=cfg.max_weight, raw_score=raw, adjusted_score=score)
        adjusted.append(scored)
        results.append(
            CriterionResult(
                cfg.criterion_id,
                best.status,
                cfg.max_weight,
                cfg.coverage_weight,
                best.severity,
                best.evidence_quality,
                raw,
                score,
                [e.evidence_id for e in group],
                best.incident_key,
                cfg.name,
                _reason([best], best.finding_type),
                True,
                True,
            )
        )
    # Apply caps only to findings sharing the same incident and correlation family.
    for ids, cap in _CORRELATION.values():
        incidents = {
            r.incident_key
            for r in results
            if r.criterion_id in ids and r.incident_key and r.adjusted_score > 0
        }
        for incident in incidents:
            members = sorted(
                (r for r in results if r.criterion_id in ids and r.incident_key == incident),
                key=lambda r: (-r.adjusted_score, r.criterion_id),
            )
            remaining = cap
            for r in members:
                awarded = min(r.adjusted_score, remaining)
                r.adjusted_score = awarded
                remaining -= awarded
    total = sum(r.adjusted_score for r in results)
    if not 0 <= total <= config.internal_cap + 1e-9:
        raise ValueError(f"internal score invariant failed: {total}")
    return max(0.0, min(config.internal_cap, total)), results, adjusted


def score_external(
    evidence: list[EvidenceV2], config: RiskConfig, internal_evidence_ids: set[str]
) -> tuple[float, list[ExternalAward]]:
    sm = {s.source_id: s for s in config.sources}
    candidates = []
    for e in evidence:
        source = sm.get(e.source_id)
        severity = _VERDICT.get(e.provider_verdict, 0.0)
        if (
            source
            and severity
            and e.evidence_id not in internal_evidence_ids
            and e.eligible_for_external_score
        ):
            score = (
                source.raw_weight
                * severity
                * e.evidence_quality
                * e.match_strength
                * e.freshness_factor
            )
            candidates.append((e, source, score))
    candidates.sort(
        key=lambda x: (
            -_MATCH[x[0].matched_subject],
            -_VERDICT[x[0].provider_verdict],
            -x[0].evidence_quality,
            -x[0].authority_tier,
            -x[0].freshness_factor,
            x[0].source_id,
            x[0].evidence_id,
        )
    )
    remaining = dict(config.family_caps)
    awards = []
    for e, source, score in candidates:
        award = min(max(0.0, score), remaining[source.family])
        if award:
            awards.append(ExternalAward(e.evidence_id, e.source_id, source.family, score, award))
            remaining[source.family] -= award
    total = sum(a.awarded_score for a in awards)
    if not 0 <= total <= config.external_cap + 1e-9:
        raise ValueError(f"external score invariant failed: {total}")
    return max(0.0, min(config.external_cap, total)), awards
