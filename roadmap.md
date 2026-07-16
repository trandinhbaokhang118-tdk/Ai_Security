# Phase 6: Development Roadmap

> **Project:** AI Security Armor for Agentic Workflows  
> **Competition:** Cyber Solutions Challenge 2026 — ĐH Nguyễn Tất Thành  
> **Author:** Principal Software Architect & Security Architect  
> **Date:** July 2026

---

## Timeline Overview

| Phase | Days | Focus | Team Allocation |
|-------|------|-------|-----------------|
| **Sprint 1: Foundation** | Days 1-2 | Infrastructure, contracts, dev environment | All 5 devs |
| **Sprint 2: Risk Core** | Days 3-5 | ML models training + inference pipeline | 3 ML + 2 Backend |
| **Sprint 3: Intelligence** | Days 6-7 | Policy Engine + LLM Explanation | 2 Security + 1 Backend + 2 Frontend |
| **Sprint 4: Integration** | Days 8-9 | MCP Server + Chrome Extension | 2 MCP + 2 Extension + 1 Integration |
| **Sprint 5: Demo Ready** | Day 10 | End-to-end testing + demo scenarios | All 5 devs |
| **Sprint 6: Polish** | Days 11-14 | Adversarial Lab + Dashboard + Presentation | All 5 devs |

---

## Milestone 1: Foundation & Infrastructure (Days 1-2)

### Objectives
Establish the monorepo structure, define all API contracts in Pydantic, set up Docker Compose for one-command startup, and ensure every team member has a working local development environment with GPU access.

### Deliverables

| Deliverable | Owner | Acceptance |
|-------------|-------|------------|
| Git repository with full folder structure | Dev A | `tree` output matches Phase 4 spec |
| Pydantic schemas in `shared/schemas/` | Dev B | All schemas pass validation tests |
| FastAPI skeleton with mock endpoints | Dev C | `curl /v1/health` returns 200 |
| Docker Compose (backend + ollama) | Dev D | `docker-compose up` starts all services |
| CI pipeline (lint + unit tests) | Dev E | GitHub Actions green on push |

### Dependencies
None — this is the foundation.

### Estimated Complexity
Low. Primarily boilerplate and configuration.

### Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| GPU driver incompatibility across team machines | Medium | High | Standardize on CUDA 12.x, provide Docker GPU image |
| Schema disagreements | Low | Medium | Architect (lead) makes final decisions on Day 1 |

### Success Criteria
All 5 developers can run `docker-compose up` and hit the health endpoint. The CI pipeline passes on the initial commit. Shared schemas are importable from both `backend/` and `ai/` modules.

---

## Milestone 2: Risk Core Detection Models (Days 3-5)

### Objectives
Train the LightGBM URL model, fine-tune mDeBERTa-v3-base on phishing text data, integrate the pre-trained protectai prompt injection model, and wire all three into the FastAPI inference service.

### Deliverables

| Deliverable | Owner | Day | Acceptance |
|-------------|-------|-----|------------|
| URL feature extractor (15 features) | Dev D | Day 3 | Unit tests pass for 100 sample URLs |
| LightGBM URL model (trained + ONNX) | Dev D | Day 3 | F1 > 95% on test set |
| mDeBERTa fine-tuning script | Dev E | Day 3-4 | Training starts on GPU |
| mDeBERTa ONNX export | Dev E | Day 4 | ONNX model loads in onnxruntime |
| protectai model integration | Dev C | Day 3 | Model loads and predicts correctly |
| InferenceService class | Dev C | Day 5 | All 3 models callable via unified interface |
| `/v1/assess/url` endpoint (real) | Dev B | Day 5 | Returns valid risk_score for test URLs |
| `/v1/assess/text` endpoint (real) | Dev B | Day 5 | Returns valid risk_score for test emails |

### Dependencies
Milestone 1 (schemas, FastAPI skeleton).

### Estimated Complexity
High. Model training is the most time-consuming and unpredictable phase.

### Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| mDeBERTa fine-tuning doesn't converge | Medium | Critical | Fallback: use pre-trained mDeBERTa zero-shot or switch to ViDeBERTa |
| Insufficient Vietnamese phishing data | High | High | Augment with translated English data + synthetic generation |
| ONNX conversion fails for DeBERTa | Low | High | Use PyTorch inference directly (slightly slower) |
| GPU rental issues | Low | Critical | Have backup: use Google Colab Pro as emergency GPU |

### Success Criteria
All three models are loaded in the FastAPI process. The `/v1/assess/url` endpoint returns a risk score within 10ms. The `/v1/assess/text` endpoint returns a risk score within 100ms. Basic accuracy tests pass.

---

## Milestone 3: Policy Engine & Explanation Service (Days 6-7)

### Objectives
Implement the Policy & Action Risk Engine that converts raw scores into decisions, integrate the local Qwen2.5-7B LLM for Vietnamese explanations, and establish the WebSocket chat endpoint.

### Deliverables

| Deliverable | Owner | Day | Acceptance |
|-------------|-------|-----|------------|
| PolicyEngine class with decision matrix | Dev A | Day 6 | 30 scenario tests pass |
| Action risk evaluator | Dev A | Day 6 | Correctly blocks credential submission |
| Ollama setup + Qwen2.5-7B pull | Dev D | Day 6 | `ollama run qwen2.5:7b` works |
| ExplanationService (streaming) | Dev B | Day 7 | Vietnamese explanation streams correctly |
| WebSocket `/v1/chat` endpoint | Dev C | Day 7 | Chat messages receive streamed responses |
| Template fallback (no LLM) | Dev B | Day 7 | Works when Ollama is down |

### Dependencies
Milestone 2 (working inference endpoints).

### Estimated Complexity
Medium. Policy Engine is deterministic logic. LLM integration has some complexity around streaming and prompt engineering.

### Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Qwen2.5-7B generates hallucinated evidence | Medium | Medium | Strict system prompt + post-processing validation |
| LLM latency too high for chat UX | Low | Medium | Stream tokens; first token appears in < 500ms |
| Policy rules too strict (false blocks) | Medium | Medium | Tune thresholds based on test scenarios |

### Success Criteria
The full pipeline works end-to-end: input → Layer 1 detection → Policy decision → Layer 2 explanation. A phishing URL submitted via the API returns a `BLOCK` decision with a Vietnamese explanation. A safe URL returns `ALLOW` with no explanation needed.

---

## Milestone 4: MCP Server & Agent Integration (Days 8-9)

### Objectives
Implement the MCP Security Armor Server, expose it via SSE transport through a Cloudflare Tunnel, and demonstrate it working with ChatGPT (or equivalent agent) performing a live security check.

### Deliverables

| Deliverable | Owner | Day | Acceptance |
|-------------|-------|-----|------------|
| MCP Server with 4 tools registered | Dev C | Day 8 | MCP Inspector shows all tools |
| SSE transport implementation | Dev C | Day 8 | Remote agent can connect |
| Cloudflare Tunnel setup | Dev D | Day 8 | `your-domain.com` routes to localhost |
| ChatGPT custom MCP configuration | Dev E | Day 9 | ChatGPT lists available tools |
| Demo scenario: agent blocked | Dev E | Day 9 | Recorded video of agent being blocked |
| Demo scenario: agent warned | Dev E | Day 9 | Agent proceeds with caution |

### Dependencies
Milestone 3 (Policy Engine, full pipeline).

### Estimated Complexity
Medium. MCP SDK handles protocol details. Main challenge is transport configuration and agent compatibility.

### Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| ChatGPT MCP integration has undocumented quirks | Medium | High | Test with MCP Inspector first; have Claude Desktop as backup |
| Cloudflare Tunnel instability | Low | Medium | Have ngrok as backup tunnel |
| Agent doesn't respect BLOCK decision | Low | Medium | Document that this is agent-dependent; demo with compliant agent |

### Success Criteria
An AI agent (ChatGPT or Claude) successfully calls `assess_action` before submitting a form. When the target is a phishing URL, the agent receives `BLOCK` and reports to the user instead of proceeding. This is captured in a demo recording.

---

## Milestone 5: Chrome Extension MVP (Day 10)

### Objectives
Complete the Chrome Extension that provides real-time URL assessment with visual badges, demonstrating the "human user protection" side of the product.

### Deliverables

| Deliverable | Owner | Day | Acceptance |
|-------------|-------|-----|------------|
| Manifest V3 extension skeleton | Dev A | Day 10 | Loads in Chrome without errors |
| Background worker (API calls) | Dev A | Day 10 | Sends URL to backend on navigation |
| Content script (floating badge) | Dev B | Day 10 | Badge appears on all pages |
| Popup UI (evidence panel) | Dev B | Day 10 | Shows risk details on click |
| End-to-end demo | All | Day 10 | Extension + MCP + Backend all working |

### Dependencies
Milestone 3 (FastAPI backend with real model responses).

### Estimated Complexity
Medium. Chrome Extension APIs are well-documented but have quirks with Manifest V3 service workers.

### Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| CORS blocking Extension → Backend calls | Medium | Medium | Configure FastAPI CORS middleware for chrome-extension:// origin |
| Service worker goes idle (MV3 limitation) | Low | Low | Use `chrome.alarms` to keep alive during demo |

### Success Criteria
The extension displays a red badge when navigating to a known phishing test URL and a green badge on legitimate sites. The popup shows evidence details. No console errors during the demo.

---

## Milestone 6: Polish & Adversarial Robustness Lab (Days 11-14)

### Objectives
Generate adversarial test data, evaluate system robustness, build the presentation dashboard, record the demo video, and prepare the pitch for the judges.

### Deliverables

| Deliverable | Owner | Day | Acceptance |
|-------------|-------|-----|------------|
| TextAttack adversarial URL samples | Dev E | Day 11 | 5000 adversarial URLs generated |
| TextAttack adversarial text samples | Dev E | Day 11 | 5000 adversarial emails generated |
| Adversarial evaluation report | Dev E | Day 12 | Clean F1 vs Adversarial F1 documented |
| Adversarial retraining (if needed) | Dev D | Day 12 | Robustness gap reduced |
| UABR metric on agentic scenarios | Dev C | Day 12 | 20+ scenarios evaluated |
| Web Dashboard (scan history) | Dev A | Day 13 | Next.js dashboard shows recent scans |
| Demo video (3-5 minutes) | Dev B | Day 13-14 | Covers all 3 product pillars |
| Pitch deck / presentation | All | Day 14 | Ready for competition |

### Dependencies
Milestones 1-5 (complete working system).

### Estimated Complexity
High. Adversarial evaluation requires careful methodology. Presentation preparation requires narrative coherence.

### Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Models perform poorly on adversarial data | High | High | Adversarial retraining; report honestly with before/after |
| Demo crashes during recording | Medium | High | Record multiple takes; have backup scenarios |
| Judges find a bypass during live demo | Medium | High | Prepare honest responses: "This is a known limitation we plan to address" |

### Success Criteria
A comprehensive adversarial report showing Clean F1, Adversarial F1, Robustness Gap, and UABR metrics. A polished 3-5 minute demo video demonstrating all three product pillars. A pitch deck that tells a compelling story about "AI protecting AI."
