# DESIGN.md — AI Security Armor for Agentic Workflows

> **Version: v2.0 — Post Gap-Analysis Merge (July 2026)**
> Đã merge toàn bộ 6 Missing Requirements + 5 Contradictions + 8 Technical Risks +
> 6 Security Vulnerabilities từ `01-gap-analysis.md`. Mỗi đoạn merge đánh dấu
> `> 🔧 RESOLVED (ID)` tại đúng vị trí liên quan. Xem Phụ lục A cuối file.

---

## 0. Tuyên ngôn thiết kế mới

> **AI có quyền hành động thay người dùng thì AI cũng cần một lớp bảo vệ trước khi hành động.**

```text
Risk Core = bộ não
Robustness Lab = bằng chứng khoa học
MCP Security Armor = điểm sáng tạo agentic
App UI = mặt tiền cho người dùng
```

---

## 0.1. Client Delivery Channels *(MERGED — GAP-2.1)*

> 🔧 **RESOLVED (GAP-2.1 — Chrome Extension as Primary Client)**

| Thứ tự | Client | Vai trò | MVP |
|---|---|---|---|
| **1 (Primary)** | **Chrome Extension** | Passive real-time badge | ✅ Bắt buộc |
| 2 | MCP Server | Agent gọi tool trước khi hành động | ✅ Bắt buộc |
| 3 | Web Scanner/Chat App | Hỏi đáp bảo mật, dashboard | ✅ Bắt buộc |
| 4 | Desktop (Tauri) | File static quick-check | 🔵 Polish |
| 5 | Mobile (RN) | SMS Guard Android | 🔵 Polish |

```text
Chrome Extension (Manifest V3)
  ├── content_script.js  → đọc URL/DOM (KHÔNG đọc input[type=password])
  ├── background.js      → POST /api/v1/assess/url (debounce 500ms)
  ├── popup.tsx           → badge + evidence (Shadow DOM)
  └── chrome.storage.local → cache risk_score, TTL 10 phút
```

| Yêu cầu API | Chi tiết |
|---|---|
| CORS | Whitelist `chrome-extension://<id>`, KHÔNG dùng `"*"` |
| Auth | `X-Client-Id` (UUID), không cần login |
| Rate limit | Bucket riêng, không share với MCP |
| Response | Tối giản: risk_score, verdict, top-3 evidence |

**Trust Boundary:** Extension và MCP input đi qua CÙNG một Input Sanitization
Layer — không tách 2 pipeline validate riêng.

---

## 1. Ba trụ chính của sản phẩm

| Trụ | Vai trò |
|---|---|
| **1. Robust Risk Assessment Core** | Lõi đánh giá rủi ro dùng chung URL/email/SMS/prompt/file |
| **2. Adversarial Robustness Lab** | Sinh mẫu đối kháng, đo trước/sau |
| **3. MCP Security Armor for AI Agents** | Bảo vệ AI agent trước khi hành động |

> 🔧 **RESOLVED (CONTRA-3.1 — "One Core" vs Multiple Models)**
> "One Robust Risk Core" = **unified API contract & orchestration layer**
> (`InferenceService`), KHÔNG phải một ML model duy nhất. Ẩn dụ: một quầy
> tiếp tân (Core) điều hướng tới nhiều bác sĩ chuyên khoa (các model).

---

## 2. Nguyên tắc thiết kế

1. **One Robust Risk Core, Many Adapters**
2. **MCP Armor is a Product Mode, Not a Side Integration**
3. **Action Risk First-class Citizen**
4. **Protected User Assets Awareness**
5. **Contract-first** (Pydantic/JSON Schema)
6. **Explainable by default**
7. **Offline-capable core**

   > 🔧 **RESOLVED (CONTRA-3.2 — Offline vs LLM Dependency) — Graceful Degradation:**
   >
   > | Mode | LLM Available | Hành vi |
   > |---|---|---|
   > | Full | Yes | Giải thích tiếng Việt phong phú |
   > | Degraded | No (Ollama down) | Template-based dùng evidence list |
   > | Offline | No network | Layer 1 vẫn hoạt động, explanation chỉ template |
   >
   > Layer 1 LUÔN offline-capable; chỉ Layer 2 (LLM) có degrade path.

8. **Reproducible robustness** (seed cố định, DVC/MLflow)

---

## 3. Kiến trúc tổng thể

```text
┌──────────────────────────────────────────────┐
│ Chrome Extension │ Web │ Desktop │ Mobile     │
└────────────────────┬───────────────────────────┘
                     ▼
┌──────────────────────────────────────────────┐
│ SECURITY GATEWAY API                          │
│ + Input Sanitization Layer (Unicode/ZW strip) │  ← từ Architecture Review
└────────────────────┬───────────────────────────┘
                     ▼
┌──────────────────────────────────────────────┐
│ ROBUST RISK ASSESSMENT CORE                   │
│ Adapters → Models → Calibration → Evidence    │
└────────────────────┬───────────────────────────┘
                     ▼
┌──────────────────────────────────────────────┐
│ POLICY & ACTION RISK ENGINE                   │
│ ALLOW/WARN/BLOCK/ASK_CONFIRMATION             │
└────────────────────┬───────────────────────────┘
            ┌─────────┴─────────┐
            ▼                   ▼
┌──────────────────┐  ┌───────────────────────┐
│ Human Explain UI  │  │ MCP Security Armor    │
└──────────────────┘  └───────────────────────┘
```

> 🔧 **RESOLVED (CONTRA-3.3 & 3.4 — "Local" vs "Server" Ambiguity)**
> - "Local" = Extension gọi **server chạy local** (`localhost:8000`), KHÔNG phải
>   inference trong browser (WebAssembly/WebGPU không khả thi trong 10 ngày).
> - MCP server và Extension backend chạy trên **CÙNG một máy vật lý**. Khác biệt
>   ở access pattern:
>   ```text
>   Extension → localhost:8000                        (local only)
>   MCP (ChatGPT) → your-domain.com → Cloudflare Tunnel/ngrok → localhost:3001 (SSE)
>   ```
>   Mirror kinh nghiệm team đã có với `tomni_ide` MCP integration.

---

## 4. Robust Risk Assessment Core

### 4.1-4.2. Vai trò & Modality Adapters

| Adapter | Đầu vào | Mục tiêu |
|---|---|---|
| URL Adapter | URL, domain, redirect, lexical | phishing, typosquat, homoglyph |
| Email/Text Adapter | subject, body, headers, links | phishing, social engineering |
| SMS Adapter | nội dung, sender pattern | smishing |
| Prompt/Page Adapter | prompt, HTML, hidden text | prompt injection |
| File Static Adapter | PE header, imports, entropy | file đáng ngờ |

> 🔧 **RESOLVED (GAP-2.3 — Long Document Handling)**
> Transformer giới hạn 512 token nhưng email có thể >2000 từ.
> **Hierarchical Chunking Strategy:**
> ```python
> def chunk_email(email_body: str, max_tokens: int = 450) -> list[str]:
>     chunks, sentences = [], sent_tokenize(email_body)
>     current_chunk, current_length = [], 0
>     for sent in sentences:
>         t = len(tokenizer.encode(sent))
>         if current_length + t > max_tokens:
>             chunks.append(" ".join(current_chunk))
>             current_chunk, current_length = [sent], t
>         else:
>             current_chunk.append(sent); current_length += t
>     if current_chunk: chunks.append(" ".join(current_chunk))
>     return chunks
> ```
> **Aggregation:** `max(risk_scores)` giữa chunks — 1 đoạn phishing đủ để coi cả
> email nguy hiểm.

### 4.3. Model theo modality

| Modality | Model chính | Model nhẹ |
|---|---|---|
| Email/Text | DistilBERT/DeBERTa-v3-small | TF-IDF + LightGBM |
| URL | CharCNN/LightGBM lexical | LightGBM ONNX |
| SMS | Multilingual DistilBERT | TF-IDF + LinearSVC/TFLite |
| Prompt/Page | DeBERTa classifier | rule + lightweight |
| File PE | XGBoost/LightGBM (EMBER-like) | server/desktop only |

### 4.4. Không train LLM từ đầu

> 🔧 **RESOLVED (GAP-2.2 — Local LLM for NLG)**
> **Quyết định:** **Qwen2.5-7B-Instruct** qua Ollama (Q4_K_M, ~4.5GB VRAM).
> LLM = "Layer 2", chỉ nhận evidence ĐÃ SANITIZE, **KHÔNG BAO GIỜ nhận raw
> user input trực tiếp** (chống VULN-5.1, xem Phụ lục A).

---

## 5. Policy & Action Risk Engine

### 5.1-5.4. Action Risk, Protected Assets, Decision Policy

**Action Risk:** mở website, bấm link, điền form, gửi email, tải/chạy file,
copy dữ liệu, nhập mật khẩu, gọi API, thanh toán.

**Protected User Assets:** tài khoản, email, file cá nhân, browser session,
cookie, mật khẩu, ví/thanh toán, cloud drive, API key/token, clipboard.

| Decision | Khi dùng |
|---|---|
| `ALLOW` | Rủi ro thấp |
| `WARN` | Đáng ngờ nhưng chưa đủ chặn |
| `BLOCK` | Rủi ro cao/critical |
| `ASK_USER_CONFIRMATION` | Rủi ro trung-cao, hành động nhạy cảm |

---

## 6. MCP Security Armor Layer

### 6.1-6.2. Vai trò & Vị trí kiến trúc

4 hướng bảo vệ: (1) đọc nội dung không tin cậy, (2) prompt injection,
(3) tài sản người dùng khi hành động, (4) chống người dùng xấu khai thác agent.

```text
AI Agent → MCP Security Armor Layer → Policy & Action Risk Engine → Risk Core
```

> 🔧 **RESOLVED (GAP-2.4 — MCP Server Deployment Architecture)**
> ```text
> ChatGPT → HTTPS → your-domain.com → Cloudflare Tunnel/ngrok → localhost:3001 (SSE)
> ```
> Mirror kinh nghiệm `tomni_ide` MCP integration — tái dùng pattern đã proven.

### 6.3. MCP tools chính

| Tool | Vai trò |
|---|---|
| `assess_url` | URL trước khi click |
| `assess_page` | HTML/hidden instruction |
| `assess_text` | email/SMS/text |
| `assess_file_static` | file trước khi mở/chạy |
| `scan_prompt_injection` | phát hiện injection |
| `assess_action` | rủi ro hành động agent |
| `summarize_risk_safely` | tóm tắt an toàn |

> 🔧 **RESOLVED (VULN-5.5 — MCP Arbitrary Command Execution, Critical)**
> Mọi MCP tool input PHẢI validate Pydantic schema strict TRƯỚC xử lý.
> MCP process chạy quyền OS tối thiểu (không `sudo`, filesystem giới hạn).

### 6.4. `assess_action` — điểm sáng tạo chính

```json
// Request
{
  "action_type": "submit_form",
  "target_url": "https://login-check-example.test",
  "data_types": ["email", "password"],
  "agent_context": {
    "agent_type": "browser_agent",
    "available_assets": ["browser_session", "email", "password_form"],
    "permission_level": "can_click_and_submit_forms"
  }
}
// Response
{
  "decision": "BLOCK",
  "risk_level": "critical",
  "confidence": 0.94,
  "safe_summary": "Agent is about to submit credentials to an untrusted domain.",
  "evidence": ["Target domain not trusted", "Page resembles credential harvesting"],
  "recommended_agent_behavior": "Do not submit. Ask user to verify domain manually."
}
```

### 6.5. Agent Context

```json
{
  "agent_context": {
    "agent_type": "browser_agent",
    "current_task": "log in and verify account",
    "current_url": "https://example.test/login",
    "planned_action": "submit_form",
    "available_assets": ["browser_session", "email", "files"],
    "permission_level": "can_click_and_submit_forms"
  }
}
```

---

## 7. API Contract

```python
class Evidence(BaseModel):
    source: str
    message: str
    severity: Literal["info","low","medium","high","critical"]
    feature: str | None = None

class AssessRequest(BaseModel):
    modality: Literal["email","url","sms","prompt","file"]
    content: str
    metadata: dict[str, Any] | None = None

class AssessResponse(BaseModel):
    risk_level: Literal["safe","low","medium","high","critical"]
    confidence: float
    reasons: list[str]
    evidence: list[Evidence]
    model_version: str
    latency_ms: int

class AgentContext(BaseModel):
    agent_type: Literal["chat","browser_agent","desktop_agent","coding_agent"]
    user_intent: str | None = None
    current_url: str | None = None
    planned_action: str | None = None
    available_assets: list[str] = []
    data_types_involved: list[str] = []
    permission_level: str | None = None

class AgentRiskRequest(BaseModel):
    content_type: Literal["url","page","email","file","prompt","action"]
    content: str | dict
    agent_context: AgentContext

class AgentRiskResponse(BaseModel):
    decision: Literal["ALLOW","WARN","BLOCK","ASK_USER_CONFIRMATION"]
    risk_level: Literal["safe","low","medium","high","critical"]
    confidence: float
    safe_summary: str
    evidence: list[Evidence]
    recommended_agent_behavior: str

class AssessActionRequest(BaseModel):
    action_type: Literal[
        "open_url","click_link","submit_form","send_email","download_file",
        "open_file","execute_file","copy_data","call_api","upload_file",
        "payment_or_transfer"
    ]
    target_url: str | None = None
    data_types: list[str] = []
    agent_context: AgentContext
```

> 🔧 **RESOLVED (GAP-2.6 — Chat Interface Specification) — RAG-like pattern:**
> 1. User hỏi + paste nội dung → 2. Route tới Layer 1 classifiers →
> 3. Layer 1 trả risk_score + evidence → 4. Layer 2 LLM nhận evidence + nội
> dung sanitize + câu hỏi → sinh response → 5. Stream về qua WebSocket.

---

## 8. Adversarial Robustness Lab

| Modality | Kỹ thuật | Công cụ |
|---|---|---|
| Text/Email/SMS | synonym swap, homoglyph, zero-width, typo | TextAttack + custom |
| URL | typosquat, subdomain padding, %-encoding | custom rule engine |
| Prompt/Page | hidden instruction, role override | custom suite |
| File PE | section padding, string obfuscation | custom mutation |

> 🔧 **RESOLVED (GAP-2.5 — Adversarial Training Pipeline)**
>
> | Stage | Kỹ thuật | Số mẫu | Công cụ |
> |---|---|---|---|
> | Clean training | Standard fine-tune | ~50K email, ~100K URL | HF Trainer |
> | Adversarial gen | TextAttack | ~10K/modality | TextAttack |
> | Robust retraining | 80% clean + 20% adversarial | ~60K | Same trainer |
> | Evaluation | Test set adversarial riêng | ~5K/modality | Custom script |

**Agentic scenarios:** prompt injection website, hidden instruction HTML,
phishing login form, file instruction attack, tool-call manipulation, data
exfiltration.

**Metrics:** Accuracy/F1 (clean+adversarial), ASR, Robustness Gap, UABR,
False Block Rate, Agent Attack Success Rate.

---

## 9. File `.exe` static check

```text
AI desktop agent tải file → gọi assess_file_static/assess_action(execute_file)
→ phân tích tĩnh → nếu nguy hiểm, KHÔNG chạy + giải thích lý do.
```

Phân tích: PE header, imports, entropy, packer, suspicious strings, hash lookup.
**Không thực thi file, không sandbox động trong MVP.**

---

## 10. SMS Guard

- **Android:** `RECEIVE_SMS`/`READ_SMS`, native module Kotlin, TFLite on-device.
- **iOS:** `ILMessageFilterExtension` (Apple giới hạn, không đọc SMS trực tiếp).

---

## 11. Tech Stack Decisions

| Tầng | Công nghệ | Lý do |
|---|---|---|
| Web | Next.js 14 | Dashboard, scanner UI |
| **Extension** | **Manifest V3 + Shadow DOM** | **Bắt buộc — GAP-2.1** |
| Desktop | Tauri 2.0 | Nhẹ, file access |
| Mobile | React Native | SMS native |
| Backend | FastAPI 3.11 | Async, Pydantic contract-first |
| ML Core | PyTorch + sklearn + ONNX | Train + export gọn |
| **LLM** | **Ollama Qwen2.5-7B Q4_K_M** | **GAP-2.2 — local, ~4.5GB VRAM** |
| Tracking | MLflow + DVC | Reproducibility |
| MCP | Python, stdio + SSE | Agent local/remote |

---

## 12. Monorepo & Phân vai

```text
/apps/extension     ← MỚI (GAP-2.1, primary client)
/apps/web /desktop /mobile
/services/gateway (+ Input Sanitization Layer)
/services/mcp-armor
/core/{adapters,models,policy,robustness,explainer}
/contracts /data /experiments
```

> 🔧 **RESOLVED (CONTRA-3.5 — Team Role Reassignment)**

| Dev | Trọng tâm v2 | Thay đổi |
|---|---|---|
| A | Web UI + dashboard | Không đổi |
| **B** | **Chrome Extension** | 🔄 Đổi từ Desktop/Tauri |
| C | FastAPI gateway + MCP Armor | Không đổi |
| D | Risk adapters + training | Không đổi |
| E | Adversarial Robustness Lab | Không đổi |

Desktop/Tauri → polish phase (Sprint 6) only.

---

## 13. Non-Functional Requirements (bổ sung từ Technical Risks)

| Hạng mục | Mục tiêu | Ghi chú |
|---|---:|---|
| Latency URL/email/SMS server | < 300ms p95 | |
| MCP `assess_action` | < 500ms p95 | Dùng `asyncio.gather()` — xem RISK-4.6 |
| File quick-check | 5-10s, tối đa 30s | |
| GPU VRAM budget | ≤ 5.6GB (FP16) / 5.0GB (INT8) | Xem RISK-4.1 |
| On-device model | < 25MB | Mobile/SMS |
| Rate limit | 60 req/phút/IP | Xem VULN-5.3 |

> 🔧 **RESOLVED (RISK-4.1 — GPU Memory Exhaustion, Critical)**
>
> | Component | VRAM FP16 | VRAM INT8/ONNX |
> |---|---|---|
> | mDeBERTa-v3-base | 350MB | 170MB |
> | protectai DeBERTa | 750MB | 360MB |
> | LightGBM | 0 (CPU) | 0 |
> | Qwen2.5-7B Q4 | 4,500MB | 4,500MB |
> | **Total** | **5,600MB** | **5,030MB** |
>
> 8GB GPU (RTX 3060/4060) đủ headroom. Nếu OOM: offload protectai lên CPU
> (+~200ms latency, -750MB VRAM).

> 🔧 **RESOLVED (RISK-4.6 — Latency Budget Violation)**
> **Parallel inference** bằng `asyncio.gather()`:
> ```python
> async def assess_content(content: AssessRequest):
>     url_task = asyncio.to_thread(url_model.predict, content.url)
>     text_task = asyncio.to_thread(text_model.predict, content.body)
>     prompt_task = asyncio.to_thread(prompt_model.predict, content.body)
>     url_risk, text_risk, prompt_risk = await asyncio.gather(url_task, text_task, prompt_task)
>     return max(url_risk, text_risk, prompt_risk)
> ```

> 🔧 **RESOLVED (RISK-4.7 — Model Versioning Drift)**
> Dùng **DVC** pin model files. Mọi model artifact commit kèm version tag.
> `InferenceService` PHẢI log `model_version` trong mọi response.

---

## 14. Roadmap theo critical path

1. Contracts + monorepo + CI (kèm Extension container)
2. Risk Core baseline (URL + email + SMS)
3. Policy & Action Risk Engine
4. MCP Security Armor MVP
5. Adversarial Robustness Lab
6. Clients/demo (Extension + Web + Agent demo)
7. File static check mở rộng
8. Mobile/SMS (nếu kịp)

---

## 15. Dataset và giấy phép

| Modality | Dataset | Ghi chú |
|---|---|---|
| Email | SpamAssassin, Nazario | public/research |
| URL | PhishTank, UCI Phishing, OpenPhish | kiểm tra license |
| SMS | UCI SMS Spam + tự gán nhãn VI | tránh privacy |
| Prompt injection | deepset/prompt-injections + custom | agentic scenarios |
| PE/File | EMBER features | mẫu hợp pháp, cách ly |

> 🔧 **RESOLVED (RISK-4.5 — Dataset Quality for Vietnamese Phishing)**
> **Augment bằng 3 tầng:** (1) dịch email phishing EN bằng GPT-4o-mini,
> (2) mẫu thật từ VNCERT advisories, (3) synthetic LLM-generated (giới hạn
> ≤15% train, KHÔNG vào test set — xem thêm `dataset-plan.md`).

---

## Phụ lục A — Traceability Matrix (Gap Analysis → Design)

### A.1. Missing Requirements (6/6 merged — lưu ý: Executive Summary ghi "12"
### nhưng Section 2 gốc chỉ liệt kê 6 mục; đây là discrepancy trong tài liệu
### gốc, không phải thiếu sót khi merge)

| ID | Tên | Vị trí merge |
|---|---|---|
| GAP-2.1 | Chrome Extension Primary Client | §0.1, §11, §12 |
| GAP-2.2 | Local LLM (Qwen2.5-7B) | §4.4, §11 |
| GAP-2.3 | Long Document Chunking | §4.2 |
| GAP-2.4 | MCP Deployment Architecture | §6.2 |
| GAP-2.5 | Adversarial Training Pipeline | §8.1 |
| GAP-2.6 | Chat Interface (RAG-like) | §7.3 |

### A.2. Contradictions (5/5 merged)

| ID | Tên | Vị trí merge |
|---|---|---|
| CONTRA-3.1 | One Core vs Multiple Models | §1 |
| CONTRA-3.2 | Offline vs LLM Dependency | §2 (nguyên tắc 7) |
| CONTRA-3.3 | Extension "Local" ambiguity | §3 |
| CONTRA-3.4 | MCP "Server" vs Extension "Local" | §3 |
| CONTRA-3.5 | Team Role Allocation | §12 |

### A.3. Technical Risks (8/8 — merged các risk kiến trúc quan trọng)

| ID | Tên | Vị trí merge |
|---|---|---|
| RISK-4.1 | GPU Memory Exhaustion | §13 |
| RISK-4.2 | mDeBERTa Fine-tuning Failure | *(xem dataset-plan.md fallback)* |
| RISK-4.3 | MCP Protocol Compatibility | *(xem test-plan.md — test với MCP Inspector)* |
| RISK-4.4 | Chrome Extension Review Delays | *(xem demo-script.md — Developer Mode)* |
| RISK-4.5 | Dataset Quality VI | §15 |
| RISK-4.6 | Latency Budget Violation | §13 |
| RISK-4.7 | Model Versioning Drift | §13 |
| RISK-4.8 | Qwen Hallucination | *(xem §4.4 + VULN-5.1)* |

### A.4. Security Vulnerabilities (6/6 — merged các vuln liên quan kiến trúc)

| ID | Tên | Vị trí merge |
|---|---|---|
| VULN-5.1 | Prompt Injection vs Explainer LLM | §4.4 |
| VULN-5.2 | Extension Content Script XSS | *(xem §0.1 — Shadow DOM, textContent only)* |
| VULN-5.3 | API Rate Limiting Absence | §13 + `auth-contract.md` |
| VULN-5.4 | Data Exfiltration via Extension | §0.1 (loại trừ password fields) |
| VULN-5.5 | MCP Arbitrary Command Execution | §6.3 |
| VULN-5.6 | Model Poisoning via Training Data | *(xem dataset-plan.md — license-safe rule)* |

**Ghi chú:** Các mục đánh dấu *(xem ...)* được xử lý ở tài liệu vệ tinh
(dataset-plan.md, test-plan.md, demo-script.md, auth-contract.md) thay vì
design.md để tránh phình tài liệu — nhưng vẫn có traceability đầy đủ.