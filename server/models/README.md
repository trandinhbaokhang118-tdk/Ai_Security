# AI Model Artifacts

Runtime artifacts:

- `url_lgbm.onnx`
- `mdeberta_text.onnx` (real-data CPU text phishing classifier)
- `protectai_prompt.onnx` (lightweight prompt-injection fallback)
- `mdeberta_text_transformer.onnx` + `mdeberta_text_tokenizer/` (candidate Transformer, quality-gated off until retrained)
- `protectai_prompt_transformer.onnx` + `protectai_prompt_tokenizer/` (ProtectAI prompt-injection Transformer)

## Current Text Model

`mdeberta_text.onnx` is currently the production text/email model used by the backend on CPU.

It was trained from:

```powershell
python -m ai.training.train_real_text_classifier --train data/phishing_text_train.csv --validation data/phishing_text_validation.csv --test data/phishing_text_test.csv --out server/models
```

Latest metrics from `mdeberta_text.meta.json`:

- validation F1: `0.9718`
- validation ROC-AUC: `0.9972`
- test F1: `0.9677`
- test ROC-AUC: `0.9968`

## Transformer Gate

The local `mdeberta_text_transformer.onnx` artifact is preserved for experimentation, but the runtime disables it when metadata reports validation F1 below `0.65`. The current CPU demo export has F1 `0.5273`, so it must be retrained before becoming a primary branch.

For production Transformer training, run on GPU without the local demo caps:

```powershell
python -m ai.training.train_text_transformer --data data/phishing_text_train.csv --validation-data data/phishing_text_validation.csv --epochs 3 --batch-size 8 --gradient-accumulation 2 --max-len 256
```

The official ProtectAI classifier can be exported without further fine-tuning:

```powershell
python -m ai.training.train_prompt_transformer --export-pretrained
```

Dynamic INT8 quantization changed DeBERTa logits in local verification, so only use `--quantize` after comparing ONNX probabilities against the PyTorch checkpoint.
