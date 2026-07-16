"""Pure CoreGuide v2 policy decisions; never changes the risk score."""

from __future__ import annotations

from .types import NextAction, PolicyDecision, PolicyProfile, PolicyResult, RiskResultV2

_DECISION_RANK = {
    PolicyDecision.ALLOW: 0,
    PolicyDecision.WARN: 1,
    PolicyDecision.REQUIRE_REVIEW: 2,
    PolicyDecision.SOFT_BLOCK: 3,
    PolicyDecision.HARD_BLOCK: 4,
}


class PolicyEngineV2:
    def decide(
        self,
        risk_result: RiskResultV2,
        profile: PolicyProfile | None = None,
    ) -> PolicyResult:
        selected = profile or PolicyProfile()
        score = risk_result.risk_score
        confidence = risk_result.confidence_score
        if score >= 80:
            decision, action = PolicyDecision.HARD_BLOCK, NextAction.REPORT
        elif score >= 60:
            decision, action = selected.dangerous_decision, NextAction.SANDBOX
        elif score >= 40:
            if confidence >= 70:
                decision, action = PolicyDecision.SOFT_BLOCK, NextAction.USER_CONFIRMATION
            else:
                decision, action = PolicyDecision.REQUIRE_REVIEW, NextAction.SANDBOX
        elif score >= 20:
            decision, action = PolicyDecision.WARN, NextAction.DEEP_SCAN
        elif confidence < 40:
            decision, action = PolicyDecision.WARN, NextAction.DEEP_SCAN
        else:
            decision, action = PolicyDecision.ALLOW, NextAction.NONE

        override = risk_result.effective_override
        if override:
            try:
                minimum = PolicyDecision(override.minimum_decision)
            except ValueError:
                minimum = PolicyDecision.REQUIRE_REVIEW
            if _DECISION_RANK[minimum] > _DECISION_RANK[decision]:
                decision = minimum
            action = NextAction.REPORT

        return PolicyResult(
            decision=decision,
            next_action=action,
            policy_version=selected.version,
            reason=(
                f"risk={score:.2f}, confidence={confidence:.2f}, level={risk_result.risk_level}"
            ),
        )
