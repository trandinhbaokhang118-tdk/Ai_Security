# Huấn luyện Prewise adapters trên Kaggle T4 x2

Bundle này huấn luyện ba LoRA adapter độc lập trên cùng base model `Qwen/Qwen3.5-4B`:

- `message-context-adapter`
- `web-context-adapter`
- `explanation-adapter`

Không dùng QLoRA 4-bit. Mỗi lệnh dùng LoRA 16-bit và có thể chạy bằng hai GPU thông qua `torchrun`.

## 1. Tạo Kaggle Dataset

Tải toàn bộ thư mục bundle hoặc file ZIP lên một Kaggle Dataset riêng tư. Không tách riêng các file vì validator cần `dataset_manifest.json`, `schemas/`, ba thư mục dữ liệu và `scripts/`.

## 2. Tạo Notebook

Trong phần Accelerator, chọn `GPU T4 x2`. Bật Internet trong giai đoạn cài thư viện và tải base model.

Bundle có sẵn notebook `prewise_kaggle_train.ipynb`. Có thể upload notebook đó hoặc chạy các cell dưới đây.

## 3. Cài thư viện

```python
!pip install --upgrade --force-reinstall --no-cache-dir unsloth unsloth_zoo
!pip install --upgrade --no-cache-dir "transformers>=5.2.0" "trl>=0.26.2" datasets accelerate peft bitsandbytes jsonschema
```

Sau cell này, restart Kaggle session một lần rồi tiếp tục.

## 4. Tự tìm bundle và validate

```python
from pathlib import Path

matches = list(Path('/kaggle/input').rglob('dataset_manifest.json'))
assert len(matches) == 1, f'Expected exactly one bundle, found: {matches}'
BUNDLE_ROOT = matches[0].parent
TRAIN_SCRIPT = BUNDLE_ROOT / 'scripts' / 'train_prewise_adapters_kaggle.py'
VALIDATE_SCRIPT = BUNDLE_ROOT / 'scripts' / 'validate_prewise_training_bundle.py'
print(BUNDLE_ROOT)
```

```python
!python "$VALIDATE_SCRIPT" --bundle-root "$BUNDLE_ROOT"
```

Không train nếu validator báo lỗi schema, checksum hoặc leakage.

## 5. Huấn luyện Message Context Adapter

```python
!torchrun --standalone --nproc_per_node=2 "$TRAIN_SCRIPT" \
  --bundle-root "$BUNDLE_ROOT" \
  --task message_context \
  --output-root /kaggle/working/prewise-adapters \
  --max-seq-length 2048 \
  --epochs 1 \
  --smoke-test
```

## 6. Huấn luyện Web Context Adapter

```python
!torchrun --standalone --nproc_per_node=2 "$TRAIN_SCRIPT" \
  --bundle-root "$BUNDLE_ROOT" \
  --task web_context \
  --output-root /kaggle/working/prewise-adapters \
  --max-seq-length 2048 \
  --epochs 1 \
  --smoke-test
```

## 7. Huấn luyện Explanation Adapter

```python
!torchrun --standalone --nproc_per_node=2 "$TRAIN_SCRIPT" \
  --bundle-root "$BUNDLE_ROOT" \
  --task explanation \
  --output-root /kaggle/working/prewise-adapters \
  --max-seq-length 2048 \
  --epochs 1 \
  --smoke-test
```

Mỗi adapter được lưu tại:

```text
/kaggle/working/prewise-adapters/
├── message-context-adapter/current/
├── web-context-adapter/current/
├── explanation-adapter/current/
└── manifest.json
```

Mỗi thư mục `current/` phải có ít nhất:

```text
adapter_config.json
adapter_model.safetensors
```

## 8. Đóng gói kết quả

```python
import shutil
shutil.make_archive(
    '/kaggle/working/prewise-adapters',
    'zip',
    '/kaggle/working/prewise-adapters',
)
```

Tải file `/kaggle/working/prewise-adapters.zip` về máy. Giải nén nội dung vào `server/adapters/` của dự án và dùng `manifest.json` đi kèm.

## 9. Khi thiếu VRAM

Giữ LoRA 16-bit và giảm theo thứ tự:

1. `--max-seq-length 1536`
2. `--gradient-accumulation-steps 4`
3. `--max-train-samples` xuống khoảng 30.000 cho message, 18.000 cho web hoặc 20.000 cho explanation

Không chuyển sang QLoRA 4-bit cho Qwen3.5.

## 10. Kiểm tra đầu ra

Mỗi thư mục adapter có:

- `training_report.json`
- `smoke_inference.json` nếu dùng `--smoke-test`
- `current/adapter_config.json`
- `current/adapter_model.safetensors`

`adapter_config.json` phải giữ `base_model_name_or_path` bằng đúng `Qwen/Qwen3.5-4B`, nếu không backend sẽ đánh dấu adapter là `incompatible`.
