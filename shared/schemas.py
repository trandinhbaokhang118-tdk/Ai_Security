"""Pydantic v2 data contracts — single source of truth (design.md §7).

Imported by the backend gateway, MCP server, and AI modules. Kept dependency-free
(only pydantic) so importing schemas never pulls in heavy ML libraries.
"""

from __future__ import annotations

from enum import StrEnum
from typing import Any, Literal

from pydantic import BaseModel, Field


# --------------------------------------------------------------------------- enums
class Modality(StrEnum):
    URL = "url"
    EMAIL = "email"
    TEXT = "text"
    SMS = "sms"
    PROMPT = "prompt"
    FILE = "file"
    ACTION = "action"


class RiskLevel(StrEnum):
    SAFE = "safe"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Decision(StrEnum):
    ALLOW = "ALLOW"
    WARN = "WARN"
    BLOCK = "BLOCK"
    ASK_USER_CONFIRMATION = "ASK_USER_CONFIRMATION"


class Severity(StrEnum):
    INFO = "info"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


# ---------------------------------------------------------------------- evidence
class Evidence(BaseModel):
    source: str = Field(..., description="Module that produced this evidence")
    message: str = Field(..., description="Human-readable (Vietnamese) description")
    severity: Severity = Severity.INFO
    feature: str | None = Field(default=None, description="Technical feature name")
    contribution: float | None = Field(default=None, description="SHAP-like contribution")


# ---------------------------------------------------------------------- requests
class AssessURLRequest(BaseModel):
    url: str = Field(..., max_length=2048)
    context: str | None = Field(default="", description="Surrounding text where URL was found")


class SandboxURLRequest(BaseModel):
    url: str = Field(..., min_length=1, max_length=2048)


class BrowserSandboxRequest(BaseModel):
    url: str = Field(..., min_length=1, max_length=2048)
    canary_mode: Literal["dry_run"] = "dry_run"


class AssessTextRequest(BaseModel):
    text: str = Field(..., max_length=50_000)
    modality: Literal["email", "text", "sms"] = "email"
    metadata: dict[str, Any] | None = None


class AgentContext(BaseModel):
    agent_type: Literal["chat", "browser_agent", "desktop_agent", "coding_agent", "generic"] = (
        "generic"
    )
    agent_id: str | None = None
    session_id: str | None = None
    user_intent: str | None = None
    current_url: str | None = None
    planned_action: str | None = None
    available_assets: list[str] = Field(default_factory=list)
    data_types_involved: list[str] = Field(default_factory=list)
    permission_level: str | None = None


class AssessActionRequest(BaseModel):
    action_type: Literal[
        "open_url", "click_link", "submit_form", "send_email", "download_file",
        "open_file", "execute_file", "copy_data", "call_api", "upload_file",
        "payment_or_transfer",
    ]
    target_url: str | None = None
    target: str | None = None
    data_types: list[str] = Field(default_factory=list)
    agent_context: AgentContext = Field(default_factory=AgentContext)


class ScanPromptRequest(BaseModel):
    content: str = Field(..., max_length=50_000)
    content_type: Literal["email", "webpage", "file", "chat_message", "prompt"] = "webpage"


# --------------------------------------------------------------------- responses
class AssessResponse(BaseModel):
    risk_score: float = Field(..., ge=0.0, le=1.0, description="Normalized 0..1")
    risk_level: RiskLevel
    decision: Decision
    confidence: float = Field(..., ge=0.0, le=1.0)
    modality: Modality
    reasons: list[str] = Field(default_factory=list)
    evidence: list[Evidence] = Field(default_factory=list)
    explanation: str = Field(default="", description="Vietnamese NL explanation (Layer 2)")
    recommended_agent_behavior: str = ""
    model_version: str = "heuristic-1"
    latency_ms: float = 0.0
    request_id: str = ""


class SandboxIssue(BaseModel):
    code: str
    severity: Severity
    category: str
    message: str
    detail: str = ""


class SandboxScanStep(BaseModel):
    key: str
    label: str
    status: Literal["passed", "failed", "skipped"] = "passed"
    detail: str = ""


class SandboxRedirect(BaseModel):
    status_code: int
    from_url: str
    to_url: str


class SandboxNetworkEvent(BaseModel):
    url: str
    method: str = "GET"
    resource_type: str = ""
    status: int | None = None
    blocked: bool = False
    reason: str = ""
    same_origin: bool | None = None


class SandboxCanaryReport(BaseModel):
    enabled: bool = True
    mode: Literal["dry_run"] = "dry_run"
    clone_email: str = ""
    fields_filled: int = 0
    field_types: dict[str, int] = Field(default_factory=dict)
    form_submissions_blocked: int = 0
    exfiltration_blocked: bool = False
    notes: list[str] = Field(default_factory=list)


class SandboxURLResponse(BaseModel):
    ok: bool
    execution_status: Literal["completed", "failed"]
    url: str
    final_url: str = ""
    status_code: int | None = None
    http_reason: str = ""
    content_type: str = ""
    bytes_read: int = 0
    resolved_ip: str = ""
    redirects: list[SandboxRedirect] = Field(default_factory=list)
    tls: dict[str, Any] = Field(default_factory=dict)
    page_title: str = ""
    page_signals: dict[str, Any] = Field(default_factory=dict)
    issues: list[SandboxIssue] = Field(default_factory=list)
    scan_steps: list[SandboxScanStep] = Field(default_factory=list)
    elapsed_ms: float = 0.0

    @classmethod
    def failed(cls, url: str, code: str, message: str, detail: str = ""):
        return cls(
            ok=False,
            execution_status="failed",
            url=url,
            issues=[
                SandboxIssue(
                    code=code,
                    severity=Severity.HIGH,
                    category="execution",
                    message=message,
                    detail=detail,
                )
            ],
            scan_steps=[
                SandboxScanStep(
                    key=code,
                    label="Sandbox execution",
                    status="failed",
                    detail=message,
                )
            ],
        )


class BrowserSandboxURLResponse(BaseModel):
    ok: bool
    execution_status: Literal["completed", "failed"]
    url: str
    final_url: str = ""
    status_code: int | None = None
    page_title: str = ""
    isolation: dict[str, Any] = Field(default_factory=dict)
    canary: SandboxCanaryReport = Field(default_factory=SandboxCanaryReport)
    network_events: list[SandboxNetworkEvent] = Field(default_factory=list)
    browser_events: list[dict[str, Any]] = Field(default_factory=list)
    console_errors: list[str] = Field(default_factory=list)
    issues: list[SandboxIssue] = Field(default_factory=list)
    scan_steps: list[SandboxScanStep] = Field(default_factory=list)
    elapsed_ms: float = 0.0

    @classmethod
    def failed(cls, url: str, code: str, message: str, detail: str = ""):
        return cls(
            ok=False,
            execution_status="failed",
            url=url,
            issues=[
                SandboxIssue(
                    code=code,
                    severity=Severity.HIGH,
                    category="execution",
                    message=message,
                    detail=detail,
                )
            ],
            scan_steps=[
                SandboxScanStep(
                    key=code,
                    label="Browser sandbox execution",
                    status="failed",
                    detail=message,
                )
            ],
        )


class AgentRiskResponse(BaseModel):
    decision: Decision
    risk_level: RiskLevel
    risk_score: float = Field(..., ge=0.0, le=1.0)
    confidence: float = Field(..., ge=0.0, le=1.0)
    verdict: Decision
    safe_summary: str = ""
    reasoning: str = ""
    evidence: list[Evidence] = Field(default_factory=list)
    recommended_agent_behavior: str = ""
    requires_user_confirmation: bool = False
    request_id: str = ""


class ChatRequestWS(BaseModel):
    question: str
    context: dict[str, Any] | None = None
    history: list[dict[str, Any]] = Field(default_factory=list)


class ErrorResponse(BaseModel):
    error: str
    detail: str = ""
    request_id: str = ""


class HealthResponse(BaseModel):
    status: str = "ok"
    models_loaded: bool = False
    llm_available: bool = False
    model_status: dict[str, Any] = Field(default_factory=dict)
    version: str = "0.1.0"
