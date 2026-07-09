# Server Models

`server/models/` is the backend runtime model directory. The API loads ONNX files from here at startup and exposes exact readiness through `GET /v1/health` in `model_status`.

## Runtime Files

| File | Role | Current status |
|---|---|---|
| `url_lgbm.onnx` | URL phishing classifier | Loaded when file and `onnxruntime` are available |
| `mdeberta_text.onnx` | Email/text phishing classifier | Real-data CPU production branch |
| `mdeberta_text_transformer.onnx` + `mdeberta_text_tokenizer/` | Candidate text Transformer | Quality-gated off while validation F1 is below `0.65` |
| `protectai_prompt.onnx` | Lightweight prompt-injection model | Fallback branch |
| `protectai_prompt_transformer.onnx` + `protectai_prompt_tokenizer/` | ProtectAI prompt-injection classifier | Primary prompt branch when runtime dependencies load |

## Current Text Training

The text/email model has been trained on the real phishing text splits:

```powershell
python -m ai.training.train_real_text_classifier --train data/phishing_text_train.csv --validation data/phishing_text_validation.csv --test data/phishing_text_test.csv --out server/models
```

Latest held-out metrics:

- validation F1: `0.9718`
- validation ROC-AUC: `0.9972`
- test F1: `0.9677`
- test ROC-AUC: `0.9968`

## Runtime Health

`GET /v1/health` now returns:

- `models_loaded`: true only when URL, text, and prompt modalities have a usable branch
- `model_status.runtime`: installed runtime package versions and ONNX providers
- `model_status.models.*`: per-model file existence, session readiness, tokenizer readiness, metrics, load errors, and disabled reasons

This makes missing dependencies, missing tokenizer folders, bad ONNX files, and quality-gated models visible from the API instead of being silently swallowed.
