# Phase 2: Architecture Validation Review

> **Project:** AI Security Armor for Agentic Workflows  
> **Competition:** Cyber Solutions Challenge 2026 — ĐH Nguyễn Tất Thành  
> **Author:** Principal Software Architect & Security Architect  
> **Date:** July 2026

---

## 1. System Boundaries

The system operates within three distinct trust boundaries:

| Boundary | Components | Trust Level |
|----------|-----------|-------------|
| **User Device** | Chrome Extension, Desktop App | Partially trusted (user's machine) |
| **Server Core** | FastAPI Gateway, ML Models, Policy Engine, LLM | Fully trusted (controlled by team) |
| **External Agents** | ChatGPT, Claude, custom agents via MCP | Untrusted (inputs must be validated) |

**Validation:** The separation is architecturally sound. The critical insight is that MCP requests from external agents must be treated with the same suspicion as user inputs — they could contain adversarial payloads designed to bypass the detection system.

**Improvement:** Add an explicit "Input Sanitization Layer" at the Gateway level that normalizes Unicode, strips zero-width characters, and detects encoding attacks before content reaches the ML models.

---

## 2. Service Architecture

### 2.1. Two-Layer Inference Architecture

The finalized architecture uses a **two-layer inference model**:

```
Layer 1: Fast Classifiers (< 100ms)
├── LightGBM URL Classifier (~5ms, CPU)
├── mDeBERTa-v3-base Text Classifier (~40ms, GPU)
└── protectai DeBERTa Prompt Injection (~50ms, GPU)

Layer 2: Explanation LLM (2-5 seconds, async)
└── Qwen2.5-7B-Instruct via Ollama (streaming)
```

**Validation:** This separation is critical for UX. The Chrome Extension badge updates instantly (Layer 1 response), while the detailed explanation streams in the background (Layer 2). Users perceive the system as "instant" because the binary safe/unsafe signal arrives in < 100ms.

**Improvement:** Implement a **confidence threshold** to skip Layer 2 entirely for obvious cases:
- If `risk_score > 0.95` → immediate `BLOCK`, no explanation needed (the badge is red, done).
- If `risk_score < 0.1` → immediate `ALLOW`, no explanation needed (the badge is green, done).
- Only invoke the LLM for ambiguous cases (`0.1 < risk_score < 0.95`) where the user might want to understand why.

### 2.2. Model Selection Justification

| Model | Algorithm | Why This Over Alternatives |
|-------|-----------|---------------------------|
| **LightGBM** (URL) | Gradient Boosted Decision Trees | URLs are short strings where handcrafted lexical features (entropy, TLD, length) outperform transformers. LightGBM achieves 95-98% F1 with <5ms latency vs. URLTran (97-99% but 30ms and requires pre-training). For a 10-day MVP, the 2% F1 trade-off is justified by 6x faster inference and zero GPU cost. |
| **mDeBERTa-v3-base** (Text) | Disentangled Attention Transformer | Chosen over ViDeBERTa-base (monolingual VN) because the product must handle both Vietnamese and English emails. mDeBERTa supports 100 languages with only 1-3% lower F1 on Vietnamese compared to ViDeBERTa, but eliminates the need for a separate English model. Chosen over XLM-RoBERTa (278M params) because mDeBERTa achieves higher accuracy with 3x fewer parameters due to the DeBERTa-v3 architecture's disentangled attention mechanism. |
| **protectai/deberta-v3-base-v2** (Injection) | Fine-tuned DeBERTa-v3 | Pre-trained on 289K prompt injection samples. Achieves 99.98% F1 without any additional training. The alternative (fine-tuning mDeBERTa ourselves) would require collecting a comparable dataset and spending 3-4 GPU hours, with likely lower accuracy (~95-97%). Using a production-grade pre-trained model is the rational engineering decision. |
| **Qwen2.5-7B-Instruct** (Explanation) | Causal Language Model | Chosen over Llama-3.1-8B because Qwen2.5 has superior multilingual performance (especially CJK languages including Vietnamese). Chosen over GPT-4o-mini API because the product must demonstrate offline capability and data privacy (no user emails sent to OpenAI). Q4 quantization reduces VRAM from 14GB to 4.5GB while maintaining coherent Vietnamese generation. |

---

## 3. API Design

### 3.1. REST API Endpoints

```
POST /v1/assess/url          → Quick URL risk check
POST /v1/assess/text         → Email/SMS/text risk check
POST /v1/assess/prompt       → Prompt injection scan
POST /v1/assess/action       → Agentic action risk evaluation
POST /v1/explain             → Generate LLM explanation (async/streaming)
GET  /v1/health              → Health check with model status
```

**Validation:** The endpoint design correctly separates concerns. Each endpoint maps to a specific modality adapter.

**Improvement:** Add a **batch endpoint** for the Chrome Extension use case where multiple URLs on a page need to be checked simultaneously:

```
POST /v1/assess/batch        → Accepts array of URLs, returns array of risk scores
```

### 3.2. WebSocket for Chat Interface

The chat interface (Web/Desktop/Mobile) requires bidirectional streaming for the LLM responses:

```
WS /v1/chat                  → Streaming chat with security context
```

The WebSocket handler must:
1. Receive the user's message.
2. Extract any URLs or content to analyze.
3. Run Layer 1 classifiers.
4. Stream Layer 2 LLM response token-by-token.

---

## 4. Database Design

For the 10-day MVP, **no persistent database is required**. The system is stateless — each request is evaluated independently. However, for the polish phase:

| Data | Storage | Purpose |
|------|---------|---------|
| Scan history | SQLite (local file) | Dashboard showing recent scans |
| Model metrics | MLflow (local) | Experiment tracking |
| Training data | DVC (Git LFS) | Dataset versioning |

**Improvement:** If time permits, add a Redis cache to avoid re-evaluating the same URL within a 5-minute window. This improves perceived performance for the Chrome Extension (which might check the same URL multiple times as the user navigates).

---

## 5. Authentication & Authorization

### 5.1. Extension ↔ Server Communication

For the MVP (single-user, local deployment), authentication is simplified:
- The Extension includes a hardcoded API key in its requests.
- The FastAPI server validates this key via a simple middleware.

**Improvement for production:** Replace with OAuth2 PKCE flow for multi-user scenarios.

### 5.2. MCP Server Authentication

The MCP protocol handles authentication at the transport level:
- **stdio transport:** No auth needed (same machine).
- **SSE transport (remote):** The tunnel URL should include a bearer token in the connection handshake.

---

## 6. Error Handling Strategy

| Error Type | Handling | User Impact |
|-----------|----------|-------------|
| Model loading failure | Retry 3x, then mark model as unavailable | Degraded mode (skip that modality) |
| ONNX inference exception | Catch, log, return `risk_level: "unknown"` | Extension shows gray badge |
| LLM timeout (>10s) | Cancel, return template explanation | User gets basic explanation |
| Invalid input (too long) | Truncate to max_tokens, log warning | Partial analysis |
| Network failure (Extension) | Show cached result or "offline" badge | User knows system is disconnected |

---

## 7. Configuration Management

All configuration must be externalized via environment variables or a `.env` file:

```env
# Model paths
MODEL_URL_PATH=./ai/models/url_lgbm.onnx
MODEL_TEXT_PATH=./ai/models/mdeberta_text.onnx
MODEL_PROMPT_PATH=./ai/models/protectai_prompt.onnx

# LLM
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b-instruct-q4_K_M

# Server
API_HOST=0.0.0.0
API_PORT=8000
API_KEY=your-secret-key

# Thresholds
RISK_THRESHOLD_BLOCK=0.85
RISK_THRESHOLD_WARN=0.5
RISK_THRESHOLD_ALLOW=0.15
```

---

## 8. Deployment Architecture

```
Developer's Machine (RTX 3060+ GPU, 16GB+ RAM)
├── Docker Container: FastAPI Backend (port 8000)
│   ├── ONNX Runtime (GPU)
│   ├── LightGBM (CPU)
│   └── Policy Engine
├── Docker Container: Ollama (port 11434)
│   └── Qwen2.5-7B-Instruct Q4
├── MCP Server Process (port 3001, SSE)
├── Cloudflare Tunnel → your-domain.com
│   └── Routes to port 3001 (MCP) and port 8000 (API)
└── Chrome Extension (loaded unpacked in browser)
    └── Connects to localhost:8000
```

**Validation:** This deployment model is appropriate for a competition demo. Everything runs on one machine, eliminating network latency between components.

---

## 9. Security Architecture

### 9.1. Defense in Depth

```
Input → Unicode Normalization → Length Validation → Schema Validation → ML Inference → Policy Engine → Output
```

Each layer independently validates and sanitizes data, ensuring that even if one layer is bypassed, subsequent layers catch the attack.

### 9.2. Principle of Least Privilege

| Component | Permissions |
|-----------|------------|
| Chrome Extension | `activeTab`, `storage` only (no `<all_urls>`) |
| FastAPI Server | Non-root user, no filesystem write except logs |
| MCP Server | Read-only access to model files |
| Ollama | Isolated container, no network egress |

---

## 10. Monitoring & Observability

For the competition demo, implement lightweight observability:

| Signal | Tool | Purpose |
|--------|------|---------|
| Request latency | `structlog` + custom middleware | Prove < 300ms p95 to judges |
| Model confidence distribution | Logged per request | Identify edge cases |
| Policy decisions | Logged per request | Audit trail for demo |
| GPU utilization | `nvidia-smi` periodic check | Ensure no OOM during demo |

---

## 11. Scalability Path (Post-Competition)

While not required for the MVP, document the scaling strategy for judges who ask "how would this scale?":

| Current (MVP) | Future (Production) |
|---------------|-------------------|
| Single server | Kubernetes cluster with GPU nodes |
| SQLite | PostgreSQL with read replicas |
| Local Ollama | vLLM with batched inference |
| Hardcoded API key | OAuth2 + API gateway (Kong/Traefik) |
| Single user | Multi-tenant with rate limiting per user |

This demonstrates architectural maturity without over-engineering the MVP.
