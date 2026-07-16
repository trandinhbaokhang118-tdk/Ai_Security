"""InferenceService — orchestrates Layer 1 (models) + Policy into AssessResponse.

The "one Robust Risk Core" reception desk (design.md CONTRA-3.1): routes each modality
to the right predictor, merges evidence, applies the Policy Engine, and produces the
unified contract response.
"""

from __future__ import annotations

import time
import uuid
from dataclasses import asdict

from ai.adapters.file_adapter import analyze_file_bytes
from ai.inference.engine import InferenceEngine
from security.policy_engine import PolicyEngine, score_to_level
from shared.schemas import (
    AgentContext,
    AgentRiskResponse,
    AssessResponse,
    Decision,
    Evidence,
    Modality,
)


class InferenceService:
    def __init__(self, engine: InferenceEngine | None = None, policy: PolicyEngine | None = None):
        self.engine = engine or InferenceEngine()
        self.policy = policy or PolicyEngine()

    @property
    def models_loaded(self) -> bool:
        return self.engine.models_loaded

    @property
    def model_status(self) -> dict:
        return self.engine.model_status

    def _finalize_score(self, base: float, evidence: list[Evidence]) -> float:
        return self.policy.combine_evidence_score(base, evidence)

    def _reasons(self, evidence: list[Evidence]) -> list[str]:
        ranked = sorted(
            evidence,
            key=lambda e: {"critical": 4, "high": 3, "medium": 2, "low": 1, "info": 0}[
                e.severity.value
            ],
            reverse=True,
        )
        return [e.message for e in ranked[:3]]

    def _confidence(self, score: float, evidence: list[Evidence], version: str = "") -> float:
        """Estimate confidence from risk separation, evidence strength, and model source."""
        clipped = max(0.0, min(1.0, float(score)))
        boundary_certainty = abs(clipped - 0.5) * 2.0
        severity_weight = {
            "critical": 1.0,
            "high": 0.8,
            "medium": 0.55,
            "low": 0.3,
            "info": 0.12,
        }
        evidence_strength = min(
            1.0,
            sum(severity_weight.get(item.severity.value, 0.0) for item in evidence) / 3.0,
        )
        lower_version = version.lower()
        if "transformer" in lower_version:
            model_bonus = 0.12
        elif "lgbm" in lower_version or "onnx" in lower_version:
            model_bonus = 0.08
        elif "heuristic" in lower_version:
            model_bonus = 0.03
        else:
            model_bonus = 0.05
        ambiguous_penalty = 0.08 if 0.35 <= clipped <= 0.65 else 0.0
        confidence = (
            0.35
            + boundary_certainty * 0.38
            + evidence_strength * 0.17
            + model_bonus
            - ambiguous_penalty
        )
        return round(max(0.2, min(0.98, confidence)), 4)

    # ------------------------------------------------------------------ url
    def assess_url(self, url: str) -> AssessResponse:
        t0 = time.perf_counter()
        pred = self.engine.predict_url(url)
        score = self._finalize_score(pred.risk_score, pred.evidence)
        decision = self.policy.evaluate_human(score)
        return self._build(score, decision, pred.evidence, Modality.URL, pred.model_version, t0)

    # ------------------------------------------------------------------ text
    def assess_text(self, text: str, modality: str = "email", metadata: dict | None = None):
        t0 = time.perf_counter()
        enriched_metadata = dict(metadata or {})
        enriched_metadata.setdefault("modality", modality)
        pred = self.engine.predict_text(text, enriched_metadata)
        score = self._finalize_score(pred.risk_score, pred.evidence)
        decision = self.policy.evaluate_human(score)
        mod = Modality(modality) if modality in Modality._value2member_map_ else Modality.TEXT
        return self._build(score, decision, pred.evidence, mod, pred.model_version, t0)

    def assess_untrusted_content(
        self, text: str, modality: str = "text", metadata: dict | None = None
    ) -> AssessResponse:
        """Gate external data before it enters an agent's instruction context."""
        t0 = time.perf_counter()
        enriched_metadata = dict(metadata or {})
        enriched_metadata.setdefault("modality", modality)
        text_pred = self.engine.predict_text(text, enriched_metadata)
        prompt_pred = self.engine.predict_prompt(text)
        evidence = [*text_pred.evidence, *prompt_pred.evidence]
        score = self._finalize_score(max(text_pred.risk_score, prompt_pred.risk_score), evidence)
        decision = self.policy.evaluate_human(score)
        mod = Modality(modality) if modality in Modality._value2member_map_ else Modality.TEXT
        return self._build(
            score, decision, evidence, mod,
            f"untrusted-content[{text_pred.model_version}+{prompt_pred.model_version}]", t0,
        )

    # ---------------------------------------------------------------- prompt
    def assess_prompt(self, text: str) -> AssessResponse:
        t0 = time.perf_counter()
        pred = self.engine.predict_prompt(text)
        decision = self.policy.evaluate_human(pred.risk_score)
        return self._build(pred.risk_score, decision, pred.evidence, Modality.PROMPT,
                           pred.model_version, t0)

    # ------------------------------------------------------------------ file
    def assess_file(self, data: bytes, filename: str = "") -> AssessResponse:
        t0 = time.perf_counter()
        score, evidence = analyze_file_bytes(data, filename)
        decision = self.policy.evaluate_human(score)
        return self._build(score, decision, evidence, Modality.FILE, "static-file-1", t0)

    # ---------------------------------------------------------------- action
    def assess_action(
        self,
        action_type: str,
        target_url: str | None,
        data_types: list[str],
        agent_context: AgentContext,
    ) -> AgentRiskResponse:
        # Base content risk from the target (URL) if present.
        evidence: list[Evidence] = []
        base = 0.05
        if target_url:
            pred = self.engine.predict_url(target_url)
            base = pred.risk_score
            evidence = pred.evidence
        base = self._finalize_score(base, evidence)
        decision = self.policy.evaluate_action(
            action_type, base, data_types, agent_context.available_assets
        )
        eff = self.policy.effective_action_score(action_type, base, data_types)
        level = score_to_level(eff)
        rid = str(uuid.uuid4())
        summary = self._safe_summary(decision, action_type, data_types)
        return AgentRiskResponse(
            decision=decision,
            verdict=decision,
            risk_level=level,
            risk_score=round(eff, 4),
            confidence=self._confidence(eff, evidence, "policy-action"),
            safe_summary=summary,
            reasoning=summary,
            evidence=evidence,
            recommended_agent_behavior=self.policy.recommend_behavior(decision, agent_context),
            requires_user_confirmation=decision == Decision.ASK_USER_CONFIRMATION,
            request_id=rid,
        )

    def _safe_summary(self, decision: Decision, action_type: str, data_types: list[str]) -> str:
        if decision == Decision.BLOCK:
            return (
                f"Agent định thực hiện '{action_type}' tới đích không đáng tin"
                + (" kèm dữ liệu nhạy cảm." if data_types else ".")
            )
        if decision == Decision.ASK_USER_CONFIRMATION:
            return f"Hành động '{action_type}' có rủi ro trung bình — cần người dùng xác nhận."
        if decision == Decision.WARN:
            return f"Hành động '{action_type}' có dấu hiệu đáng ngờ nhẹ."
        return f"Hành động '{action_type}' ở mức rủi ro thấp."

    # ------------------------------------------------------------------ util
    def _build(self, score, decision, evidence, modality, version, t0) -> AssessResponse:
        return AssessResponse(
            risk_score=round(score, 4),
            risk_level=score_to_level(score),
            decision=decision,
            confidence=self._confidence(score, evidence, version),
            modality=modality,
            reasons=self._reasons(evidence),
            evidence=evidence,
            model_version=version,
            latency_ms=round((time.perf_counter() - t0) * 1000, 2),
            request_id=str(uuid.uuid4()),
        )
