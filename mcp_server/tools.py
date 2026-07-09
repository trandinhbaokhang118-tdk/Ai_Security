"""MCP tool handlers (mcp-tool-schema.md).

Pure functions that map the MCP tool contracts onto the shared InferenceService.
Transport-agnostic so they can be unit-tested directly and wired into any MCP runtime.

Verdict enum in the MCP contract uses "ASK_CONFIRM"; internal Decision uses
"ASK_USER_CONFIRMATION" — we translate at this boundary.
"""

from __future__ import annotations

from typing import Any

from backend.services.inference_service import InferenceService
from shared.schemas import AgentContext, Decision

_DECISION_TO_VERDICT = {
    Decision.ALLOW: "ALLOW",
    Decision.WARN: "WARN",
    Decision.BLOCK: "BLOCK",
    Decision.ASK_USER_CONFIRMATION: "ASK_CONFIRM",
}

TOOL_DEFINITIONS: list[dict[str, Any]] = [
    {
        "name": "check_url_before_click",
        "description": "Assess risk of a URL before the agent navigates to it or clicks it.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "url": {"type": "string", "description": "Full URL including scheme."},
                "context": {"type": "string", "default": ""},
            },
            "required": ["url"],
        },
    },
    {
        "name": "check_content_before_processing",
        "description": "Scan text content for prompt injection before the agent processes it.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "content": {"type": "string"},
                "content_type": {
                    "type": "string",
                    "enum": ["email", "webpage", "file", "chat_message"],
                    "default": "webpage",
                },
            },
            "required": ["content"],
        },
    },
    {
        "name": "check_action_before_execution",
        "description": "Assess risk of an action the agent is about to perform for the user.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "action_type": {
                    "type": "string",
                    "enum": [
                        "click_link", "submit_form", "download_file", "run_file",
                        "send_email", "call_api",
                    ],
                },
                "target": {"type": "string"},
                "protected_assets": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["action_type", "target"],
        },
    },
]


def _evidence_json(evidence) -> list[dict[str, Any]]:
    return [
        {"source": e.source, "message": e.message, "severity": e.severity.value}
        for e in evidence
    ]


class MCPTools:
    def __init__(self, service: InferenceService | None = None):
        self.service = service or InferenceService()

    # ------------------------------------------------------ tool 1
    def check_url_before_click(self, url: str, context: str = "") -> dict[str, Any]:
        if not url or not isinstance(url, str):
            return {"error": "invalid_input", "detail": "url is required", "request_id": ""}
        res = self.service.assess_url(url)
        return {
            "risk_score": res.risk_score,
            "verdict": _DECISION_TO_VERDICT[res.decision],
            "evidence": _evidence_json(res.evidence),
            "confidence": res.confidence,
            "explanation": res.explanation,
            "request_id": res.request_id,
        }

    # ------------------------------------------------------ tool 2
    def check_content_before_processing(
        self, content: str, content_type: str = "webpage"
    ) -> dict[str, Any]:
        if not content or not isinstance(content, str):
            return {"error": "invalid_input", "detail": "content is required", "request_id": ""}
        res = self.service.assess_text(content, "text")
        injection = any(e.source == "prompt_adapter" and e.severity.value == "critical"
                        for e in res.evidence)
        return {
            "risk_score": res.risk_score,
            "verdict": _DECISION_TO_VERDICT[res.decision],
            "injection_detected": injection,
            "evidence": _evidence_json(res.evidence),
            "safe_summary": res.reasons[0] if res.reasons else "",
            "request_id": res.request_id,
        }

    # ------------------------------------------------------ tool 3
    def check_action_before_execution(
        self, action_type: str, target: str, protected_assets: list[str] | None = None
    ) -> dict[str, Any]:
        if not action_type or not target:
            return {
                "error": "invalid_input",
                "detail": "action_type and target are required",
                "request_id": "",
            }
        assets = protected_assets or []
        ctx = AgentContext(agent_type="generic", available_assets=assets)
        target_url = target if target.startswith(("http://", "https://")) else None
        res = self.service.assess_action(action_type, target_url, assets, ctx)
        return {
            "risk_score": res.risk_score,
            "verdict": _DECISION_TO_VERDICT[res.decision],
            "reasoning": res.reasoning,
            "requires_user_confirmation": res.requires_user_confirmation,
            "request_id": res.request_id,
        }

    def dispatch(self, name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        if name == "check_url_before_click":
            return self.check_url_before_click(**arguments)
        if name == "check_content_before_processing":
            return self.check_content_before_processing(**arguments)
        if name == "check_action_before_execution":
            return self.check_action_before_execution(**arguments)
        return {"error": "invalid_input", "detail": f"unknown tool {name}", "request_id": ""}
