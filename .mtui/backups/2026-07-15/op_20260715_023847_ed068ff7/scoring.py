"""Deterministic internal (80) and external family-capped (20) scoring."""
from __future__ import annotations

from dataclasses import replace

from .config import RiskConfig
from .evidence import eligible_risk_evidence
from .types import CriterionResult, CriterionStatus, EvidenceV2, ExternalAward


def score_internal(evidence: list[EvidenceV2], config: RiskConfig) -> tuple[float, list[CriterionResult], list[EvidenceV2]]:
    adjusted: list[EvidenceV2] = []
    results: list[CriterionResult] = []
    for cfg in config.criteria:
        group = [e for e in evidence if e.criterion_id == cfg.criterion_id]
        eligible = [e for e in group if eligible_risk_evidence(e)]
        if not group:
            results.append(CriterionResult(cfg.criterion_id, CriterionStatus.NOT_CHECKED, cfg.max_weight, cfg.coverage_weight))
            continue
        best = max(eligible, key=lambda e: (e.severity * e.evidence_quality, e.authority_tier, e.source_id), default=None)
        if best is None:
            status = CriterionStatus.CLEAN if any(e.status == CriterionStatus.CLEAN for e in group) else group[0].status
            results.append(CriterionResult(cfg.criterion_id, status, cfg.max_weight, cfg.coverage_weight, evidence_ids=sorted(e.evidence_id for e in group)))
            continue
        raw = cfg.max_weight * min(1, max(0, best.severity)) * min(1, max(0, best.evidence_quality))
        # Correlated findings for one incident cannot stack; criterion selects one canonical maximum.
        scored = replace(best, max_weight=cfg.max_weight, raw_score=raw, adjusted_score=raw)
        adjusted.append(scored)
        results.append(CriterionResult(cfg.criterion_id, best.status, cfg.max_weight, cfg.coverage_weight, best.severity, best.evidence_quality, raw, raw, sorted(e.evidence_id for e in group), best.incident_key))
    total = min(config.internal_cap, sum(r.adjusted_score for r in results))
    return total, results, adjusted


def score_external(evidence: list[EvidenceV2], config: RiskConfig, internal_evidence_ids: set[str]) -> tuple[float, list[ExternalAward]]:
    source_map = {s.source_id: s for s in config.sources}
    candidates = []
    for e in evidence:
        source = source_map.get(e.source_id)
        if source and e.evidence_id not in internal_evidence_ids and e.eligible_for_external_score and eligible_risk_evidence(e):
            score = source.raw_weight * e.match_strength * e.evidence_quality * e.independence_coefficient * e.freshness_factor
            candidates.append((score, e, source))
    candidates.sort(key=lambda x: (-x[0], -x[1].authority_tier, x[1].source_id, x[1].evidence_id))
    remaining = dict(config.family_caps)
    awards: list[ExternalAward] = []
    for score, e, source in candidates:
        award = min(max(0.0, score), remaining[source.family])
        if award > 0:
            awards.append(ExternalAward(e.evidence_id, e.source_id, source.family, score, award))
            remaining[source.family] -= award
    return min(config.external_cap, sum(a.awarded_score for a in awards)), awards
