# Phase 2.5: Dataset Plan & GPU Budget

> **Project:** AI Security Armor for Agentic Workflows
> **Competition:** Cyber Solutions Challenge 2026 — ĐH Nguyễn Tất Thành
> **Author:** Principal Software Architect & Security Architect
> **Date:** July 2026
> **Status:** BLOCKER cho Sprint 2 — phải được approve trước Day 3

---

## 1. Nguyên tắc chung

| Nguyên tắc | Diễn giải |
|---|---|
| **Offline-first** | Toàn bộ dataset phải tải về xong trong Day 1-2, không phụ thuộc mạng khi train |
| **License-safe** | Chỉ dùng dataset có license cho phép sử dụng trong nghiên cứu/competition (CC, MIT, Apache, ODbL) |
| **Reproducible** | Mọi split dùng `random_state=42`, script split được commit vào `ai/data/` |
| **No data leakage** | Dedup theo domain (URL) và theo nội dung chuẩn hoá (text) TRƯỚC khi split |
| **VN-first** | Tiếng Việt thiếu data → dùng chiến lược dịch + sinh synthetic có kiểm soát |

---

## 2. MODALITY 1 — URL Phishing (LightGBM)

### 2.1. Nguồn dữ liệu

| Nguồn | Loại | Số lượng ước tính | License | Ưu tiên |
|---|---|---|---|---|
| **PhishTank verified dump** | Phishing | ~50k URL active | Free (đăng ký API key) | P0 |
| **OpenPhish community feed** | Phishing | ~15k URL | Free community | P1 |
| **Kaggle "Malicious URLs dataset"** (sid321axn) | Mixed (phishing/malware/defacement/benign) | ~651k | CC0 | P0 |
| **Tranco Top 100k** | Benign | 100k domain | Free | P0 |
| **ISCX-URL-2016** | Mixed | ~165k | Academic use | P2 (backup) |

### 2.2. Composition mục tiêu

```text
Tổng: ~200,000 URL (đủ cho LightGBM, không cần nhiều hơn)
├── Phishing : 100,000 (50%)  ← PhishTank + OpenPhish + Kaggle (label=phishing)
└── Benign   : 100,000 (50%)  ← Tranco (sinh URL thực bằng cách crawl sitemap
                                 hoặc lấy path từ Kaggle benign subset)
```

### 2.3. Tiền xử lý & Split

1. **Dedup:** normalize (lowercase, bỏ trailing slash) → dedup theo full URL, sau đó cap **tối đa 20 URL/domain** để tránh model học thuộc domain.
2. **Domain-level split:** URLs cùng registered domain (tldextract) phải nằm cùng một split → chống leakage.
3. **Split:** Train 80% / Val 10% / Test 10%.
4. **Feature extraction:** 15 lexical features theo `05-module-specification.md` (Module 1).

### 2.4. Rủi ro & Fallback

| Rủi ro | Fallback |
|---|---|
| PhishTank API key chậm cấp | Dùng Kaggle dataset (CC0, tải ngay, không cần key) — đủ cho MVP |
| Benign URL quá "sạch" (chỉ homepage) | Trộn benign URLs có path/query từ Kaggle benign subset |

---

## 3. MODALITY 2 — Email/SMS/Text Phishing tiếng Việt (Transformer fine-tune)

> Đây là modality **rủi ro cao nhất** vì data tiếng Việt khan hiếm. Chiến lược: 3 tầng — data thật → data dịch → data synthetic.

### 3.1. Nguồn dữ liệu

| Tầng | Nguồn | Ngôn ngữ | Số lượng | License | Ghi chú |
|---|---|---|---|---|---|
| **Tầng 1 — Thật** | Kaggle "Vietnamese SMS spam" / các corpus SMS spam VN công khai | VI | ~5-10k | Kiểm tra từng bộ | Ưu tiên cao nhất, đúng phân phối thật |
| **Tầng 1 — Thật** | ViSpamReviews (UIT) | VI | ~19k | Academic | Domain khác (review) nhưng tăng đa dạng ngôn ngữ spam VI |
| **Tầng 2 — Dịch** | Nazario Phishing Corpus + SpamAssassin | EN → VI | ~10k dịch | Public | Dịch máy (Google/NLLB offline) + lọc chất lượng |
| **Tầng 2 — Dịch** | Kaggle "Phishing Email Dataset" (subject+body) | EN → VI | ~18k, dịch chọn lọc ~8k | CC0 | Chọn mẫu ngắn-trung bình để dịch tốt |
| **Tầng 3 — Synthetic** | Sinh bằng LLM (Ollama local, template-based) | VI | ~3-5k | Tự tạo | Mô phỏng lừa đảo VN đặc thù: giả ngân hàng, giả CQ công an, trúng thưởng, giả shipper |
| **Benign** | Email/SMS giao dịch hợp lệ VN (template ngân hàng, OTP thật cấu trúc), tin tức VN (binhvq/news-corpus subset), hội thoại thường | VI | cân bằng 50% | Mixed | |

### 3.2. Composition mục tiêu

```text
Tổng: ~50,000 mẫu
├── Phishing/Scam VI : 25,000
│   ├── Data thật VI      : ~10,000 (40%)
│   ├── Data dịch EN→VI    : ~12,000 (48%)
│   └── Synthetic VI       :  ~3,000 (12%)  ← KHÔNG vượt 15% để tránh model học "giọng LLM"
└── Benign VI        : 25,000
```

**Quy tắc vàng cho Tầng 3 (synthetic):**
- Synthetic CHỈ được đưa vào **train set**, TUYỆT ĐỐI KHÔNG vào val/test.
- Test set phải ≥ 70% data thật để F1 báo cáo có ý nghĩa.

### 3.3. Tiền xử lý

1. Chuẩn hoá Unicode (NFC), chuẩn hoá số điện thoại/URL thành token `<PHONE>`, `<URL>` (giữ nguyên bản raw cho URL adapter xử lý riêng).
2. Nếu dùng **PhoBERT**: word segmentation bằng VnCoreNLP/underthesea trước khi tokenize. Nếu dùng **ViDeBERTa**: không cần segmentation (SentencePiece).
3. Dedup fuzzy (MinHash, threshold 0.9) — data dịch hay bị trùng mẫu.
4. Split: Train 80% / Val 10% / Test 10% — stratified theo label VÀ theo tầng nguồn.

### 3.4. Rủi ro & Fallback

| Rủi ro | Fallback |
|---|---|
| Corpus SMS spam VN không tìm được bản license sạch | Tăng Tầng 2 (dịch) lên 60%, chấp nhận F1 test thấp hơn ~2-3 điểm |
| Chất lượng dịch máy kém | Lọc bằng heuristic (độ dài, tỷ lệ ký tự lạ) + spot-check 200 mẫu bằng tay (2 giờ, 1 dev) |
| F1 tiếng Việt < 0.85 sau fine-tune | Demo chuyển trọng tâm sang URL + prompt injection; email VI đánh dấu "beta" |

---

## 4. MODALITY 3 — Prompt Injection (Transformer fine-tune)

### 4.1. Nguồn dữ liệu

| Nguồn (HuggingFace) | Số lượng | License | Ghi chú |
|---|---|---|---|
| **deepset/prompt-injections** | ~600 | Apache 2.0 | Nhỏ nhưng chất lượng, có cả DE/EN |
| **jackhhao/jailbreak-classification** | ~1.3k | MIT | Jailbreak prompts |
| **safe-guard-prompt-injection** (xTRam1) | ~10k | Apache 2.0 | Bộ chính cho train |
| **Gandalf/Lakera-style samples** (public subsets) | ~1k | Kiểm tra | Bổ sung đa dạng |
| **Benign instructions:** databricks-dolly-15k, alpaca subset | ~15k | CC BY-SA / Apache | Negative class |

### 4.2. Composition & đặc thù

```text
Tổng: ~25,000 mẫu
├── Injection/Jailbreak : 12,000 (EN chủ đạo + ~1,500 dịch sang VI)
└── Benign instruction  : 13,000 (bao gồm "hard negatives": câu hỏi về bảo mật
                          NHƯNG không phải injection — chống false positive)
```

**Điểm quan trọng:** phải có **hard negatives** kiểu *"Hãy giải thích prompt injection là gì"* được label benign — nếu không, MCP armor sẽ chặn nhầm chính các câu hỏi hợp lệ của agent về bảo mật (false positive giết chết demo).

### 4.3. Split

Train 80% / Val 10% / Test 10%, stratified. Dedup exact + fuzzy trước split (các bộ HF trùng nhau khá nhiều).

---

## 5. Adversarial Robustness Lab — Data đối kháng (Trụ 2)

Sinh từ chính test/train set của 3 modality, KHÔNG cần nguồn ngoài:

| Modality | Kỹ thuật tấn công | Công cụ | Số mẫu |
|---|---|---|---|
| URL | Homoglyph (`ạ`→`a`), typosquat, subdomain padding, URL shortener wrap | Script tự viết (`security/adversarial/url_attacks.py`) | 5k |
| Text VI | Thêm dấu/bỏ dấu, chèn ký tự zero-width, leetspeak VI (`ngân hàng`→`ng4n h4ng`), synonym swap | Script + underthesea | 5k |
| Prompt | Payload splitting, base64 wrap, đổi ngôn ngữ, roleplay framing | Template script | 3k |

**Quy trình đo:** baseline F1 trên test sạch → F1 trên test adversarial → adversarial training (trộn 30% mẫu đối kháng vào train) → đo lại cả 2. Bốn con số này chính là **bằng chứng khoa học** cho slide thuyết trình.

---

## 6. GPU Budget Breakdown (tổng 10 giờ)

| # | Công việc | Model | GPU | Thời lượng | Ghi chú |
|---|---|---|---|---|---|
| 1 | Train LightGBM URL (baseline + adversarial) | LightGBM | ❌ CPU | 0h GPU (~30 phút CPU) | Không tốn GPU |
| 2 | Fine-tune Email/Text VI — baseline | ViDeBERTa-base (86M) | ✅ | **2.5h** | 3 epochs, batch 32, fp16, max_len 256 |
| 3 | Fine-tune Prompt Injection — baseline | mDeBERTa-v3-base | ✅ | **1.5h** | 3 epochs, batch 32, fp16 |
| 4 | Adversarial re-training Email VI | ViDeBERTa-base | ✅ | **2.0h** | Train tiếp từ checkpoint #2 |
| 5 | Adversarial re-training Prompt | mDeBERTa-v3-base | ✅ | **1.0h** | Train tiếp từ checkpoint #3 |
| 6 | ONNX export + quantization + đo latency | Tất cả | ✅ | **0.5h** | INT8 dynamic quantization |
| 7 | **Buffer dự phòng** (re-run khi hỏng, tune LR) | — | ✅ | **2.5h** | 25% buffer là bắt buộc |
| | **TỔNG** | | | **10.0h** | |

### Quy tắc kỷ luật GPU

1. **Smoke test trên CPU trước:** mọi script train phải chạy được với `--max-samples 100` trên CPU trước khi đụng GPU.
2. **Checkpoint mỗi epoch** — GPU crash không mất quá 1 epoch.
3. **Một người giữ chìa khoá GPU:** chỉ ML lead được submit job, tránh 3 dev tranh nhau GPU.
4. Nếu #2 vượt 3h → hạ xuống **ViDeBERTa-xsmall (22M)**, chấp nhận F1 giảm ~1-2 điểm.

---

## 7. Timeline khớp Roadmap

| Ngày | Công việc data | Người phụ trách |
|---|---|---|
| **Day 1** | Tải toàn bộ dataset P0, đăng ký PhishTank key | 1 ML dev |
| **Day 2** | Script dedup + split + EDA notebook; sinh synthetic VI (Ollama) | 2 ML dev |
| **Day 3 sáng** | ✅ **GATE: Data freeze** — approve composition, khoá test set | ML lead |
| **Day 3-4** | Train baseline (#1, #2, #3) | ML lead |
| **Day 5** | Sinh adversarial samples + re-train (#4, #5) + export ONNX (#6) | 2 ML dev |

---

## 8. Deliverables của tài liệu này

```text
ai/data/
├── download_datasets.py      # Tải tất cả nguồn P0/P1, verify checksum
├── preprocess_url.py         # Dedup + domain split → data/url/{train,val,test}.parquet
├── preprocess_text_vi.py     # 3 tầng + dedup fuzzy → data/text/{train,val,test}.parquet
├── preprocess_prompt.py      # Merge HF datasets → data/prompt/{train,val,test}.parquet
├── generate_synthetic_vi.py  # Sinh scam VI qua Ollama (template-controlled)
└── DATA_CARD.md              # Data card cuối: nguồn, license, số liệu thật sau xử lý
```

**Acceptance criteria:** Cả 3 bộ `{train,val,test}.parquet` tồn tại, không leakage (script check domain overlap = 0), DATA_CARD.md ghi rõ license từng nguồn, test set không chứa synthetic.