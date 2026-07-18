#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path


def gpu_count() -> int:
    if not shutil.which("nvidia-smi"):
        return 0
    try:
        return len([line for line in subprocess.check_output(["nvidia-smi", "-L"], text=True).splitlines() if line.strip()])
    except Exception:
        return 1


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--bundle-root", type=Path, required=True)
    parser.add_argument("--data-root", type=Path, required=True)
    parser.add_argument("--output-root", type=Path, default=Path("/kaggle/working/prewise-v4"))
    parser.add_argument("--model-name", default="Qwen/Qwen3.5-4B")
    parser.add_argument("--message-train-samples", type=int, default=32799)
    parser.add_argument("--explanation-train-samples", type=int, default=24000)
    parser.add_argument("--validation-samples", type=int, default=2400)
    args = parser.parse_args()

    trainer = str(args.bundle_root / "train_qwen35_4b_context_kaggle.py")
    message_output = args.output_root / "message-context-output"
    explanation_output = args.output_root / "explanation-output"
    common = [
        "--model-name", args.model_name,
        "--max-seq-length", "2048",
        "--epochs", "1",
        "--batch-size", "1",
        "--gradient-accumulation-steps", "8",
        "--expect-json",
        "--dataset-num-proc", "2",
    ]
    message_command = [
        sys.executable, trainer,
        "--train-file", str(args.data_root / "message_context/train.jsonl"),
        "--validation-file", str(args.data_root / "message_context/validation.jsonl"),
        "--output-dir", str(message_output),
        "--max-train-samples", str(args.message_train_samples),
        "--max-validation-samples", str(args.validation_samples),
        *common,
    ]
    explanation_command = [
        sys.executable, trainer,
        "--train-file", str(args.data_root / "explanation/train.jsonl"),
        "--validation-file", str(args.data_root / "explanation/validation.jsonl"),
        "--output-dir", str(explanation_output),
        "--max-train-samples", str(args.explanation_train_samples),
        "--max-validation-samples", str(args.validation_samples),
        *common,
    ]

    count = gpu_count()
    print("Detected GPUs:", count, flush=True)
    if count >= 2:
        environment0 = os.environ.copy()
        environment0["CUDA_VISIBLE_DEVICES"] = "0"
        environment1 = os.environ.copy()
        environment1["CUDA_VISIBLE_DEVICES"] = "1"
        args.output_root.mkdir(parents=True, exist_ok=True)
        with (args.output_root / "message-train.log").open("w", encoding="utf-8") as log0, (args.output_root / "explanation-train.log").open("w", encoding="utf-8") as log1:
            process0 = subprocess.Popen(message_command, env=environment0, stdout=log0, stderr=subprocess.STDOUT, text=True)
            process1 = subprocess.Popen(explanation_command, env=environment1, stdout=log1, stderr=subprocess.STDOUT, text=True)
            return0, return1 = process0.wait(), process1.wait()
        if return0 or return1:
            raise RuntimeError(f"training failed: message={return0}, explanation={return1}; inspect logs in {args.output_root}")
    elif count == 1:
        subprocess.run(message_command, check=True)
        subprocess.run(explanation_command, check=True)
    else:
        raise RuntimeError("No CUDA GPU found")

    package_root = args.output_root / "server-adapters"
    subprocess.run([
        sys.executable,
        str(args.bundle_root / "package_adapters.py"),
        "--message-output", str(message_output),
        "--explanation-output", str(explanation_output),
        "--package-root", str(package_root),
        "--base-model", args.model_name,
    ], check=True)
    archive = shutil.make_archive("/kaggle/working/prewise-adapters-v4", "zip", root_dir=package_root)
    print("READY:", archive)


if __name__ == "__main__":
    main()
