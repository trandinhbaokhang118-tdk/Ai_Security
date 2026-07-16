"""Two-phase deterministic Risk Core v2 orchestration."""
from __future__ import annotations

from .confidence import compute_confidence
from .config import RiskConfig, default_config
from .evidence import resolve_evidence
from .overrides import OverrideRule, evaluate_overrides
from .scoring import score_external, score_internal
from .types import EvidenceV2, RiskResultV2


def _level(score: float) -> str:
    if score >= 80:
        return "critical"
    if score >= 60:
        return "dangerous"
    if score >= 40:
        return "suspicious"
    if score >= 20:
        return "caution"
    return "low"


def assess(evidence: list[EvidenceV2], *, config: RiskConfig | None = None, override_rules: tuple[OverrideRule, ...] = ()) -> RiskResultV2:
    cfg = config or default_config()
    cfg.validate()
    resolved, conflicts = resolve_evidence(evidence)
    internal, criteria, internal_items = score_internal(resolved, cfg)
    external, awards = score_external(resolved, cfg, {e.evidence_id for e in internal_items})
    base = min(100.0, internal + external)
    overrides, effective = evaluate_overrides(resolved, override_rules)
    score = max(base, effective.floor if effective else 0.0)
    confidence = compute_confidence(criteria, resolved)
    band = "high" if confidence.score >= 75 else "medium" if confidence.score >= 45 else "low"
    unavailable = [c.criterion_id for c in criteria if c.status.value == "unavailable"]
    not_checked = [c.criterion_id for c in criteria if c.status.value == "not_checked"]
    reasoning = [
        f"Internal evidence contributed {internal:.2f}/80.",
        f"External corroboration contributed {external:.2f}/20.",
    ]
    if effective:
        reasoning.append(f"Override {effective.rule_id} applied floor {effective.floor:.2f}.")
    return RiskResultV2(
        base_risk_score=base,
        risk_score=score,
        risk_level=_level(score),
        confidence_score=confidence.score,
        confidence_band=band,
        internal_score=internal,
        external_corroboration_score=external,
        coverage=confidence.coverage,
        agreement=confidence.agreement,
        freshness=confidence.freshness,
        criteria=criteria,
        evidence=resolved,
        external_sources=awards,
        overrides=overrides,
        effective_override=effective,
        conflicts=conflicts,
        rules_version=cfg.rules_version,
        weights_version=cfg.weights_version,
        unavailable_checks=unavailable,
        not_checked_checks=not_checked,
        reasoning=reasoning,
    )
