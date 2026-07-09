# GPU Budget Breakdown — AI Security Armor

> **Ngân sách tổng:** ~10 giờ GPU (single GPU, giả định RTX 3090/4090 hoặc tương đương cloud — 24GB VRAM)
> **Nguyên tắc:** Ưu tiên model nhỏ + fp16 + gradient checkpointing để không vượt ngân sách.

---

## 1. Bảng phân bổ chi tiết theo từng job

| # | Job | Model | GPU? | Est. Time | Epochs | Batch | Precision | Checkpoint |
|---|---|---|---|---|---|---|---|---|
| 1 | Train URL Classifier | LightGBM | ❌ CPU | 20-30 phút | n/a | n/a | n/a | mỗi 100 iter |
| 2 | Fine-tune Email/Text VI (baseline) | ViDeBERTa-base (86M) | ✅ | **2.5h** | 3 | 32 | fp16 | mỗi epoch |
| 3 | Fine-tune Prompt Injection (baseline) | mDeBERTa-v3-base (86M) | ✅ | **1.5h** | 3 | 32 | fp16 | mỗi epoch |
| 4 | Gen adversarial samples (URL+Text+Prompt) | Script (CPU) + Ollama (CPU/GPU nhẹ) | ⚠️ nhẹ | 30 phút | n/a | n/a | n/a | n/a |
| 5 | Adversarial re-train Email/Text VI | ViDeBERTa-base | ✅ | **2.0h** | 2 (từ checkpoint #2) | 32 | fp16 | mỗi epoch |
| 6 | Adversarial re-train Prompt Injection | mDeBERTa-v3-base | ✅ | **1.0h** | 2 (từ checkpoint #3) | 32 | fp16 | mỗi epoch |
| 7 | ONNX export + INT8 quantization | Tất cả 3 model | ✅ (nhẹ) | **0.3h** | n/a | n/a | INT8 | n/a |
| 8 | Latency benchmark (P50/P95) | Tất cả | ✅ (nhẹ) | **0.2h** | n/a | n/a | n/a | n/a |
| 9 | **Buffer dự phòng** (OOM, LR retry, crash) | — | ✅ | **2.0h** | — | — | — | — |
| | **TỔNG** | | | **~10.0h** | | | | |

---

## 2. Chiến lược tiết kiệm GPU (nếu vượt ngân sách)

| Tình huống | Giải pháp giảm tải |
|---|---|
| Job #2 vượt 3h | Hạ xuống **ViDeBERTa-xsmall (22M)** → giảm ~60% thời gian, chấp nhận F1 giảm 1-2 điểm |
| Job #3 vượt 2h | Freeze 6/12 layer đầu của mDeBERTa, chỉ fine-tune layer cuối + classifier head |
| Không đủ thời gian cho adversarial re-train | Dùng **LoRA/PEFT** (rank=8) thay full fine-tune → giảm ~70% VRAM & thời gian |
| GPU cloud bị giới hạn giờ cứng | Ưu tiên chạy job #2, #3 (baseline) trước — đây là MVP core; job #5, #6 (adversarial) có thể chạy sau nếu còn dư giờ |

---

## 3. Quy tắc kỷ luật vận hành GPU

1. **Smoke test CPU trước GPU:** mọi script `train.py` PHẢI chạy được `--max-samples 100 --device cpu` không lỗi trước khi submit GPU job.
2. **1 người giữ quyền submit GPU job** (ML lead) — tránh nhiều dev tranh chấp giờ chạy.
3. **Checkpoint mỗi epoch**, lưu `best_model.onnx` theo val F1 — GPU crash giữa job không mất quá 1 epoch.
4. **Log timer thực tế** vào `gpu_usage_log.csv` (job_id, start, end, actual_hours) — so sánh với bảng ước tính để cảnh báo sớm nếu lệch >20%.
5. **Early stopping** patience=1 trên val loss — không train dư epoch vô ích.

---

## 4. Timeline khớp với Roadmap (Sprint 2, Days 3-5)

| Ngày | Job chạy | Giờ GPU tích lũy |
|---|---|---|
| Day 3 | Job #1 (CPU) + Job #2 | 2.5h / 10h |
| Day 4 | Job #3 + Job #4 (gen adversarial) | 4.0h / 10h |
| Day 5 sáng | Job #5 + Job #6 | 7.0h / 10h |
| Day 5 chiều | Job #7 + Job #8 | 7.5h / 10h |
| Buffer dùng nếu cần | Job #9 | tối đa 10h |

**Gate kiểm soát:** Nếu đến hết Day 4 mà tổng giờ đã dùng > 6h (kế hoạch là 4h) → BÁO NGAY cho team lead để cắt bớt job #5/#6 (chuyển sang LoRA) chứ không chờ đến Day 5 mới xử lý.