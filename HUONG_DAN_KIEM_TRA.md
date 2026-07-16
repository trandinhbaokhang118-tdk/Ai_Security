# HƯỚNG DẪN KIỂM TRA VÀ ĐÁNH GIÁ MODELS

## Mục đích
Hướng dẫn này giúp bạn kiểm tra độ chính xác của các AI models trong dự án AI Security Armor với dữ liệu validation thực tế.

---

## Các Scripts Kiểm tra

### 1. verify_all_models.py - Kiểm tra nhanh
**Mục đích:** Verify models đã được load và chạy quick test

```bash
python verify_all_models.py
```

**Output:**
- Model status (loaded/ready)
- Model metrics từ metadata
- Quick inference tests
- Overall system health

**Thời gian:** ~5 giây

---

### 2. test_model_with_validation_data.py - Test đầy đủ
**Mục đích:** Test toàn diện với validation data thực

```bash
python test_model_with_validation_data.py
```

**Output:**
- Accuracy, Precision, Recall, F1 cho mỗi model
- Confusion matrix
- Ví dụ predictions
- Misclassifications analysis

**Thời gian:** ~2-3 phút

**Yêu cầu:**
- `data/phishing_text_validation.csv` (text model)
- `data/url_dataset.csv` (URL model)
- `data/prompt_injection_validation.csv` (prompt model)

---

### 3. improve_url_model.py - Phân tích URL model
**Mục đích:** Deep dive vào URL model misclassifications

```bash
python improve_url_model.py
```

**Output:**
- False negatives analysis (missed phishing)
- False positives analysis (wrongly flagged)
- Pattern detection
- Improvement suggestions

**Thời gian:** ~30 giây

---

## Cách Đọc Kết Quả

### Metrics Quan Trọng

**Accuracy (Độ chính xác):**
- % predictions đúng tổng thể
- Mục tiêu: >90% cho production

**Precision (Độ chính xác dương):**
- Khi model nói "phishing", % thực sự là phishing
- Quan trọng để giảm false alarms
- Mục tiêu: >85%

**Recall (Độ nhạy):**
- % phishing thực sự được model phát hiện
- Quan trọng để không bỏ sót threats
- Mục tiêu: >85%

**F1 Score:**
- Trung bình điều hòa của Precision và Recall
- Metric tổng hợp tốt nhất
- Mục tiêu: >85%

### Confusion Matrix

```
                 Predicted
              Benign  Malicious
Actual Benign   TN       FP       <- False Positives (báo nhầm)
    Malicious   FN       TP       <- False Negatives (bỏ sót)
```

- **TN (True Negative):** Đúng là benign ✅
- **TP (True Positive):** Đúng là malicious ✅
- **FP (False Positive):** Benign nhưng báo là malicious ❌
- **FN (False Negative):** Malicious nhưng báo là benign ❌

---

## Ví Dụ Kết Quả Tốt

```
TEXT MODEL:
  Accuracy:  0.9328   <- Tốt (>93%)
  Precision: 0.9401   <- Rất tốt (>94%)
  Recall:    0.8689   <- Khá (>86%)
  F1 Score:  0.9031   <- Tốt (>90%)
  Samples:   10269

PROMPT MODEL:
  Accuracy:  0.9773   <- Xuất sắc (>97%)
  Precision: 0.9581   <- Xuất sắc (>95%)
  Recall:    0.9674   <- Xuất sắc (>96%)
  F1 Score:  0.9627   <- Xuất sắc (>96%)
  Samples:   1014

URL MODEL:
  Accuracy:  0.7760   <- Cần cải thiện (78%)
  Precision: 0.7654   <- Cần cải thiện (77%)
  Recall:    0.7960   <- Khá (80%)
  F1 Score:  0.7804   <- Cần cải thiện (78%)
  Samples:   500
```

---

## Xử Lý Khi Có Vấn Đề

### Model không load được

**Triệu chứng:**
```
❌ Model not loaded
Error: model file is missing
```

**Giải pháp:**
```bash
# Kiểm tra file tồn tại
ls ai/models/

# Nếu thiếu, chạy training
python -m ai.training.train_text_transformer --data data/...
```

### Accuracy thấp (<80%)

**Nguyên nhân có thể:**
1. Dữ liệu validation không phù hợp
2. Model chưa được train đủ
3. Data drift (dữ liệu production khác training)

**Giải pháp:**
1. Kiểm tra chất lượng validation data
2. Retrain với more epochs
3. Collect more diverse training data
4. Feature engineering

### High False Positives

**Triệu chứng:**
- Precision thấp (<80%)
- Nhiều benign bị báo nhầm

**Giải pháp:**
1. Tăng threshold (từ 0.5 -> 0.6)
2. Build whitelist cho known good domains
3. Reduce weight của sensitive features
4. Retrain với balanced data

### High False Negatives

**Triệu chứng:**
- Recall thấp (<80%)
- Nhiều malicious bị bỏ sót

**Giải pháp:**
1. Giảm threshold (từ 0.5 -> 0.4)
2. Thêm more sophisticated features
3. Collect more malicious samples
4. Ensemble with additional models

---

## Checklist Trước Production

- [ ] All models load successfully
- [ ] Text Model F1 > 85%
- [ ] Prompt Model F1 > 85%
- [ ] URL Model F1 > 75% (với whitelist backup)
- [ ] False Positive rate < 20%
- [ ] False Negative rate < 20%
- [ ] Quick inference test pass
- [ ] No critical errors in logs
- [ ] Validation data representative
- [ ] Monitoring system ready

---

## Troubleshooting

### Lỗi: "Invalid IPv6 URL"
✅ **Đã fix** trong url_adapter.py

### Lỗi: UnicodeEncodeError
✅ **Đã fix** trong test scripts (removed emojis)

### Lỗi: Module not found
```bash
# Install dependencies
pip install -r requirements.txt

# Or specific packages
pip install numpy pandas scikit-learn onnxruntime
```

### Model quá chậm
```bash
# Use quantized models
python -m ai.training.train_transformer_classifier \
  --task text --quantize

# Or use CPU optimization
export ORT_DISABLE_TRT=1
```

---

## Best Practices

### 1. Test Thường Xuyên
```bash
# Daily quick check
python verify_all_models.py

# Weekly full validation
python test_model_with_validation_data.py

# Monthly deep analysis
python improve_url_model.py
```

### 2. Version Control cho Models
```bash
# Tag model versions
git tag -a v1.0-text-model -m "Text model v1.0, F1=0.90"

# Backup models
cp ai/models/*.onnx backups/models-2026-07-07/
```

### 3. Monitor Production Metrics
```python
# Log predictions
logger.info(f"URL={url}, Score={score}, Model={version}")

# Track false positives from user reports
db.save_feedback(url, true_label, predicted_label)
```

### 4. A/B Testing
```python
# Test new model vs old model
if user_id % 2 == 0:
    use_model_v2()
else:
    use_model_v1()
```

---

## Resources

### Documentation
- `MODEL_VALIDATION_REPORT.md` - Detailed English report
- `BAO_CAO_KIEM_TRA_MODEL.md` - Vietnamese report
- `TONG_KET.md` - Summary và action items

### Scripts
- `test_model_with_validation_data.py` - Main test
- `improve_url_model.py` - URL analysis
- `scripts/improve_url_features.py` - Enhanced features

### Validation Data
- `data/phishing_text_validation.csv` - 10,269 samples
- `data/url_dataset.csv` - URL samples
- `data/prompt_injection_validation.csv` - 1,014 samples

---

## FAQs

**Q: Tần suất test bao nhiêu là đủ?**  
A: 
- Quick check: Mỗi deploy
- Full validation: Mỗi tuần
- Deep analysis: Mỗi tháng

**Q: Threshold nào là tốt?**  
A:
- Default: 0.5
- High security: 0.4 (catch more, more false positives)
- Low false alarms: 0.6 (miss some, fewer false positives)

**Q: Khi nào cần retrain?**  
A:
- F1 score giảm >5% so với baseline
- High false positive rate từ user feedback
- Có data mới significant
- Quarterly scheduled retraining

**Q: Model size bao nhiêu là OK?**  
A:
- Text: ~500MB (mDeBERTa)
- Prompt: ~500MB (ProtectAI)
- URL: ~5MB (LightGBM)
- Total: ~1GB là reasonable

---

## Contact

Nếu có vấn đề không giải quyết được:
1. Check logs: `.codex-run/*.log`
2. Check reports: `*_REPORT.md`
3. Run diagnostics: `python verify_all_models.py`
4. Open issue với full error logs

---

**Last Updated:** 2026-07-07  
**Version:** 1.0  
**Tested On:** Windows, Python 3.12
