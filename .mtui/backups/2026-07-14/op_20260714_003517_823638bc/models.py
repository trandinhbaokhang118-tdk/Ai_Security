"""Pydantic models for demo/showcase API endpoints.

These models define request/response schemas for the demo system,
including URL analysis, chatbot protection, attack simulation, and metrics.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


# ------------------------------------------------------------------ Evidence
class Evidence(BaseModel):
    """Evidence of malicious behavior - matches shared.schemas.Evidence."""

    source: str = Field(..., description="Module that produced this evidence")
    message: str = Field(..., description="Human-readable description")
    severity: Literal["info", "low", "medium", "high", "critical"] = "info"
    feature: str | None = Field(
        default=None, description="Technical feature name that triggered detection"
    )
    contribution: float | None = Field(default=None, description="SHAP-like contribution score")


# ------------------------------------------------------------- Sandbox Models
class SandboxReport(BaseModel):
    """Report from sandbox URL analysis containing observed behaviors."""

    behaviors: list[dict] = Field(
        default_factory=list,
        description="Suspicious behaviors detected (e.g., multiple redirects, excessive scripts)",
    )
    redirects: list[dict] = Field(
        default_factory=list, description="URL redirects observed during execution"
    )
    scripts_executed: list[str] = Field(
        default_factory=list, description="JavaScript sources loaded by the page"
    )
    network_calls: list[str] = Field(
        default_factory=list, description="Network requests made by the page"
    )
    dom_modifications: list[dict] = Field(
        default_factory=list, description="DOM changes detected during execution"
    )
    cookies_set: list[dict] = Field(default_factory=list, description="Cookies set by the page")
    storage_access: list[dict] = Field(
        default_factory=list, description="LocalStorage/SessionStorage access"
    )
    analysis_time_ms: int = Field(
        default=0, description="Time spent analyzing in sandbox (milliseconds)"
    )
    error: str | None = Field(default=None, description="Error message if analysis failed")


# ------------------------------------------------------------ Detection Models
class TraditionalDetection(BaseModel):
    """Results from traditional (non-AI) detection methods."""

    detected: bool = Field(..., description="Whether threat was detected by traditional methods")
    methods: list[str] = Field(
        default_factory=list,
        description="Detection methods used (e.g., 'blacklist', 'heuristic', 'signature')",
    )


class AIDetection(BaseModel):
    """Results from AI-powered detection."""

    detected: bool = Field(..., description="Whether threat was detected by AI model")
    confidence: float = Field(
        ..., ge=0.0, le=1.0, description="Model confidence score (0.0 to 1.0)"
    )
    model_version: str = Field(default="", description="AI model version used for detection")


# ------------------------------------------------------- URL Analysis Endpoints
class URLAnalysisRequest(BaseModel):
    """Request to analyze a URL for phishing/malicious content."""

    url: str = Field(..., max_length=2048, description="URL to analyze")
    deep_analysis: bool = Field(
        default=False, description="Enable sandbox analysis (slower but more detailed)"
    )
    advanced_analysis: bool = Field(
        default=False,
        description="Run browser sandbox with synthetic canaries for ambiguous/high-risk URLs",
    )


class URLScoreLayer(BaseModel):
    """Explainable result of one defensive URL-analysis layer."""

    layer: str
    score: float = Field(..., ge=0.0, le=1.0)
    status: Literal["completed", "skipped", "unavailable"] = "completed"
    summary: str
    signals: int = 0


class URLAnalysisResponse(BaseModel):
    """Response containing URL analysis results."""

    url: str = Field(..., description="The analyzed URL")
    risk_score: float = Field(
        ..., ge=0.0, le=1.0, description="Overall risk score (0.0=safe to 1.0=critical)"
    )
    threat_level: Literal["safe", "low", "medium", "high", "critical"] = Field(
        ..., description="Categorized threat level"
    )
    analysis_time_ms: int = Field(..., description="Time taken to analyze (milliseconds)")
    traditional_detection: TraditionalDetection = Field(
        ..., description="Results from traditional detection methods"
    )
    ai_detection: AIDetection = Field(..., description="Results from AI detection")
    evidence: list[Evidence] = Field(
        default_factory=list, description="Evidence supporting the threat assessment"
    )
    sandbox_report: SandboxReport | None = Field(
        default=None, description="Detailed sandbox analysis report (if deep_analysis=True)"
    )


# ---------------------------------------------------- Deepfake Image Endpoint
class DeepfakeImageResponse(BaseModel):
    """Local still-image authenticity screening result."""

    filename: str
    width: int
    height: int
    image_format: str
    real_probability: float = Field(..., ge=0.0, le=1.0)
    fake_probability: float = Field(..., ge=0.0, le=1.0)
    verdict: Literal["likely_real", "likely_fake", "uncertain"]
    decision: Literal["ALLOW", "WARN", "REVIEW"]
    analysis_time_ms: int
    model_version: str
    evidence: list[str]
    limitations: list[str]


# ---------------------------------------------------- Chat Protection Endpoints
class ChatMessageRequest(BaseModel):
    """Request to process a chatbot message with optional protection."""

    message: str = Field(..., max_length=50_000, description="User message to the chatbot")
    protection_enabled: bool = Field(
        ..., description="Whether to enable prompt injection protection"
    )
    session_id: str = Field(
        ..., description="Session ID for tracking metrics and conversation context"
    )


class ChatMessageResponse(BaseModel):
    """Response from chatbot with protection analysis."""

    response: str = Field(..., description="Chatbot response to the user message")
    blocked: bool = Field(..., description="Whether the message was blocked due to injection")
    injection_detected: bool = Field(..., description="Whether prompt injection was detected")
    risk_score: float = Field(..., ge=0.0, le=1.0, description="Prompt injection risk score")
    analysis_time_ms: int = Field(..., description="Time taken to analyze prompt (milliseconds)")
    model_version: str = Field(default="", description="Detector used for the decision")
    evidence: list[Evidence] = Field(
        default_factory=list, description="Signals that caused the prompt decision"
    )
    downstream_reached: bool = Field(
        default=False, description="Whether the request reached the demo chatbot"
    )
    canary_exposed: bool = Field(
        default=False, description="Whether the sandbox canary was exposed"
    )
    simulated_action: str | None = Field(
        default=None, description="Sandbox-only action attempted by the vulnerable bot"
    )
    trace: list[str] = Field(default_factory=list, description="Human-readable processing trace")


# ----------------------------------------------- Training Data Guard Demo
class TrainingDataDemoRequest(BaseModel):
    """Run a deterministic training-data poisoning comparison."""

    scenario: Literal["label_flip", "instruction_injection"] = "label_flip"


class TrainingRecordResult(BaseModel):
    """Inspection result for one training record."""

    record_id: str
    label: int
    preview: str
    text_risk: float
    prompt_risk: float
    decision: Literal["accept", "quarantine"]
    reason: str


class TrainingStageResult(BaseModel):
    """Before/after state of the training ingestion pipeline."""

    accepted: int
    quarantined: int
    poisoned_records_in_training: int
    outcome: str


class TrainingDataDemoResponse(BaseModel):
    """A/B result for an unsafe and protected training-data pipeline."""

    scenario: Literal["label_flip", "instruction_injection"]
    title: str
    total_records: int
    before: TrainingStageResult
    after: TrainingStageResult
    records: list[TrainingRecordResult]
    detector_version: str


# -------------------------------------------------- Attack Simulation Endpoints
class SimulateAttackRequest(BaseModel):
    """Request to simulate a batch of attacks for demonstration."""

    scenario: Literal["basic", "advanced", "mixed", "custom"] = Field(
        ..., description="Attack sophistication level"
    )
    attack_type: Literal["url", "prompt", "mixed"] = Field(
        ..., description="Type of attacks to simulate"
    )
    count: int = Field(default=10, ge=1, le=100, description="Number of attacks to simulate")
    protection_enabled: bool = Field(
        ..., description="Whether protection should be enabled during simulation"
    )


class SimulateAttackResponse(BaseModel):
    """Response confirming attack simulation started."""

    simulation_id: str = Field(..., description="Unique identifier for this simulation")
    total_attacks: int = Field(..., description="Total number of attacks that will be executed")
    started_at: datetime = Field(
        default_factory=datetime.now, description="Timestamp when simulation started"
    )


# ----------------------------------------------------------- Metrics Endpoints
class AttackMetrics(BaseModel):
    """Metrics for attacks with a specific protection state."""

    attack_count: int = Field(default=0, description="Total number of attacks attempted")
    blocked_count: int = Field(default=0, description="Number of attacks blocked")
    success_count: int = Field(
        default=0, description="Number of attacks that succeeded (not blocked)"
    )
    block_rate: float = Field(
        default=0.0, ge=0.0, le=100.0, description="Percentage of attacks blocked"
    )
    success_rate: float = Field(
        default=0.0,
        ge=0.0,
        le=100.0,
        description="Percentage of attacks that succeeded (lower is better)",
    )
    avg_time_ms: float = Field(
        default=0.0, description="Average processing time per attack (milliseconds)"
    )


class MetricsResponse(BaseModel):
    """Real-time metrics for a demo session."""

    session_id: str = Field(..., description="Session identifier")
    protection_off: AttackMetrics = Field(
        default_factory=AttackMetrics, description="Metrics when protection is disabled"
    )
    protection_on: AttackMetrics = Field(
        default_factory=AttackMetrics, description="Metrics when protection is enabled"
    )
    improvement_percentage: float = Field(
        default=0.0,
        description="Percentage improvement in security when protection is enabled",
    )
