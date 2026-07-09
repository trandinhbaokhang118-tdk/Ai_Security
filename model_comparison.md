# So sánh và Đề xuất Model cho AI Security Armor

## Tổng quan bối cảnh

Sản phẩm cần model cho 3 modality chính trong MVP 10 ngày:
1. **Email/Text phishing detection** (tiếng Việt ưu tiên, hỗ trợ tiếng Anh)
2. **URL phishing detection** (language-agnostic, dựa trên lexical features)
3. **Prompt injection detection** (chủ yếu tiếng Anh, nhưng cần multilingual)

Tiêu chí chấm: (1) Hiệu năng/Thông minh, (2) Nhẹ/Dễ chạy, (3) Đa ngôn ngữ (Việt ưu tiên), (4) Kỳ vọng F1 sau fine-tune.

---

## MODALITY 1: Email/Text Phishing Detection

### Candidates

| Model | Params | Size (FP32) | Kiến trúc | Hỗ trợ tiếng Việt | Ghi chú |
|---|---|---|---|---|---|
| **PhoBERT-base** | 135M | ~540MB | RoBERTa | ★★★★★ (monolingual VN) | SOTA tiếng Việt, cần VnCoreNLP word segmentation |
| **ViDeBERTa-base** | 86M | ~344MB | DeBERTa-v3 | ★★★★★ (monolingual VN) | Mới hơn, ít params hơn PhoBERT, SOTA trên QA |
| **ViDeBERTa-xsmall** | 22M | ~88MB | DeBERTa-v3 | ★★★★★ (monolingual VN) | Cực nhẹ, vẫn competitive |
| **mDeBERTa-v3-base** | 86M | ~344MB | DeBERTa-v3 | ★★★★ (100 ngôn ngữ, có VN) | Multilingual, không cần word segmentation |
| **XLM-RoBERTa-base** | 278M | ~1.1GB | RoBERTa | ★★★★ (100 ngôn ngữ, có VN) | Nặng, nhưng multilingual mạnh |
| **DistilBERT-multilingual** | 66M | ~264MB | DistilBERT | ★★★ (104 ngôn ngữ) | Nhẹ nhưng hiệu năng kém hơn DeBERTa |
| **PhoBERT-large** | 370M | ~1.5GB | RoBERTa | ★★★★★ | Quá nặng cho MVP, không cần thiết |

### Đánh giá chi tiết

#### PhoBERT-base
- **Hiệu năng**: SOTA trên POS, NER, NLI tiếng Việt. Cho text classification tiếng Việt thường đạt F1 93-97%.
- **Nhẹ**: 135M params, cần ~4GB VRAM fine-tune. Inference ~50ms/sample trên GPU.
- **Đa ngôn ngữ**: CHỈ tiếng Việt. Không xử lý được email tiếng Anh.
- **Hạn chế**: Cần VnCoreNLP word segmentation trước khi tokenize → thêm dependency, tăng latency.

#### ViDeBERTa-base (★ ĐỀ XUẤT CHO TEXT/EMAIL)
- **Hiệu năng**: Vượt PhoBERT trên QA, ngang/hơn trên NER/POS với chỉ 86M params (23% PhoBERT-large). DeBERTa-v3 architecture có disentangled attention → hiểu context tốt hơn.
- **Nhẹ**: 86M params, ~3GB VRAM fine-tune. Inference ~40ms/sample.
- **Đa ngôn ngữ**: CHỈ tiếng Việt. Cần kết hợp với model khác cho tiếng Anh.
- **Ưu điểm**: Dùng SentencePiece tokenizer (không cần VnCoreNLP), pipeline đơn giản hơn PhoBERT.

#### ViDeBERTa-xsmall
- **Hiệu năng**: Competitive nhưng thấp hơn base ~2-3% F1 trên hầu hết tasks.
- **Nhẹ**: 22M params, ~1.5GB VRAM. Có thể chạy trên CPU với ONNX.
- **Đa ngôn ngữ**: CHỈ tiếng Việt.
- **Use case**: Phù hợp cho on-device/mobile, không phải server MVP.

#### mDeBERTa-v3-base (★ ĐỀ XUẤT THAY THẾ NẾU CẦN MULTILINGUAL)
- **Hiệu năng**: Trên Vietnamese AI-Generated Text Detection đạt kết quả tốt. Cross-lingual transfer mạnh. Trên XNLI multilingual benchmark vượt XLM-R.
- **Nhẹ**: 86M params (giống ViDeBERTa-base), ~3GB VRAM.
- **Đa ngôn ngữ**: 100 ngôn ngữ bao gồm tiếng Việt. Xử lý cả email VN lẫn EN trong cùng 1 model.
- **Trade-off**: Hiệu năng trên tiếng Việt thuần có thể thấp hơn ViDeBERTa 1-3% do chia sẻ capacity cho 100 ngôn ngữ.

### ĐỀ XUẤT CUỐI CÙNG CHO EMAIL/TEXT:

> **Phương án A (Recommended): ViDeBERTa-base cho tiếng Việt + protectai/deberta-v3-base-prompt-injection cho tiếng Anh**
> 
> **Phương án B (Đơn giản hơn): mDeBERTa-v3-base — một model xử lý cả VN + EN**

**Lý do chọn Phương án A:**
- Hiệu năng tối ưu cho tiếng Việt (mục tiêu chính)
- ViDeBERTa đã được chứng minh SOTA trên Vietnamese benchmarks
- DeBERTa architecture có adversarial robustness tốt hơn RoBERTa (paper FLAT, 2022)
- 86M params vừa phải, train nhanh trên single GPU

**Kỳ vọng F1 sau fine-tune:**
- Email phishing VN: **94-97%** (dựa trên PhoBERT SMS spam đạt 99.53%, email phishing thường khó hơn)
- Email phishing EN: **97-99%** (dựa trên DistilBERT đạt 98.77%, DeBERTa thường cao hơn)

---

## MODALITY 2: URL Phishing Detection

### Candidates

| Model | Loại | Params/Size | Inference Speed | F1 kỳ vọng |
|---|---|---|---|---|
| **LightGBM + lexical features** | Gradient Boosting | <10MB | <5ms/URL | 95-97% |
| **CharCNN** | Deep Learning | ~5-15M params, ~60MB | ~10ms/URL | 96-98% |
| **URLTran (Transformer)** | Transformer | ~110M params, ~440MB | ~30ms/URL | 97-99% |
| **Ensemble: LightGBM + CharCNN** | Hybrid | ~70MB tổng | ~15ms/URL | 97-99% |

### Đánh giá chi tiết

#### LightGBM + Lexical Features (★ ĐỀ XUẤT CHÍNH)
- **Hiệu năng**: Trên PhishTank/UCI datasets đạt 95-97% accuracy. Paper 2024 đạt 99.74% trên dataset 450K URLs.
- **Nhẹ**: Model <10MB, ONNX export <5MB. Inference <5ms trên CPU.
- **Đa ngôn ngữ**: URL là language-agnostic (domain, TLD, entropy, length... không phụ thuộc ngôn ngữ).
- **Features**: URL length, domain entropy, subdomain depth, TLD risk, homoglyph score, special char ratio, path depth, query param count, shortlink flag, HTTPS flag, domain age (nếu có API).
- **Ưu điểm**: Train cực nhanh (<30 phút), interpretable (SHAP), dễ adversarial training.

#### CharCNN
- **Hiệu năng**: Character-level CNN capture được typosquatting, homoglyph tốt hơn feature engineering.
- **Nhẹ**: 5-15M params, chạy được trên CPU với ONNX.
- **Ưu điểm**: Không cần feature engineering thủ công, học trực tiếp từ raw URL string.
- **Hạn chế**: Cần nhiều data hơn LightGBM để train tốt.

#### URLTran (Transformer on URL)
- **Hiệu năng**: Microsoft paper 2021, vượt tất cả baselines ở very low FPR. Tốt nhất cho production-scale.
- **Nhẹ**: 110M params — quá nặng cho MVP, overkill.
- **Hạn chế**: Cần pre-train trên corpus URL lớn, không phù hợp 10 ngày.

### ĐỀ XUẤT CUỐI CÙNG CHO URL:

> **LightGBM + Lexical Features (primary) + CharCNN (secondary/ensemble nếu kịp)**

**Lý do:**
- LightGBM train trong 30 phút, đạt 95-97% ngay lập tức
- SHAP explainability → dễ tạo evidence cho verdict
- ONNX export <5MB, inference <5ms → đáp ứng latency <300ms dễ dàng
- CharCNN bổ sung nếu có thời gian, tăng robustness với typosquatting

**Kỳ vọng F1:** **95-98%** trên clean test, **88-93%** trên adversarial test (trước adversarial training)

---

## MODALITY 3: Prompt Injection Detection

### Candidates

| Model | Params | F1 reported | Hỗ trợ multilingual | Ghi chú |
|---|---|---|---|---|
| **protectai/deberta-v3-base-prompt-injection** | 184M | 99.98% | English only | SOTA, production-ready, có ONNX |
| **protectai/deberta-v3-base-prompt-injection-v2** | 184M | ~99.9% | English + cải thiện | Version mới hơn |
| **mDeBERTa-v3-base fine-tune** | 86M | ~95-97% (estimate) | 100 ngôn ngữ | Cần tự fine-tune |
| **Rule-based + lightweight classifier** | N/A | ~85-90% | Bất kỳ | Nhanh, nhưng dễ bypass |

### Đánh giá chi tiết

#### protectai/deberta-v3-base-prompt-injection-v2 (★ ĐỀ XUẤT)
- **Hiệu năng**: F1 = 99.98% trên eval set. Được dùng trong LLM Guard (production tool).
- **Nhẹ**: 184M params (DeBERTa-v3-base), ~3GB VRAM inference. Có sẵn ONNX export.
- **Đa ngôn ngữ**: Chủ yếu English, nhưng prompt injection thường viết bằng English ngay cả khi target là VN app.
- **Ưu điểm**: Không cần train, dùng ngay. Apache 2.0 license.
- **Hạn chế**: Có thể miss prompt injection viết hoàn toàn bằng tiếng Việt.

#### Giải pháp bổ sung cho tiếng Việt:
- Fine-tune thêm mDeBERTa-v3-base trên custom Vietnamese prompt injection dataset
- Hoặc: dùng rule-based layer (regex patterns) + protectai model

### ĐỀ XUẤT CUỐI CÙNG CHO PROMPT INJECTION:

> **protectai/deberta-v3-base-prompt-injection-v2 (pre-trained, dùng ngay) + rule-based Vietnamese patterns**

**Kỳ vọng F1:** **97-99%** cho English prompts, **90-95%** cho Vietnamese prompts (với rule augmentation)

---

## TỔNG HỢP ĐỀ XUẤT

| Modality | Model đề xuất | Params | Size ONNX | Inference | F1 kỳ vọng | Train time (1 GPU) |
|---|---|---|---|---|---|---|
| Email/Text VN | **ViDeBERTa-base** | 86M | ~170MB (INT8) | ~40ms | 94-97% | 2-4h |
| Email/Text EN | **mDeBERTa-v3-base** (hoặc share ViDeBERTa) | 86M | ~170MB | ~40ms | 97-99% | 2-4h |
| URL | **LightGBM** | N/A | <5MB | <5ms | 95-98% | <30min |
| Prompt Injection | **protectai/deberta-v3-base-prompt-injection-v2** | 184M | ~360MB | ~50ms | 97-99% | 0 (pre-trained) |

### Tổng GPU time ước tính: ~6-10 giờ (vừa đủ budget 10h)

Breakdown:
- ViDeBERTa-base fine-tune email/text VN: 3-4h
- mDeBERTa-v3-base fine-tune (nếu cần): 2-3h  
- LightGBM URL: <1h (CPU cũng được)
- Prompt injection: 0h (dùng pre-trained)
- Adversarial training (re-train với augmented data): 2-3h
- Buffer cho experiment/debug: 1-2h

---

## SO SÁNH PHƯƠNG ÁN TỔNG THỂ

### Phương án A: Tối ưu hiệu năng (Recommended)

```
Email/Text VN → ViDeBERTa-base (fine-tune)
Email/Text EN → mDeBERTa-v3-base (fine-tune) hoặc share model VN
URL           → LightGBM + lexical features
Prompt Inj.   → protectai/deberta-v3-base-prompt-injection-v2
```

**Ưu điểm:** Hiệu năng cao nhất cho tiếng Việt, mỗi modality có model tối ưu riêng.
**Nhược điểm:** 3-4 models riêng biệt, phức tạp hơn khi deploy.

### Phương án B: Đơn giản hóa (1 model backbone)

```
Email/Text VN+EN → mDeBERTa-v3-base (fine-tune, multilingual)
URL              → LightGBM + lexical features  
Prompt Inj.      → protectai/deberta-v3-base-prompt-injection-v2
```

**Ưu điểm:** Ít model hơn, deploy đơn giản, 1 backbone cho text.
**Nhược điểm:** Hiệu năng VN thấp hơn 1-3% so với ViDeBERTa.

### Phương án C: Tối ưu cho demo BGK (Recommended nếu muốn impress)

```
Email/Text VN → ViDeBERTa-base (fine-tune) — highlight "Vietnamese SOTA"
URL           → LightGBM (primary) + CharCNN (ensemble) — highlight "ensemble robustness"
Prompt Inj.   → protectai/deberta-v3-base-prompt-injection-v2 — highlight "industry-grade"
Explainer     → Ollama + Qwen2.5-7B hoặc gọi GPT API — tạo safe_summary bằng NL
```

**Ưu điểm:** Mỗi component có câu chuyện riêng để trình bày BGK. Thể hiện depth of knowledge.
**Nhược điểm:** Phức tạp nhất, cần quản lý nhiều model.

---

## VỀ VIỆC CHỌN MODEL CHO EXPLAINER (LLM tạo safe_summary)

Sản phẩm cần LLM để:
- Tạo `safe_summary` giải thích verdict bằng ngôn ngữ tự nhiên
- Hỗ trợ chat console trong demo
- KHÔNG dùng làm detector chính

| Option | Ưu điểm | Nhược điểm |
|---|---|---|
| **GPT-4o-mini API** | Nhanh, rẻ, chất lượng cao | Phụ thuộc internet, privacy concern |
| **Ollama + Qwen2.5-7B** | Local, privacy, offline demo | Cần GPU 8GB+, chậm hơn |
| **Ollama + Llama-3.1-8B** | Local, mạnh reasoning | Cần GPU 8GB+ |
| **Template-based** | Không cần LLM, deterministic | Kém linh hoạt, không "wow" BGK |

**Đề xuất:** Dùng **GPT-4o-mini API** cho demo (nhanh, ổn định) + có fallback template-based nếu mất mạng.

---

## KẾT LUẬN VÀ RECOMMENDATION

**Recommendation cuối cùng cho team 5 người, 10 ngày MVP:**

| Component | Model | Lý do chọn |
|---|---|---|
| Text/Email VN | **ViDeBERTa-base** | SOTA VN, 86M params, DeBERTa arch robust |
| URL | **LightGBM** | Nhanh, nhẹ, interpretable, train 30 phút |
| Prompt Injection | **protectai/deberta-v3-base-prompt-injection-v2** | Dùng ngay, F1 99.98%, production-proven |
| Explainer | **GPT-4o-mini API** | Cho safe_summary, không phải detector |
| Adversarial | **TextAttack** framework | Sinh adversarial samples, đo robustness |

**Tổng GPU budget:** ~8h fine-tune + adversarial training. Vừa đủ 10h budget.

**Điểm mạnh khi trình bày BGK:**
1. "Chúng tôi chọn ViDeBERTa vì nó là SOTA cho tiếng Việt với chỉ 86M params — hiệu quả hơn PhoBERT 135M"
2. "URL detection dùng LightGBM vì interpretable (SHAP), inference <5ms, và có thể adversarial training dễ dàng"
3. "Prompt injection dùng model production-grade từ ProtectAI, đã được validate ở F1 99.98%"
4. "Mỗi model được chọn có lý do kỹ thuật rõ ràng, không phải random pick"
