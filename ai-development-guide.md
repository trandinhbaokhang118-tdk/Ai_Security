# Phase 8: AI Coding Agent Development Guide

> **Project:** AI Security Armor for Agentic Workflows  
> **Competition:** Cyber Solutions Challenge 2026 — ĐH Nguyễn Tất Thành  
> **Author:** Principal Software Architect & Security Architect  
> **Date:** July 2026

---

## 1. Global Context

### Project Vision

You are building **AI Security Armor** — a system that protects both human users and AI agents from security threats. The product has three delivery channels:

1. **Chrome Extension** — Real-time URL/page risk badges for human users browsing the web.
2. **MCP Server** — Security assessment tools for AI agents (ChatGPT, Claude) to call before executing actions.
3. **Chat App** — Conversational security assistant powered by local LLM for users who want to ask questions.

All three channels share the same backend: a FastAPI server running three specialist ML models (Layer 1) and a local LLM for explanations (Layer 2).

### Architecture Mental Model

```
Think of it as a security checkpoint at an airport:

Layer 1 (ML Models) = X-ray machines — fast, automated, binary decision
Layer 2 (LLM)       = Security officer — explains findings in human language
Policy Engine       = Rules book — determines what action to take based on findings
MCP Server          = Radio channel — how agents communicate with the checkpoint
Extension           = Display screen — how humans see the results
```

### Critical Design Principles

1. **Layer 1 NEVER calls Layer 2.** They are independent. Layer 1 is fast (< 100ms). Layer 2 is slow (2-5s) and optional.
2. **The Policy Engine is deterministic.** No ML, no randomness. Same input always produces same output.
3. **Raw user content NEVER reaches the LLM directly.** Only sanitized evidence passes to Layer 2.
4. **Default to BLOCK on ambiguity.** If the system cannot determine safety, it blocks.
5. **Every response includes latency_ms.** We must prove speed to judges.

---

## 2. Technology Stack & Versions

| Component | Technology | Version | Import Pattern |
|-----------|-----------|---------|----------------|
| API Framework | FastAPI | >= 0.100.0 | `from fastapi import FastAPI, APIRouter` |
| Data Validation | Pydantic | >= 2.0.0 | `from pydantic import BaseModel, Field` |
| ML Inference | ONNX Runtime GPU | >= 1.16.0 | `import onnxruntime as ort` |
| URL Features | LightGBM | >= 4.0.0 | `import lightgbm as lgb` |
| Tokenization | HuggingFace Transformers | >= 4.35.0 | `from transformers import AutoTokenizer` |
| Domain Parsing | tldextract | >= 5.0.0 | `import tldextract` |
| Sentence Splitting | NLTK | >= 3.8.0 | `from nltk.tokenize import sent_tokenize` |
| LLM Client | Ollama | >= 0.1.0 | `import ollama` |
| MCP SDK | mcp | latest | `from mcp.server import Server` |
| Rate Limiting | slowapi | >= 0.1.8 | `from slowapi import Limiter` |
| Testing | pytest + pytest-asyncio | latest | `import pytest` |

---

## 3. File-Level Coding Constraints

### 3.1. `shared/schemas/` — Data Contracts

**MUST:**
- Use Pydantic v2 `BaseModel` with strict type annotations.
- Include `Field(...)` with descriptions for every field.
- Use `Enum` classes for all categorical values.
- Include `model_config = ConfigDict(json_schema_extra={...})` with example payloads.

**MUST NOT:**
- Import anything from `backend/`, `ai/`, or `security/` (no circular dependencies).
- Include business logic or validation beyond type checking.
- Use `Any` type — all fields must be explicitly typed.

**Pattern:**
```python
from pydantic import BaseModel, Field, ConfigDict
from enum import Enum

class Decision(str, Enum):
    ALLOW = "allow"
    WARN = "warn"
    BLOCK = "block"
    ASK_USER_CONFIRMATION = "ask_user_confirmation"

class AssessResponse(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "decision": "block",
            "risk_score": 0.92,
            "evidence": [{"source": "url_adapter", "message": "...", "severity": "high"}]
        }
    })
    
    decision: Decision
    risk_score: float = Field(..., ge=0.0, le=1.0)
    # ... etc
```

---

### 3.2. `backend/routers/` — API Layer

**MUST:**
- Use `async def` for all route handlers.
- Return Pydantic models directly (FastAPI handles serialization).
- Use dependency injection for services (`Depends(get_inference_service)`).
- Include `response_model` in route decorators for OpenAPI docs.
- Measure and include `latency_ms` in every response.

**MUST NOT:**
- Contain business logic (delegate to `services/`).
- Contain ML inference code (delegate to `ai/`).
- Catch and silence exceptions (let FastAPI's exception handlers deal with them).
- Use synchronous blocking calls.

**Pattern:**
```python
from fastapi import APIRouter, Depends
from time import perf_counter

router = APIRouter(prefix="/v1/assess", tags=["Assessment"])

@router.post("/url", response_model=AssessResponse)
async def assess_url(
    request: AssessURLRequest,
    service: InferenceService = Depends(get_inference_service),
    policy: PolicyEngine = Depends(get_policy_engine),
):
    start = perf_counter()
    
    risk_data = await service.assess_url(request.url)
    decision = policy.evaluate(risk_data["risk_score"], risk_data["evidence"])
    
    decision.latency_ms = (perf_counter() - start) * 1000
    return decision
```

---

### 3.3. `backend/services/` — Service Layer

**MUST:**
- Use `asyncio.to_thread()` for CPU-bound ML inference to avoid blocking the event loop.
- Implement graceful degradation (if a model fails, return `risk_level: "unknown"` instead of crashing).
- Log all inference calls with structured logging (`structlog`).

**MUST NOT:**
- Import from `routers/` (services are independent of the transport layer).
- Hold mutable state between requests (stateless design).

**Pattern:**
```python
import asyncio
import structlog

logger = structlog.get_logger()

class InferenceService:
    def __init__(self, engine: InferenceEngine):
        self.engine = engine
    
    async def assess_url(self, url: str) -> dict:
        """Thread-safe URL assessment."""
        try:
            features = extract_url_features(url)
            result = await asyncio.to_thread(self.engine.predict_url, features)
            evidence = generate_url_evidence(features, result)
            logger.info("url_assessed", url=url[:50], risk_score=result["risk_score"])
            return {"risk_score": result["risk_score"], "evidence": evidence}
        except Exception as e:
            logger.error("url_assessment_failed", error=str(e))
            return {"risk_score": 0.5, "evidence": [], "error": str(e)}
```

---

### 3.4. `ai/adapters/` — Feature Extraction

**MUST:**
- Be pure functions (no side effects, no network calls).
- Handle edge cases gracefully (empty strings, None values, extremely long inputs).
- Include type hints for all parameters and return values.
- Truncate inputs to safe maximum lengths before processing.

**MUST NOT:**
- Import `onnxruntime` or any inference library (adapters only prepare data).
- Make network calls or file system operations.
- Raise exceptions for malformed input (return safe defaults instead).

---

### 3.5. `ai/inference/` — Model Execution

**MUST:**
- Load all ONNX sessions once at startup (in `__init__`).
- Use `ort.InferenceSession` with explicit provider list.
- Implement `_softmax()` for converting logits to probabilities.
- Be thread-safe (ONNX Runtime sessions are thread-safe by default).

**MUST NOT:**
- Import `torch` or `transformers` (only `onnxruntime` for production inference).
- Re-load models on every request.
- Allocate new numpy arrays unnecessarily (reuse buffers where possible).

---

### 3.6. `security/` — Policy Engine

**MUST:**
- Be pure Python with zero external dependencies (except Pydantic from `shared/`).
- Be fully deterministic (no randomness, no ML, no network calls).
- Default to `BLOCK` when inputs are ambiguous or malformed.
- Include comprehensive docstrings explaining each rule's rationale.

**MUST NOT:**
- Import anything from `ai/` or `backend/`.
- Make any I/O operations (no files, no network, no database).
- Use floating point comparisons without epsilon tolerance.

---

### 3.7. `backend/mcp_server.py` — MCP Server

**MUST:**
- Use the official MCP Python SDK (`from mcp.server import Server`).
- Register all tools with complete `inputSchema` including descriptions.
- Validate all tool arguments before processing.
- Return structured JSON in tool results (not free-form text).

**MUST NOT:**
- Expose filesystem operations or shell commands.
- Allow tool arguments to be used in string interpolation without validation.
- Run without rate limiting.

---

### 3.8. `frontend/extension/` — Chrome Extension

**MUST:**
- Use Manifest V3 (not V2).
- Use `chrome.action` API (not deprecated `chrome.browserAction`).
- Use Shadow DOM for all injected UI elements.
- Include error handling for when the backend is unreachable.
- Cache results to avoid redundant API calls.

**MUST NOT:**
- Use `eval()` or `new Function()` (forbidden in Manifest V3).
- Request `<all_urls>` host permission without justification.
- Read `input[type=password]` or `input[type=credit-card]` fields.
- Use `innerHTML` with untrusted data (XSS risk).
- Include external CDN scripts (all code must be bundled).

---

## 4. Testing Requirements

### Unit Tests

Every module must have corresponding unit tests in `tests/unit/`. Tests must:
- Cover all public functions.
- Include edge cases (empty input, maximum length input, malformed input).
- Use pytest fixtures from `tests/conftest.py` for shared test data.
- Mock external dependencies (Ollama, ONNX sessions) using `unittest.mock`.

### Integration Tests

Integration tests in `tests/integration/` must:
- Test the full request-response cycle through FastAPI's `TestClient`.
- Verify correct HTTP status codes and response schemas.
- Test error handling (model unavailable, timeout, invalid input).

### Adversarial Tests

Adversarial tests in `tests/adversarial/` must:
- Test URL obfuscation techniques (percent encoding, Unicode, IP address).
- Test text manipulation (homoglyphs, zero-width characters, language mixing).
- Test prompt injection bypass attempts against the protectai model.

---

## 5. Error Handling Patterns

```python
# Pattern: Graceful degradation with structured logging
async def assess_with_fallback(content: str, modality: str) -> AssessResponse:
    try:
        result = await primary_assessment(content, modality)
        return result
    except ModelNotLoadedError:
        logger.warning("model_unavailable", modality=modality)
        return AssessResponse(
            decision=Decision.WARN,
            risk_level=RiskLevel.MEDIUM,
            risk_score=0.5,
            confidence=0.0,  # Zero confidence = "I don't know"
            evidence=[Evidence(source="system", message="Model unavailable, defaulting to caution", severity="medium")],
            safe_summary="Hệ thống không thể đánh giá chính xác. Vui lòng cẩn thận."
        )
    except TimeoutError:
        logger.error("inference_timeout", modality=modality)
        return AssessResponse(decision=Decision.BLOCK, ...)  # Default to block on timeout
```

---

## 6. Performance Budgets

| Operation | Target | Hard Limit | Measurement |
|-----------|--------|-----------|-------------|
| URL assessment (full pipeline) | 15ms | 50ms | `latency_ms` in response |
| Text assessment (single chunk) | 50ms | 100ms | `latency_ms` in response |
| Text assessment (long email, 5 chunks) | 80ms | 200ms | Parallel chunk processing |
| Prompt injection scan | 50ms | 100ms | `latency_ms` in response |
| Policy Engine evaluation | 1ms | 5ms | Internal timing |
| LLM explanation (first token) | 500ms | 2000ms | WebSocket timing |
| Extension badge update | 200ms | 500ms | From navigation to badge color change |
| MCP tool response | 100ms | 300ms | From JSON-RPC request to response |

---

## 7. Git Workflow

- **Branch naming:** `feature/TSK-XXX-short-description`
- **Commit messages:** `[TSK-XXX] Brief description of change`
- **PR requirements:** At least 1 approval, CI passes, no linting errors.
- **Merge strategy:** Squash merge to keep history clean.

---

## 8. Environment Setup for AI Agents

Before starting any task, the AI coding agent must:

1. **Read `shared/schemas/models.py`** — understand all data contracts.
2. **Read `backend/config.py`** — understand all configuration options.
3. **Read the specific task description** from the Engineering Backlog (Phase 7).
4. **Check existing code** in the target files (they may already have partial implementations).

After completing a task, the AI coding agent must:

1. **Run `ruff check .`** — ensure no linting errors.
2. **Run `pytest tests/unit/`** — ensure no test regressions.
3. **Provide a brief summary** of what was implemented and how it satisfies the acceptance criteria.

---

## 9. Security Checklist for Every PR

Before merging any code, verify:

- [ ] No raw user input passed to LLM without sanitization.
- [ ] No `eval()`, `exec()`, or `subprocess.run()` with user-controlled strings.
- [ ] No secrets or API keys hardcoded (use environment variables).
- [ ] No `innerHTML` with untrusted data in extension code.
- [ ] Input length limits enforced before processing.
- [ ] Error messages do not leak internal system details.
- [ ] Rate limiting applied to all public endpoints.
