# REQUIRED.md — AI Security Armor for Agentic Workflows

> **Version: v2.0 — Post Gap-Analysis Merge (July 2026)**

---

## 1. Tổng quan sản phẩm

Xây dựng một **hệ thống đánh giá rủi ro an ninh dựa trên AI** cho người dùng
và AI agent, với **Robust Risk Assessment Core** dùng chung + **MCP Security
Armor Layer** làm điểm sáng tạo chiến lược.

> **Một Robust Risk Core, một Robustness Lab, một MCP Security Armor cho
> agentic workflows.**

---

## 1.1. Kênh triển khai *(MERGED — GAP-2.1)*

> 🔧 **RESOLVED (GAP-2.1)** — Yêu cầu chính thức hoá thứ tự ưu tiên kênh:

- **Bắt buộc MVP:** Chrome Extension (passive, PRIMARY) + MCP Server (agent) +
  Web Scanner/Chat App (active)
- **Polish/tuỳ chọn:** Desktop (Tauri), Mobile (React Native) — có thể cắt
  nếu thiếu thời gian mà KHÔNG ảnh hưởng chấm điểm chức năng lõi.

**Yêu cầu kỹ thuật bổ sung cho Extension:**
- Content script KHÔNG được đọc `input[type=password]` (chống VULN-5.4)
- Dùng Shadow DOM cho mọi UI injected, chỉ dùng `textContent`, không
  `innerHTML` với dữ liệu untrusted (chống VULN-5.2)
- Load "Developer Mode" (unpacked) cho demo — KHÔNG cần Chrome Web Store
  review (giải quyết RISK-4.4, vì review mất 3-7 ngày, vượt timeline thi)

---

## 2. Mục tiêu

### 2.1. Goals — *(giữ nguyên từ v1)*

- Công cụ đánh giá nhanh mức độ an toàn website/email/SMS/file.
- **Robust Risk Assessment Core** dùng chung cho nhiều modality.
- Đáp ứng chủ đề AI Security & Robustness qua adversarial training/eval.
- **MCP Security Armor Layer** cho agent tự kiểm tra trước khi hành động.
- **Action Risk** + **Protected User Assets**.
- Bằng chứng định lượng: clean vs adversarial F1, ASR, UABR.

### 2.2. Non-Goals — *(giữ nguyên, bổ sung 1 dòng)*

- Không xây antivirus thương mại hoàn chỉnh.
- Không phân tích hành vi động file (chỉ static quick-check).
- Không train LLM từ đầu (dùng Qwen2.5-7B-Instruct có sẵn — theo GAP-2.2).
- Không tự động thực hiện hành động rủi ro thay người dùng trong demo thật.
- Không thu thập SMS/email/file riêng tư nếu chưa có đồng ý rõ ràng.
- **[MỚI]** Không publish Chrome Extension lên Web Store trong phạm vi thi
  (dùng Developer Mode — theo RISK-4.4).

---

## 3. Đối tượng người dùng — *(giữ nguyên từ v1, không có gap)*

| Nhóm | Nhu cầu | Cách dùng |
|---|---|---|
| Người dùng cuối | Kiểm tra web/email/SMS/file | **Chrome Extension (primary)** + Web/Desktop/Mobile |
| Người dùng desktop | Kiểm tra file trước khi mở | Desktop/Tauri quick-check |
| Người dùng mobile | Cảnh báo SMS lừa đảo | Android SMS guard |
| Nhà phát triển AI app | Bảo vệ agent khỏi injection/tool misuse | MCP Security Armor |
| Browser/desktop/coding agent | Kiểm tra trước khi hành động | MCP tools |
| Giám khảo | Bằng chứng kỹ thuật + độ mới | Báo cáo robustness + demo agentic |

---

## 4. Phạm vi chức năng theo 3 trụ chính — *(giữ nguyên)*

```text
1. Robust Risk Assessment Core
2. Adversarial Robustness Lab
3. MCP Security Armor for AI Agents
```

---

## 5. Trụ 1 — Robust Risk Assessment Core

### 5.1. Yêu cầu chung — bổ sung xử lý văn bản dài

> 🔧 **RESOLVED (GAP-2.3 — Long Document Handling)**
> Email/text đầu vào có thể vượt 2000+ từ, vượt giới hạn 512 token của
> Transformer. **Yêu cầu bắt buộc:** hệ thống PHẢI implement hierarchical
> chunking (chunk theo câu, aggregate bằng `max(risk_scores)` giữa các
> chunk) — chi tiết kỹ thuật xem `design.md` §4.2.

Output chuẩn: `risk_level`, `confidence`, `reasons`, `evidence`,
`model_version`, `latency_ms`.

### 5.2. Web/URL Risk Adapter — *(giữ nguyên)*
### 5.3. Email/Text Risk Adapter — *(giữ nguyên)*
### 5.4. SMS Risk Adapter — *(giữ nguyên)*
### 5.5. File Static Risk Adapter — *(giữ nguyên)*
### 5.6. Prompt/Page Risk Adapter — *(giữ nguyên)*

---

## 5.7. Yêu cầu giải thích bằng ngôn ngữ tự nhiên *(MỚI — GAP-2.2)*

> 🔧 **RESOLVED (GAP-2.2 — Local LLM Requirement)**
> Hệ thống PHẢI có khả năng giải thích verdict bằng tiếng Việt tự nhiên,
> dùng **Qwen2.5-7B-Instruct qua Ollama** (không train LLM từ đầu — đã có
> trong Non-Goals). LLM CHỈ nhận evidence đã sanitize, KHÔNG BAO GIỜ nhận
> raw user content trực tiếp — đây là yêu cầu bảo mật bắt buộc, không phải
> tuỳ chọn (chống VULN-5.1: Prompt Injection Against Explainer LLM).

## 5.8. Yêu cầu giao diện Chat *(MỚI — GAP-2.6)*

> 🔧 **RESOLVED (GAP-2.6)** Chat interface (Web/Desktop/Mobile) PHẢI vận
> hành theo pattern: user hỏi → route Layer 1 → nhận evidence → Layer 2 LLM
> sinh response từ evidence + câu hỏi → stream qua WebSocket. Yêu cầu lưu
> lịch sử hội thoại tối thiểu trong phiên (không cần persist lâu dài cho MVP).

---

## 6. Trụ 2 — Adversarial Robustness Lab

### 6.1. Yêu cầu bắt buộc — bổ sung định lượng cụ thể

> 🔧 **RESOLVED (GAP-2.5 — Adversarial Pipeline cụ thể hoá)**
> Yêu cầu định lượng bắt buộc (không còn mơ hồ):
>
> | Stage | Số mẫu | Tỷ lệ |
> |---|---|---|
> | Clean training | ~50K email, ~100K URL | 100% |
> | Adversarial generation | ~10K/modality | — |
> | Robust retraining | ~60K tổng | **80% clean + 20% adversarial** |
> | Evaluation | ~5K/modality | Test set riêng, KHÔNG overlap train |

### 6.2. Kỹ thuật tấn công đối kháng — *(giữ nguyên)*
### 6.3. Agentic adversarial scenarios — *(giữ nguyên)*
### 6.4. Metrics bắt buộc — *(giữ nguyên)*
### 6.5. Demo robustness mong muốn — *(giữ nguyên)*

---

## 7. Trụ 3 — MCP Security Armor for AI Agents

### 7.1. Định nghĩa — *(giữ nguyên)*
### 7.2. Vai trò — *(giữ nguyên)*

### 7.3. MCP tools bắt buộc — bổ sung yêu cầu bảo mật

| Tool | Mức ưu tiên | Mô tả |
|---|---|---|
| `assess_url` | Must | Đánh giá URL trước khi mở/click |
| `assess_text` | Must | Đánh giá email/SMS/text/prompt |
| `scan_prompt_injection` | Must | Phát hiện prompt injection |
| `assess_action` | Must | Đánh giá rủi ro hành động |
| `assess_page` | Should | HTML/form/hidden instruction |
| `assess_file_static` | Should | Phân tích tĩnh file |
| `summarize_risk_safely` | Could | Tóm tắt an toàn |

> 🔧 **RESOLVED (VULN-5.5 — MCP Arbitrary Command Execution, Critical)**
> **Yêu cầu bảo mật bắt buộc (không phải "nên có"):** Mọi input của MCP tool
> PHẢI được validate bằng Pydantic schema strict TRƯỚC khi xử lý. Tiến trình
> MCP server PHẢI chạy với quyền OS tối thiểu (không `sudo`, filesystem access
> giới hạn trong sandbox directory). Đây là **Must-have bảo mật**, không thể
> bỏ qua dù trong MVP.

### 7.4. `assess_action` là điểm sáng tạo bắt buộc — *(giữ nguyên)*
### 7.5. Protected User Assets — *(giữ nguyên)*
### 7.6. Decision policy — *(giữ nguyên)*

### 7.7. Yêu cầu triển khai MCP Server *(MỚI — GAP-2.4)*

> 🔧 **RESOLVED (GAP-2.4)** MCP server PHẢI expose được cho AI agent ngoài
> (VD: ChatGPT custom MCP) qua domain cố định + tunnel:
> `ChatGPT → HTTPS → domain → Cloudflare Tunnel/ngrok → localhost:3001 (SSE)`.
> Đây là yêu cầu triển khai bắt buộc để demo hoạt động với agent thật, không
> chỉ chạy nội bộ.

---

## 8. API Contract yêu cầu — *(giữ nguyên, đồng bộ với design.md §7)*

---

## 9. Kiến trúc hệ thống yêu cầu — bổ sung Input Sanitization Layer

```text
┌──────────────────────────────────────────────┐
│ USER-FACING CLIENTS (Extension PRIMARY)       │
└────────────────────┬───────────────────────────┘
                     ▼
┌──────────────────────────────────────────────┐
│ SECURITY GATEWAY API                          │
│ + Input Sanitization Layer (bắt buộc)         │  ← yêu cầu MỚI
└────────────────────┬───────────────────────────┘
                     ▼
┌──────────────────────────────────────────────┐
│ ROBUST RISK ASSESSMENT CORE                   │
└────────────────────┬───────────────────────────┘
                     ▼
┌──────────────────────────────────────────────┐
│ POLICY & ACTION RISK ENGINE                   │
└────────────────────┬───────────────────────────┘
            ┌─────────┴─────────┐
            ▼                   ▼
┌──────────────────┐  ┌───────────────────────┐
│ Human Explain UI  │  │ MCP Security Armor    │
└──────────────────┘  └───────────────────────┘
```

> 🔧 **RESOLVED (Architecture Review — Input Sanitization Layer)**
> Yêu cầu bắt buộc: Gateway PHẢI có lớp chuẩn hoá Unicode (NFC), strip
> zero-width characters, TRƯỚC khi request đi vào Risk Core — áp dụng
> ĐỒNG NHẤT cho input từ Extension VÀ từ MCP agent (không phân biệt nguồn).

---

## 10. Yêu cầu dữ liệu — bổ sung chất lượng dữ liệu tiếng Việt

> 🔧 **RESOLVED (RISK-4.5 — Dataset Quality for Vietnamese Phishing)**
> Yêu cầu bắt buộc augment dữ liệu tiếng Việt qua 3 tầng: (1) dịch email
> phishing EN bằng GPT-4o-mini, (2) mẫu thật từ **VNCER