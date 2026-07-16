# Phase 3: C4 Architecture Documentation

> **Project:** AI Security Armor for Agentic Workflows  
> **Competition:** Cyber Solutions Challenge 2026 — ĐH Nguyễn Tất Thành  
> **Author:** Principal Software Architect & Security Architect  
> **Date:** July 2026

---

## 1. Level 1: System Context Diagram

The AI Security Armor system sits at the intersection of human users browsing the web and AI agents executing autonomous workflows. It acts as a protective layer that evaluates content and intended actions before they reach the user or are executed by the agent.

### Actors & External Systems

| Actor/System | Description | Interaction |
|-------------|-------------|-------------|
| **Human User** | End user browsing the web, reading emails, or chatting with the security assistant | Interacts via Chrome Extension (passive protection) and Web/Desktop/Mobile chat app (active queries) |
| **AI Agent (ChatGPT/Claude)** | Autonomous agent performing tasks on behalf of the user | Calls MCP tools before executing sensitive actions (clicking links, submitting forms, downloading files) |
| **PhishTank / Threat Feeds** | External databases of known malicious URLs | Optional enrichment during URL assessment (not required for MVP offline mode) |
| **Ollama LLM Runtime** | Local inference server for the explanation model | Provides natural language generation capabilities to the Security Gateway |

### System Boundary

The **AI Security Armor System** encompasses all components from the API gateway through the ML models to the policy engine. It does NOT include the AI agents themselves or the user's browser — those are external actors that consume the system's services.

---

## 2. Level 2: Container Diagram

The system is composed of 6 containers, each deployable as an independent process (or Docker container):

### Container 1: Security Gateway API

| Attribute | Detail |
|-----------|--------|
| **Responsibilities** | Central routing hub. Receives all incoming requests (REST, WebSocket, MCP), validates inputs, dispatches to appropriate inference services, aggregates results, and returns structured responses. |
| **Technology** | Python 3.11, FastAPI 0.100+, Uvicorn (ASGI), Pydantic v2 |
| **Dependencies** | Risk Assessment Core (internal), Explanation Service (internal), Ollama (external process) |
| **Interfaces** | REST API (`/v1/assess/*`), WebSocket (`/v1/chat`), Health check (`/v1/health`) |
| **Communication** | HTTPS inbound from Extension/Web clients; internal function calls to inference modules; HTTP to Ollama |
| **Security Boundaries** | All inbound data passes through Unicode normalization, length validation, and Pydantic schema validation before reaching any ML model |

### Container 2: Chrome Extension

| Attribute | Detail |
|-----------|--------|
| **Responsibilities** | Monitors active browser tabs, extracts URLs and visible page text, sends assessment requests to the Gateway API, and renders visual risk indicators (floating badges, warning banners) |
| **Technology** | JavaScript/TypeScript, Chrome Manifest V3, Shadow DOM for UI isolation |
| **Dependencies** | Security Gateway API (external HTTP calls to `localhost:8000`) |
| **Interfaces** | Chrome Extension APIs (`chrome.tabs`, `chrome.runtime`, `chrome.storage`) |
| **Communication** | HTTPS `fetch()` to the local Security Gateway API |
| **Security Boundaries** | Content scripts run in an isolated world. Shadow DOM prevents CSS/JS leakage. Never reads password fields or form data. |

### Container 3: MCP Security Armor Server

| Attribute | Detail |
|-----------|--------|
| **Responsibilities** | Implements the Model Context Protocol to expose security assessment tools directly to AI agents. Translates MCP JSON-RPC calls into internal API requests. |
| **Technology** | Python 3.11, Official MCP Python SDK, SSE transport |
| **Dependencies** | Security Gateway API (internal HTTP or direct function calls) |
| **Interfaces** | MCP Tools: `assess_url`, `assess_text`, `scan_prompt_injection`, `assess_action`, `summarize_risk_safely` |
| **Communication** | SSE (Server-Sent Events) over HTTPS for remote agents; stdio for local agents |
| **Security Boundaries** | All tool arguments validated against Pydantic schemas. No filesystem access. No shell execution. Rate-limited to 30 calls/minute per agent session. |

### Container 4: Robust Risk Assessment Core (Layer 1)

| Attribute | Detail |
|-----------|--------|
| **Responsibilities** | Executes the three specialist ML models to generate risk scores and evidence lists. Handles model loading, ONNX session management, feature extraction, and confidence calibration. |
| **Technology** | Python, ONNX Runtime (GPU), LightGBM, SentencePiece tokenizer |
| **Dependencies** | Model weight files (ONNX format) stored in `ai/models/` |
| **Interfaces** | Python function calls: `evaluate_url()`, `evaluate_text()`, `evaluate_prompt()` |
| **Communication** | In-process function calls from the Security Gateway API |
| **Security Boundaries** | No network access during inference. Models are read-only. Input strings are truncated to maximum safe lengths before tokenization. |

### Container 5: Policy & Action Risk Engine

| Attribute | Detail |
|-----------|--------|
| **Responsibilities** | Applies business rules to convert raw ML risk scores into actionable decisions. Evaluates the `AgentContext` (what assets the agent holds, what action it plans) against configurable thresholds. |
| **Technology** | Pure Python, no external dependencies beyond Pydantic |
| **Dependencies** | Shared schemas (`AgentContext`, `DecisionResponse`) |
| **Interfaces** | `evaluate_policy(risk_data, agent_context) -> DecisionResponse` |
| **Communication** | In-process function calls |
| **Security Boundaries** | Deterministic logic only. No ML inference, no network calls. Defaults to `BLOCK` on ambiguous inputs. |

### Container 6: Explanation Service (Layer 2)

| Attribute | Detail |
|-----------|--------|
| **Responsibilities** | Generates human-readable Vietnamese explanations of security findings. Interfaces with the local Ollama LLM instance. Implements strict prompt templates to prevent hallucination. |
| **Technology** | Python, Ollama Python client, prompt templates |
| **Dependencies** | Ollama process running Qwen2.5-7B-Instruct (Q4_K_M) |
| **Interfaces** | `generate_explanation(evidence, sanitized_text) -> AsyncGenerator[str]` |
| **Communication** | HTTP to `localhost:11434` (Ollama API) |
| **Security Boundaries** | Never receives raw user input. Only receives the evidence list and a sanitized excerpt (first 100 chars, special characters stripped). System prompt explicitly forbids inventing evidence. |

---

## 3. Level 3: Component Diagram (Risk Assessment Core)

The Risk Assessment Core (Container 4) is further decomposed into the following components:

### Component 3.1: Input Sanitizer

**Responsibilities:** Normalizes Unicode (NFC), strips zero-width characters (U+200B, U+FEFF), detects and rejects binary data disguised as text, and enforces maximum input lengths.

**Technology:** Python `unicodedata` module, custom regex patterns.

**Interface:** `sanitize(raw_input: str) -> str`

### Component 3.2: URL Modality Adapter

**Responsibilities:** Extracts 15+ lexical features from a raw URL string for the LightGBM classifier.

**Feature Engineering:**

| Feature | Description | Rationale |
|---------|-------------|-----------|
| `url_length` | Total character count | Phishing URLs tend to be longer |
| `domain_entropy` | Shannon entropy of domain string | Random domains have higher entropy |
| `subdomain_depth` | Number of subdomain levels | Deep subdomains indicate suspicious structure |
| `tld_risk_score` | Risk weight of TLD (.xyz=high, .com=low) | Cheap TLDs are preferred by attackers |
| `has_ip_address` | Whether URL contains raw IP | Legitimate sites rarely use IP addresses |
| `special_char_ratio` | Ratio of @, -, _ in domain | Typosquatting often uses special chars |
| `path_depth` | Number of `/` segments | Deep paths may indicate redirect chains |
| `query_param_count` | Number of query parameters | Excessive params suggest tracking/phishing |
| `has_https` | Boolean HTTPS flag | Phishing sites increasingly use HTTPS |
| `homoglyph_score` | Similarity to known brands | Detects "paypa1.com" vs "paypal.com" |
| `shortlink_flag` | Whether URL is a known shortener | Shortlinks hide true destinations |
| `digit_ratio` | Ratio of digits in domain | "bank0famerica.com" pattern |
| `vowel_consonant_ratio` | Linguistic pattern of domain | Random strings have abnormal ratios |
| `brand_similarity` | Levenshtein distance to top 100 brands | Catches typosquatting attempts |
| `registration_length` | Domain age if available via WHOIS | New domains are higher risk |

**Technology:** `tldextract`, `urllib.parse`, custom Python functions.

**Interface:** `extract_features(url: str) -> np.ndarray` (returns a 15-dimensional float vector)

### Component 3.3: Text/Email Modality Adapter

**Responsibilities:** Tokenizes email content using the mDeBERTa SentencePiece tokenizer. Handles long documents via the chunking strategy (max 450 tokens per chunk). Extracts metadata features (sender domain, link count, urgency keywords).

**Chunking Algorithm:**
1. Split email into sentences using `nltk.sent_tokenize`.
2. Group sentences into chunks of max 450 tokens.
3. Run mDeBERTa on each chunk independently.
4. Aggregate: `final_risk = max(chunk_risks)`, `confidence = weighted_average(chunk_confidences)`.

**Technology:** HuggingFace `AutoTokenizer`, NLTK sentence tokenizer.

**Interface:** `prepare_text(email_body: str, metadata: dict) -> list[TokenizedChunk]`

### Component 3.4: Prompt Injection Adapter

**Responsibilities:** Prepares text for the protectai prompt injection classifier. Handles both explicit injection attempts ("ignore previous instructions") and subtle ones (hidden HTML instructions, role-play manipulation).

**Technology:** HuggingFace `AutoTokenizer` (DeBERTa-v3 tokenizer).

**Interface:** `prepare_prompt(text: str) -> TokenizedInput`

### Component 3.5: Model Inference Engine

**Responsibilities:** Manages ONNX Runtime sessions for all three models. Handles model loading at startup, GPU memory allocation, and graceful fallback to CPU if GPU is unavailable.

**Technology:** `onnxruntime-gpu`, `numpy`.

**Interface:**
```python
class InferenceEngine:
    def __init__(self, model_paths: dict[str, Path]):
        """Load all ONNX models at startup."""
    
    def predict_url(self, features: np.ndarray) -> RiskScore:
        """LightGBM inference on CPU. Returns risk_score and feature importances."""
    
    def predict_text(self, tokens: TokenizedChunk) -> RiskScore:
        """mDeBERTa inference on GPU. Returns risk_score and attention weights."""
    
    def predict_prompt(self, tokens: TokenizedInput) -> RiskScore:
        """protectai DeBERTa inference on GPU. Returns injection probability."""
```

### Component 3.6: Confidence Calibrator

**Responsibilities:** Applies temperature scaling or Platt scaling to raw model logits to produce well-calibrated probability scores. This ensures that a `confidence: 0.9` truly means "90% of the time this prediction is correct."

**Technology:** `scikit-learn` isotonic regression (fitted on validation set during training).

**Interface:** `calibrate(raw_logit: float, modality: str) -> float`

### Component 3.7: Evidence Generator

**Responsibilities:** Converts model outputs into human-readable evidence strings. For LightGBM, uses SHAP values to identify the top contributing features. For transformers, extracts attention-highlighted tokens.

**Technology:** `shap` library (for LightGBM), custom attention extraction (for transformers).

**Interface:** `generate_evidence(model_output: dict, modality: str) -> list[Evidence]`

---

## 4. Data Flow Summary

```
User/Agent Input
      │
      ▼
[Input Sanitizer] ──── rejects malformed input
      │
      ▼
[Modality Router] ──── determines URL/Text/Prompt
      │
      ├──► [URL Adapter] → [LightGBM ONNX] → risk_score + SHAP evidence
      ├──► [Text Adapter] → [mDeBERTa ONNX] → risk_score + attention evidence  
      └──► [Prompt Adapter] → [protectai ONNX] → injection_probability
      │
      ▼
[Confidence Calibrator] ──── calibrates raw scores
      │
      ▼
[Evidence Generator] ──── creates human-readable evidence list
      │
      ▼
[Policy & Action Risk Engine] ──── applies AgentContext rules
      │
      ▼
[Decision: ALLOW / WARN / BLOCK / ASK_USER_CONFIRMATION]
      │
      ├──► [Chrome Extension] → Badge update (immediate)
      └──► [Explanation Service] → Vietnamese summary (async, streaming)
```

---

## 5. Technology Choices Summary

| Layer | Technology | Version | License | Justification |
|-------|-----------|---------|---------|---------------|
| API Framework | FastAPI | 0.100+ | MIT | Async-native, Pydantic integration, auto-docs |
| ML Inference | ONNX Runtime | 1.16+ | MIT | Cross-platform, GPU acceleration, small footprint |
| URL Model | LightGBM | 4.0+ | MIT | Best accuracy/latency ratio for tabular features |
| Text Model | mDeBERTa-v3-base | HF | MIT | Multilingual, 86M params, DeBERTa-v3 architecture |
| Injection Model | protectai/deberta-v3-base-v2 | HF | Apache 2.0 | Pre-trained, 99.98% F1, zero training cost |
| LLM | Qwen2.5-7B-Instruct | Ollama | Apache 2.0 | Best multilingual 7B model, Vietnamese support |
| Extension | Chrome Manifest V3 | V3 | N/A | Required by Chrome for new extensions |
| MCP | Official Python SDK | Latest | MIT | Standard protocol for AI agent integration |
| Containerization | Docker Compose | Latest | Apache 2.0 | Single-command deployment for demo |
