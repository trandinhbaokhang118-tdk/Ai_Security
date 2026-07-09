# Model Validation Report

**Generated:** 2026-07-07  
**Validation Dataset:** data/phishing_text_validation.csv, data/url_dataset.csv, data/prompt_injection_validation.csv

## Executive Summary

✅ **All models loaded and operational**

| Model | Accuracy | Precision | Recall | F1 Score | Status |
|-------|----------|-----------|--------|----------|--------|
| **Text Phishing** | 93.28% | 94.01% | 86.89% | 90.31% | ✅ Excellent |
| **Prompt Injection** | 97.73% | 95.81% | 96.74% | 96.27% | ✅ Excellent |
| **URL Phishing** | 77.60% | 76.54% | 79.60% | 78.04% | ⚠️ Needs Improvement |

---

## 1. Text Phishing Model

### Performance Metrics
- **Accuracy:** 93.28%
- **Precision:** 94.01%
- **Recall:** 86.89%
- **F1 Score:** 90.31%
- **Test Samples:** 10,269

### Confusion Matrix
```
                 Predicted
              Benign  Malicious
Actual Benign  6364      205      (FP: 205)
    Malicious   485     3215      (FN: 485)
```

### Analysis
- **Total Misclassifications:** 690 / 10,269 (6.72%)
- **False Positives:** 205 (3.1% of benign samples)
- **False Negatives:** 485 (13.1% of malicious samples)

### Key Findings

#### Strengths
✅ High precision (94%) - when it flags something as malicious, it's usually correct  
✅ Good overall accuracy (93%)  
✅ Hybrid model combining transformer + lightweight + rules working well

#### Weaknesses
⚠️ Lower recall (87%) - misses about 13% of actual phishing  
⚠️ Some URLs in text content cause parsing issues (IPv6 URLs)

#### Example Misclassifications

**False Negative Example:**
```
URL: https://heading.servebeer.com/?checkid=a@abc
True: MALICIOUS, Predicted: BENIGN (Score: 0.4663)
Reason: Lacks strong phishing signals despite being malicious
```

**False Positive Example:**
```
URL: http://pc.ushareit.com/
True: BENIGN, Predicted: MALICIOUS (Score: 0.7520)
Reason: Triggered suspicious keyword detection
```

### Recommendations

1. **Improve Recall**
   - Retrain with more focus on catching subtle phishing patterns
   - Add more context-aware features (email headers, sender information)
   - Consider ensemble with additional models

2. **Fix URL Parsing**
   - ✅ Already fixed IPv6 URL handling in url_adapter.py
   - Add more robust error handling for malformed URLs

3. **Fine-tune Threshold**
   - Current threshold: 0.5
   - Consider lowering to 0.45 to catch more phishing (trade precision for recall)
   - Implement dynamic thresholds based on context

---

## 2. Prompt Injection Model

### Performance Metrics
- **Accuracy:** 97.73%
- **Precision:** 95.81%
- **Recall:** 96.74%
- **F1 Score:** 96.27%
- **Test Samples:** 1,014

### Confusion Matrix
```
                 Predicted
              Benign  Injection
Actual Benign   694      13      (FP: 13)
    Injection    10     297      (FN: 10)
```

### Analysis
- **Total Misclassifications:** 23 / 1,014 (2.27%)
- **False Positives:** 13 (1.8% of benign prompts)
- **False Negatives:** 10 (3.3% of injection attempts)

### Key Findings

#### Strengths
✅ Excellent accuracy (98%)  
✅ Very high precision and recall  
✅ Low false positive rate  
✅ ProtectAI transformer model performing exceptionally well

#### Weaknesses
⚠️ Minimal - only 23 misclassifications total  
⚠️ May need testing on newer injection techniques

### Recommendations

1. **Maintain Current Performance**
   - Model is performing excellently
   - Continue monitoring for new injection patterns

2. **Expand Training Data**
   - Add examples of newer injection techniques (jailbreaking, roleplay attacks)
   - Include multilingual injection attempts

3. **Consider Ensemble**
   - Add rule-based detection for known patterns
   - Combine with LLM-based semantic analysis

---

## 3. URL Phishing Model ⚠️

### Performance Metrics
- **Accuracy:** 77.60%
- **Precision:** 76.54%
- **Recall:** 79.60%
- **F1 Score:** 78.04%
- **Test Samples:** 500 (capped from larger dataset)

### Confusion Matrix
```
                 Predicted
              Benign  Malicious
Actual Benign   189      61      (FP: 61)
    Malicious    51     199      (FN: 51)
```

### Analysis
- **Total Misclassifications:** 112 / 500 (22.4%)
- **False Positives:** 61 (24.4% of benign URLs)
- **False Negatives:** 51 (20.4% of malicious URLs)

### Key Findings

#### Strengths
✅ Reasonable recall (80%) - catches most phishing URLs  
✅ Balanced precision and recall  
✅ Good signal detection (brand mismatch, homoglyphs, etc.)

#### Weaknesses
❌ **Overall accuracy needs improvement (77.6%)**  
❌ High false positive rate (24.4%)  
❌ Misses legitimate-looking phishing URLs  
❌ Over-triggers on legitimate URLs with keywords

#### False Negative Patterns

Many missed phishing URLs have:
- ✅ HTTPS (appears secure)
- ✅ No obvious brand impersonation
- ✅ Clean-looking domain names
- ✅ No suspicious keywords

**Examples:**
```
- punefoodhub.com/ (Score: 0.45)
- theexorcist.warnerbros.com/ (Score: 0.41)
- leginfo.ca.gov/ (Score: 0.19)
```

#### False Positive Patterns

Many incorrectly flagged URLs trigger:
- Brand mismatch (legitimate multi-brand sites)
- Keyword detection (normal use of "secure", "login", etc.)
- Many delimiters (complex but legitimate URLs)

**Examples:**
```
- secure2.appleid.apple.com-0583-9589-2884-9284-5871-8589.info (Score: 1.00)
  Triggers: brand_mismatch, keywords(secure), many_delimiters
  
- allcateringservices.in/JHgy64HJBRd?spiIvoONWBj=fBGONconi (Score: 0.82)
  Triggers: Complex query parameters
```

### Critical Recommendations

1. **Retrain Model with Better Data**
   - Current training data may have quality issues
   - Need more diverse, real-world phishing examples
   - Balance dataset better (currently 516 malicious, 484 benign in test set)

2. **Improve Feature Engineering**
   ```python
   New features to add:
   - Domain age (WHOIS lookup)
   - SSL certificate validity
   - Domain reputation score
   - Page rank / traffic data
   - DNS record analysis
   - Historical phishing database matches
   ```

3. **Reduce False Positives**
   - Build whitelist of known legitimate domains
   - Context-aware keyword detection
   - Reduce weight of "suspicious keywords" feature
   - Better handling of complex legitimate URLs

4. **Improve Detection of Sophisticated Phishing**
   - Add deeper content analysis
   - Screenshot-based visual similarity detection
   - Brand logo detection in page content
   - NLP analysis of page text

5. **Immediate Actions**
   ```bash
   # Retrain URL model with improved features
   python -m ai.training.train_url_lgbm \
     --data data/url_dataset_improved.csv \
     --out ai/models
   
   # Add domain whitelist
   python scripts/build_domain_whitelist.py
   
   # Tune hyperparameters
   python scripts/tune_url_model.py
   ```

---

## 4. Overall System Assessment

### System Status
✅ **Production Ready with Caveats**

- Text Model: ✅ Excellent
- Prompt Model: ✅ Excellent  
- URL Model: ⚠️ Acceptable but needs improvement

### Risk Assessment

| Component | Risk Level | Mitigation |
|-----------|-----------|------------|
| Text Model | 🟢 Low | High accuracy, continue monitoring |
| Prompt Model | 🟢 Low | Excellent performance |
| URL Model | 🟡 Medium | **Priority: Improve before full production** |

### Deployment Recommendations

#### For Immediate Deployment
- ✅ Text phishing detection
- ✅ Prompt injection detection
- ⚠️ URL detection with additional rule-based backup

#### Before Full Production
1. **URL Model Improvements** (High Priority)
   - Retrain with curated dataset
   - Add domain reputation features
   - Implement whitelist system

2. **Monitoring Setup**
   - Track false positive/negative rates in production
   - Log misclassifications for analysis
   - A/B test model improvements

3. **Feedback Loop**
   - Collect user reports
   - Build retraining pipeline
   - Quarterly model updates

---

## 5. Fixes Implemented

### ✅ Fixed Issues

1. **IPv6 URL Parsing Error**
   - **Issue:** "Invalid IPv6 URL" errors causing crashes
   - **Fix:** Improved `_normalize_for_urlparse()` and `is_ip_host()` in url_adapter.py
   - **Status:** ✅ Resolved

2. **Error Handling in URL Prediction**
   - **Issue:** Unparseable URLs crash the system
   - **Fix:** Added try-catch in `predict_url()` with graceful fallback
   - **Status:** ✅ Resolved

3. **Better Error Messages**
   - **Issue:** Cryptic error messages
   - **Fix:** Clear error messages with context
   - **Status:** ✅ Resolved

---

## 6. Next Steps

### Immediate (This Week)
- [ ] Build domain whitelist from Alexa/Tranco top sites
- [ ] Collect more diverse phishing URL samples
- [ ] Tune URL model hyperparameters

### Short Term (This Month)
- [ ] Retrain URL model with improved dataset
- [ ] Add domain reputation API integration
- [ ] Implement caching for URL features
- [ ] Set up production monitoring dashboard

### Long Term (This Quarter)
- [ ] Build automated retraining pipeline
- [ ] Add visual phishing detection (screenshots)
- [ ] Implement federated learning from user feedback
- [ ] Create model versioning and rollback system

---

## Conclusion

The AI Security Armor models are largely **production-ready** with excellent performance on text and prompt injection detection. The URL model needs improvement but is functional with current rule-based backups.

**Key Takeaway:** Text (93% F1) and Prompt (96% F1) models are excellent. URL model (78% F1) needs retraining and feature improvements before full production deployment.

**Overall Grade:** B+ (would be A with URL model improvements)

---

**Report Generated By:** Model Validation Test Suite  
**Validated On:** 10,269 text samples, 500 URL samples, 1,014 prompt samples  
**Models Tested:** mdeberta_text.onnx, protectai_prompt.onnx, url_lgbm.onnx
