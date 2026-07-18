#!/usr/bin/env python3
"""Generate the ready-to-run Prewise Kaggle training notebook."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def markdown(source: str) -> dict:
    return {
        "cell_type": "markdown",
        "metadata": {},
        "source": source.splitlines(keepends=True),
    }


def code(source: str) -> dict:
    return {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": source.splitlines(keepends=True),
    }


def build_notebook() -> dict:
    cells = [
        markdown(
            "# Prewise Qwen3.5-4B Multi-Adapter Training\n\n"
            "Chọn **GPU T4 x2**. Bundle huấn luyện phải được attach dưới dạng Kaggle Dataset. "
            "Ba adapter được train riêng để giữ contract và rollback độc lập."
        ),
        markdown("## 1. Cài thư viện\n\nChạy cell sau, sau đó **restart session một lần**."),
        code(
            "!pip install --upgrade --force-reinstall --no-cache-dir unsloth unsloth_zoo\n"
            "!pip install --upgrade --no-cache-dir \"transformers>=5.2.0\" \"trl>=0.26.2\" datasets accelerate peft bitsandbytes jsonschema\n"
        ),
        markdown("## 2. Tìm và validate bundle"),
        code(
            "from pathlib import Path\n\n"
            "matches = list(Path('/kaggle/input').rglob('dataset_manifest.json'))\n"
            "assert len(matches) == 1, f'Expected exactly one bundle, found: {matches}'\n"
            "BUNDLE_ROOT = matches[0].parent\n"
            "TRAIN_SCRIPT = BUNDLE_ROOT / 'scripts' / 'train_prewise_adapters_kaggle.py'\n"
            "VALIDATE_SCRIPT = BUNDLE_ROOT / 'scripts' / 'validate_prewise_training_bundle.py'\n"
            "OUTPUT_ROOT = Path('/kaggle/working/prewise-adapters')\n"
            "print('BUNDLE_ROOT =', BUNDLE_ROOT)\n"
        ),
        code("!python \"$VALIDATE_SCRIPT\" --bundle-root \"$BUNDLE_ROOT\"\n"),
        markdown("## 3. Message Context Adapter"),
        code(
            "!torchrun --standalone --nproc_per_node=2 \"$TRAIN_SCRIPT\" \\\n"
            "  --bundle-root \"$BUNDLE_ROOT\" \\\n"
            "  --task message_context \\\n"
            "  --output-root \"$OUTPUT_ROOT\" \\\n"
            "  --max-seq-length 2048 \\\n"
            "  --epochs 1 \\\n"
            "  --smoke-test\n"
        ),
        markdown("## 4. Web Context Adapter"),
        code(
            "!torchrun --standalone --nproc_per_node=2 \"$TRAIN_SCRIPT\" \\\n"
            "  --bundle-root \"$BUNDLE_ROOT\" \\\n"
            "  --task web_context \\\n"
            "  --output-root \"$OUTPUT_ROOT\" \\\n"
            "  --max-seq-length 2048 \\\n"
            "  --epochs 1 \\\n"
            "  --smoke-test\n"
        ),
        markdown("## 5. Explanation Adapter"),
        code(
            "!torchrun --standalone --nproc_per_node=2 \"$TRAIN_SCRIPT\" \\\n"
            "  --bundle-root \"$BUNDLE_ROOT\" \\\n"
            "  --task explanation \\\n"
            "  --output-root \"$OUTPUT_ROOT\" \\\n"
            "  --max-seq-length 2048 \\\n"
            "  --epochs 1 \\\n"
            "  --smoke-test\n"
        ),
        markdown("## 6. Kiểm tra package và đóng ZIP"),
        code(
            "import json\n"
            "from pathlib import Path\n\n"
            "required = [\n"
            "    OUTPUT_ROOT / 'message-context-adapter/current/adapter_config.json',\n"
            "    OUTPUT_ROOT / 'message-context-adapter/current/adapter_model.safetensors',\n"
            "    OUTPUT_ROOT / 'web-context-adapter/current/adapter_config.json',\n"
            "    OUTPUT_ROOT / 'web-context-adapter/current/adapter_model.safetensors',\n"
            "    OUTPUT_ROOT / 'explanation-adapter/current/adapter_config.json',\n"
            "    OUTPUT_ROOT / 'explanation-adapter/current/adapter_model.safetensors',\n"
            "    OUTPUT_ROOT / 'manifest.json',\n"
            "]\n"
            "missing = [str(path) for path in required if not path.is_file()]\n"
            "assert not missing, missing\n"
            "for path in required:\n"
            "    print(path.relative_to(OUTPUT_ROOT), path.stat().st_size)\n"
        ),
        code(
            "import shutil\n"
            "archive = shutil.make_archive('/kaggle/working/prewise-adapters', 'zip', OUTPUT_ROOT)\n"
            "print(archive)\n"
        ),
    ]
    return {
        "cells": cells,
        "metadata": {
            "accelerator": "GPU",
            "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
            "language_info": {"name": "python", "version": "3"},
        },
        "nbformat": 4,
        "nbformat_minor": 5,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(build_notebook(), ensure_ascii=False, indent=2), encoding="utf-8")
    print(args.output)


if __name__ == "__main__":
    main()
