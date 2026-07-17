"""InferenceService — orchestrates Layer 1 (models) + Policy into AssessResponse.

The "one Robust Risk Core" reception desk (design.md CONTRA-3.1): routes each modality
to the right predictor, merges evidence, applies the Policy Engine, and produces the
unified contract response.
"""

from __future__ import annotations

import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from dataclasses import asdict
from typing import Any
from urllib.parse import urlsplit

from ai.adapters.file_adapter import analyze_file_bytes
from ai.adapters.url_adapter import parse_url_parts
from ai.inference.engine import InferenceEngine
from backend.config import settings
from backend.services.threat_feed_service import collect_local_threat_feed_evidence
from backend.services.url_telemetry_service import collect_distributed_url_evidence
from security.dns_intelligence import dns_intelligence_service
from security.domain_intelligence import domain_intelligence_service
from security.ip_intelligence import ip_intelligence_service
from security.misp_adapter import collect_misp
from security.policy_engine import PolicyEngine, score_to_level
from security.risk_core import PolicyEngineV2, default_config
from security.risk_core import assess as assess_risk_v2
from security.risk_core.detectors import (
    ScanObservations,
    add_browser_sandbox,
    add_cross_source_intelligence,
    add_dns_intelligence,
    add_domain_intelligence,
    add_http_sandbox,
    add_offline_url_findings,
    build_criteria_evidence,
)
from security.risk_core.external_adapters import collect_external
from security.risk_core.url_overrides import URL_OVERRIDE_RULES
from security.scan_history import local_scan_history
from security.url_basic_intelligence import build_url_basic_intelligence
from security.urlvet_adapter import collect_urlvet
from shared.schemas import (
    AgentContext,
    AgentRiskResponse,
    AssessResponse,
    Decision,
    Evidence,
    Modality,
    RiskCoreTrace,
)


def _url_model_feature_context(
    domain_intelligence: object | None,
    dns_intelligence: object | None,
    urlvet_evidence: list[Any],
    local_feed_evidence: list[Any],
) -> dict[str, object]:
    """Build the shared dynamic feature context from completed collectors."""
    context: dict[str, object] = {
        "local_feed_checked": 1.0,
        "local_feed_hit": float(bool(local_feed_evidence)),
    }
    if dns_intelligence is not None:
        available = bool(getattr(dns_intelligence, "available", False))
        addresses = tuple(getattr(dns_intelligence, "addresses", ()) or ())
        nameservers = tuple(getattr(dns_intelligence, "nameservers", ()) or ())
        mx_records = tuple(getattr(dns_intelligence, "mx", ()) or ())
        context.update(
            {
                "dns_available": float(available),
                "dns_resolves": float(bool(addresses)),
                "dns_record_count": float(len(addresses) + len(nameservers) + len(mx_records)),
            }
        )
    if domain_intelligence is not None:
        age_days = getattr(domain_intelligence, "age_days", None)
        context.update(
            {
                "rdap_available": float(age_days is not None),
                "domain_age_days": float(age_days or 0),
            }
        )
    for item in urlvet_evidence:
        metadata = getattr(item, "metadata", {})
        values = metadata.get("feature_context") if isinstance(metadata, dict) else None
        if isinstance(values, dict):
            context.update(values)
    return context


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
    def assess_url(
        self,
        url: str,
        *,
        sandbox_reports: tuple[tuple[object, bool], ...] = (),
    ) -> AssessResponse:
        t0 = time.perf_counter()
        observations = ScanObservations(url)
        urlvet_evidence = []
        misp_evidence = []
        domain_result = None
        dns_result = None
        ip_result = None
        host = urlsplit(url if "://" in url else f"https://{url}").hostname
        domain = parse_url_parts(url).registrable_domain if host else None
        if domain and host:
            with ThreadPoolExecutor(max_workers=5, thread_name_prefix="url-enrichment") as pool:
                domain_future = pool.submit(domain_intelligence_service.inspect, domain, url)
                dns_future = pool.submit(dns_intelligence_service.inspect, host)
                urlvet_future = pool.submit(
                    collect_urlvet,
                    url,
                    base_url=settings.urlvet_api_url,
                    enabled=settings.urlvet_enabled,
                    timeout=settings.urlvet_timeout_seconds,
                )
                misp_future = pool.submit(
                    collect_misp,
                    url,
                    enabled=settings.misp_enabled,
                    base_url=settings.misp_base_url,
                    api_key=settings.misp_api_key,
                    verify_tls=settings.misp_verify_tls,
                    timeout=settings.misp_timeout_seconds,
                    last=settings.misp_lookup_last,
                )
                ip_future = None
                try:
                    dns_result = dns_future.result()
                    add_dns_intelligence(observations, dns_result)
                    if dns_result.addresses:
                        primary_address = next(
                            (address for address in dns_result.addresses if ":" not in address),
                            dns_result.addresses[0],
                        )
                        ip_future = pool.submit(
                            ip_intelligence_service.inspect,
                            primary_address,
                        )
                except Exception as exc:
                    for criterion_id in (44, 45):
                        observations.unavailable[criterion_id] = (
                            f"DNS intelligence unavailable: {type(exc).__name__}"
                        )
                try:
                    domain_result = domain_future.result()
                    add_domain_intelligence(observations, domain_result)
                except Exception as exc:
                    for criterion_id in (1, 3, 4, 11, 12):
                        observations.unavailable[criterion_id] = (
                            f"Domain intelligence unavailable: {type(exc).__name__}"
                        )
                if ip_future is not None:
                    try:
                        ip_result = ip_future.result()
                    except Exception:
                        ip_result = None
                urlvet_evidence = urlvet_future.result()
                misp_evidence = misp_future.result()
        else:
            urlvet_evidence = collect_urlvet(
                url,
                base_url=settings.urlvet_api_url,
                enabled=settings.urlvet_enabled,
                timeout=settings.urlvet_timeout_seconds,
            )
            misp_evidence = collect_misp(
                url,
                enabled=settings.misp_enabled,
                base_url=settings.misp_base_url,
                api_key=settings.misp_api_key,
                verify_tls=settings.misp_verify_tls,
                timeout=settings.misp_timeout_seconds,
                last=settings.misp_lookup_last,
            )
        local_feed_evidence = collect_local_threat_feed_evidence(url)
        feature_context = _url_model_feature_context(
            domain_result,
            dns_result,
            urlvet_evidence,
            local_feed_evidence,
        )
        try:
            pred = self.engine.predict_url(url, context=feature_context)
        except TypeError as exc:
            if "unexpected keyword argument 'context'" not in str(exc):
                raise
            pred = self.engine.predict_url(url)
        score = self._finalize_score(pred.risk_score, pred.evidence)
        decision = self.policy.evaluate_human(score)
        response = self._build(
            score,
            decision,
            pred.evidence,
            Modality.URL,
            pred.model_version,
            t0,
        )
        add_offline_url_findings(observations, pred.evidence)
        for sandbox_report, is_browser_report in sandbox_reports:
            detector = add_browser_sandbox if is_browser_report else add_http_sandbox
            detector(observations, sandbox_report)
        add_cross_source_intelligence(
            observations,
            domain_intelligence=domain_result,
            dns_intelligence=dns_result,
            ip_intelligence=ip_result,
            sandbox_reports=sandbox_reports,
            history_store=local_scan_history,
        )
        config = default_config()
        v2_evidence = build_criteria_evidence(observations, config)
        v2_evidence.extend(local_feed_evidence)
        v2_evidence.extend(collect_external(url, config, provider_config=settings.model_dump()))
        v2_evidence.extend(urlvet_evidence)
        v2_evidence.extend(misp_evidence)
        v2_evidence.extend(collect_distributed_url_evidence(url))
        risk = assess_risk_v2(
            v2_evidence,
            config=config,
            override_rules=URL_OVERRIDE_RULES,
        )
        policy = PolicyEngineV2().decide(risk)
        trace = asdict(risk)
        trace.update(
            {
                "schema_version": "2",
                "scoring_version": risk.scan_version,
                "raw_score": risk.base_risk_score,
                "final_score": risk.risk_score,
                "confidence": risk.confidence_score,
                "verdict": risk.risk_level,
                "decision": policy.decision.value,
                "next_action": policy.next_action.value,
            }
        )
        response.risk_core = RiskCoreTrace.model_validate(trace)
        response.schema_version = "2"
        response.scoring_version = risk.scan_version
        response.raw_score = round(risk.base_risk_score / 100, 4)
        response.final_score = round(risk.risk_score / 100, 4)
        # Risk Core v2 is the authoritative score. Keep the legacy top-level
        # fields in sync so every API/UI consumer receives the same verdict.
        response.risk_score = response.final_score
        response.risk_level = score_to_level(response.risk_score)
        response.confidence = round(risk.confidence_score / 100, 4)
        response.decision = {
            "allow": Decision.ALLOW,
            "warn": Decision.WARN,
            "require_review": Decision.ASK_USER_CONFIRMATION,
            "soft_block": Decision.BLOCK,
            "hard_block": Decision.BLOCK,
        }[policy.decision.value]
        scored_reasons = [
            item.reason
            for item in sorted(risk.criteria, key=lambda item: item.adjusted_score, reverse=True)
            if item.adjusted_score > 0 and item.reason
        ]
        response.reasons = scored_reasons[:3] or risk.reasoning[:3]
        if domain:
            response.url_intelligence = build_url_basic_intelligence(
                domain,
                domain_result,
                dns_result,
                ip_result,
            )
        return response

    def assess_sandbox_report(self, url: str, report: object, *, browser: bool = False) -> RiskCoreTrace:
        observations = ScanObservations(url)
        (add_browser_sandbox if browser else add_http_sandbox)(observations, report)
        config = default_config()
        risk = assess_risk_v2(build_criteria_evidence(observations, config), config=config)
        policy = PolicyEngineV2().decide(risk)
        trace = asdict(risk)
        trace.update({
            "schema_version": "2", "scoring_version": risk.scan_version,
            "raw_score": risk.base_risk_score, "final_score": risk.risk_score,
            "confidence": risk.confidence_score, "verdict": risk.risk_level,
            "decision": policy.decision.value, "next_action": policy.next_action.value,
        })
        return RiskCoreTrace.model_validate(trace)


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
            score,
            decision,
            evidence,
            mod,
            f"untrusted-content[{text_pred.model_version}+{prompt_pred.model_version}]",
            t0,
        )

    # ---------------------------------------------------------------- prompt
    def assess_prompt(self, text: str) -> AssessResponse:
        t0 = time.perf_counter()
        pred = self.engine.predict_prompt(text)
        decision = self.policy.evaluate_human(pred.risk_score)
        return self._build(
            pred.risk_score, decision, pred.evidence, Modality.PROMPT, pred.model_version, t0
        )

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
            return f"Agent định thực hiện '{action_type}' tới đích không đáng tin" + (
                " kèm dữ liệu nhạy cảm." if data_types else "."
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
