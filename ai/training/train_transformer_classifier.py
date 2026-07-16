"""Fine-tune and export the real Transformer classifiers used by the gateway.

Examples:
    python -m ai.training.train_transformer_classifier --task text \
        --data data/email_train.csv --data data/sms_train.csv
    python -m ai.training.train_transformer_classifier --task prompt \
        --data data/prompt_injection_train.csv
    python -m ai.training.train_transformer_classifier --task prompt --export-pretrained

Input CSV files must contain ``text,label`` with label 1 for malicious content.
The large ONNX artifacts intentionally use different names from the lightweight
classifiers so runtime provenance remains honest.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class TaskSpec:
    default_model: str
    artifact: str
    tokenizer_dir: str
    purpose: str


TASKS = {
    "text": TaskSpec(
        default_model="microsoft/mdeberta-v3-base",
        artifact="mdeberta_text_transformer.onnx",
        tokenizer_dir="mdeberta_text_tokenizer",
        purpose="multilingual phishing and social-engineering classification",
    ),
    "prompt": TaskSpec(
        default_model="protectai/deberta-v3-base-prompt-injection-v2",
        artifact="protectai_prompt_transformer.onnx",
        tokenizer_dir="protectai_prompt_tokenizer",
        purpose="prompt-injection classification",
    ),
}


def build_parser(default_task: str | None = None) -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--task", choices=sorted(TASKS), default=default_task, required=not default_task)
    parser.add_argument("--data", action="append", default=[], help="Training CSV; repeat to merge")
    parser.add_argument("--validation-data", action="append", default=[])
    parser.add_argument("--model", help="Hugging Face model id or local checkpoint")
    parser.add_argument("--out", default="server/models")
    parser.add_argument("--text-column", default="text")
    parser.add_argument("--label-column", default="label")
    parser.add_argument("--epochs", type=float, default=3.0)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--eval-batch-size", type=int, default=16)
    parser.add_argument("--gradient-accumulation", type=int, default=2)
    parser.add_argument("--learning-rate", type=float, default=2e-5)
    parser.add_argument("--weight-decay", type=float, default=0.01)
    parser.add_argument("--warmup-ratio", type=float, default=0.1)
    parser.add_argument("--max-len", type=int, default=256)
    parser.add_argument("--validation-size", type=float, default=0.15)
    parser.add_argument("--min-rows-per-class", type=int, default=20)
    parser.add_argument("--max-train-rows", type=int, default=0)
    parser.add_argument("--max-validation-rows", type=int, default=0)
    parser.add_argument("--max-steps", type=int, default=-1)
    parser.add_argument("--freeze-base", action="store_true")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--workers", type=int, default=0)
    parser.add_argument("--quantize", action=argparse.BooleanOptionalAction, default=False)
    parser.add_argument(
        "--export-pretrained",
        action="store_true",
        help="Skip fine-tuning and export an already fine-tuned classifier",
    )
    return parser


def _normalize_text(value: Any) -> str:
    return " ".join(str(value or "").strip().lower().split())


def _validate_and_deduplicate(dataset, text_column: str, label_column: str, min_rows: int):
    missing = {text_column, label_column} - set(dataset.column_names)
    if missing:
        raise ValueError(f"dataset is missing columns: {sorted(missing)}")

    keep: list[int] = []
    seen: set[str] = set()
    counts = {0: 0, 1: 0}
    for index, row in enumerate(dataset):
        text = _normalize_text(row[text_column])
        try:
            label = int(row[label_column])
        except (TypeError, ValueError) as exc:
            raise ValueError(f"row {index} has a non-integer label") from exc
        if not text or label not in counts or text in seen:
            continue
        seen.add(text)
        counts[label] += 1
        keep.append(index)

    if min(counts.values()) < min_rows:
        raise ValueError(
            f"need at least {min_rows} unique rows per class after cleanup; got {counts}"
        )
    cleaned = dataset.select(keep)
    if label_column != "label":
        cleaned = cleaned.rename_column(label_column, "label")
    return cleaned, counts


def _load_splits(args, load_dataset, train_test_split):
    if not args.data:
        raise ValueError("at least one --data CSV is required for fine-tuning")

    train_raw = load_dataset("csv", data_files=args.data, split="train")
    train_raw, counts = _validate_and_deduplicate(
        train_raw, args.text_column, args.label_column, args.min_rows_per_class
    )

    if args.validation_data:
        validation = load_dataset("csv", data_files=args.validation_data, split="train")
        validation, validation_counts = _validate_and_deduplicate(
            validation, args.text_column, args.label_column, args.min_rows_per_class
        )
        train_texts = {_normalize_text(value) for value in train_raw[args.text_column]}
        keep = [
            index
            for index, value in enumerate(validation[args.text_column])
            if _normalize_text(value) not in train_texts
        ]
        validation = validation.select(keep)
        if not validation:
            raise ValueError("validation set is empty after removing train/validation leakage")
    else:
        labels = [int(value) for value in train_raw["label"]]
        indices = list(range(len(train_raw)))
        train_indices, validation_indices = train_test_split(
            indices,
            test_size=args.validation_size,
            random_state=args.seed,
            stratify=labels,
        )
        validation = train_raw.select(validation_indices)
        train_raw = train_raw.select(train_indices)
        validation_counts = {
            0: sum(int(value) == 0 for value in validation["label"]),
            1: sum(int(value) == 1 for value in validation["label"]),
        }
    train_raw = _stratified_cap(train_raw, "label", args.max_train_rows, args.seed, train_test_split)
    validation = _stratified_cap(
        validation, "label", args.max_validation_rows, args.seed, train_test_split
    )
    validation_counts = {
        0: sum(int(value) == 0 for value in validation["label"]),
        1: sum(int(value) == 1 for value in validation["label"]),
    }
    return train_raw, validation, counts, validation_counts


def _stratified_cap(dataset, label_column: str, max_rows: int, seed: int, train_test_split):
    if not max_rows or len(dataset) <= max_rows:
        return dataset
    labels = [int(value) for value in dataset[label_column]]
    indices = list(range(len(dataset)))
    selected, _ = train_test_split(
        indices,
        train_size=max_rows,
        random_state=seed,
        stratify=labels,
    )
    return dataset.select(selected)


def _compute_metrics(eval_prediction) -> dict[str, float]:
    import numpy as np
    from sklearn.metrics import (
        accuracy_score,
        f1_score,
        precision_score,
        recall_score,
        roc_auc_score,
    )

    logits, labels = eval_prediction
    logits = np.asarray(logits)
    predictions = logits.argmax(axis=-1)
    shifted = logits - logits.max(axis=-1, keepdims=True)
    probabilities = np.exp(shifted) / np.exp(shifted).sum(axis=-1, keepdims=True)
    metrics = {
        "accuracy": float(accuracy_score(labels, predictions)),
        "precision": float(precision_score(labels, predictions, zero_division=0)),
        "recall": float(recall_score(labels, predictions, zero_division=0)),
        "f1": float(f1_score(labels, predictions, zero_division=0)),
    }
    if len(set(labels.tolist())) == 2:
        metrics["roc_auc"] = float(roc_auc_score(labels, probabilities[:, 1]))
    return metrics


def _export_onnx(model, tokenizer, output_path: Path, max_len: int, quantize: bool) -> None:
    import torch

    model.eval()
    dummy = tokenizer(
        "security classifier export sample",
        return_tensors="pt",
        truncation=True,
        max_length=max_len,
    )
    input_names = [
        name
        for name in ("input_ids", "attention_mask", "token_type_ids")
        if name in dummy
    ]

    class LogitsOnly(torch.nn.Module):
        def __init__(self, wrapped, names):
            super().__init__()
            self.wrapped = wrapped
            self.names = names

        def forward(self, *values):
            inputs = dict(zip(self.names, values, strict=True))
            return self.wrapped(**inputs).logits

    wrapper = LogitsOnly(model, input_names)
    wrapper.eval()
    values = tuple(dummy[name] for name in input_names)
    dynamic_axes = {name: {0: "batch", 1: "sequence"} for name in input_names}
    dynamic_axes["logits"] = {0: "batch"}
    fp32_path = output_path.with_suffix(".fp32.onnx") if quantize else output_path
    torch.onnx.export(
        wrapper,
        values,
        str(fp32_path),
        input_names=input_names,
        output_names=["logits"],
        dynamic_axes=dynamic_axes,
        opset_version=17,
        do_constant_folding=True,
        dynamo=False,
    )

    if quantize:
        from onnxruntime.quantization import QuantType, quantize_dynamic

        quantize_dynamic(str(fp32_path), str(output_path), weight_type=QuantType.QInt8)
        fp32_path.unlink()


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def main(argv: list[str] | None = None, default_task: str | None = None) -> None:
    args = build_parser(default_task).parse_args(argv)
    spec = TASKS[args.task]
    model_name = args.model or spec.default_model
    output_dir = Path(args.out)
    output_dir.mkdir(parents=True, exist_ok=True)

    import numpy as np
    import torch
    from datasets import load_dataset
    from sklearn.model_selection import train_test_split
    from transformers import (
        AutoModelForSequenceClassification,
        AutoTokenizer,
        DataCollatorWithPadding,
        Trainer,
        TrainingArguments,
        set_seed,
    )

    set_seed(args.seed)
    tokenizer = AutoTokenizer.from_pretrained(model_name, use_fast=True)
    model = AutoModelForSequenceClassification.from_pretrained(
        model_name,
        num_labels=2,
        id2label={0: "BENIGN", 1: "MALICIOUS"},
        label2id={"BENIGN": 0, "MALICIOUS": 1},
        ignore_mismatched_sizes=True,
    )
    use_cuda = torch.cuda.is_available()
    if not use_cuda:
        model.float()
    if args.freeze_base:
        base_model = getattr(model, getattr(model, "base_model_prefix", ""), None)
        if base_model is None:
            base_model = getattr(model, "base_model", None)
        if base_model is None:
            raise ValueError("could not locate base model to freeze")
        for parameter in base_model.parameters():
            parameter.requires_grad = False
    metrics: dict[str, float] = {}
    dataset_summary: dict[str, Any] = {"mode": "export_pretrained"}

    if not args.export_pretrained:
        train_data, validation_data, source_counts, validation_counts = _load_splits(
            args, load_dataset, train_test_split
        )

        def tokenize(batch):
            return tokenizer(batch[args.text_column], truncation=True, max_length=args.max_len)

        removable = [name for name in train_data.column_names if name != "label"]
        train_data = train_data.map(tokenize, batched=True, remove_columns=removable)
        removable = [name for name in validation_data.column_names if name != "label"]
        validation_data = validation_data.map(tokenize, batched=True, remove_columns=removable)

        train_labels = [int(value) for value in train_data["label"]]
        class_counts = np.bincount(train_labels, minlength=2)
        class_weights = torch.tensor(
            len(train_labels) / (2.0 * np.maximum(class_counts, 1)), dtype=torch.float32
        )

        class WeightedTrainer(Trainer):
            def compute_loss(
                self, model, inputs, return_outputs=False, num_items_in_batch=None
            ):
                labels = inputs.pop("labels")
                outputs = model(**inputs)
                loss = torch.nn.functional.cross_entropy(
                    outputs.logits,
                    labels,
                    weight=class_weights.to(
                        device=outputs.logits.device,
                        dtype=outputs.logits.dtype,
                    ),
                )
                return (loss, outputs) if return_outputs else loss

        bounded_steps = args.max_steps is not None and args.max_steps > 0
        eval_save_strategy = "steps" if bounded_steps else "epoch"
        eval_save_steps = args.max_steps if bounded_steps else None
        logging_steps = max(5, args.max_steps // 10) if bounded_steps else 25
        training_kwargs = {
            "output_dir": str(output_dir / "_checkpoints" / args.task),
            "num_train_epochs": args.epochs,
            "per_device_train_batch_size": args.batch_size,
            "per_device_eval_batch_size": args.eval_batch_size,
            "gradient_accumulation_steps": args.gradient_accumulation,
            "learning_rate": args.learning_rate,
            "weight_decay": args.weight_decay,
            "warmup_ratio": args.warmup_ratio,
            "max_steps": args.max_steps,
            "eval_strategy": eval_save_strategy,
            "save_strategy": eval_save_strategy,
            "logging_strategy": "steps",
            "logging_steps": logging_steps,
            "load_best_model_at_end": True,
            "metric_for_best_model": "f1",
            "greater_is_better": True,
            "save_total_limit": 2,
            "fp16": use_cuda,
            "dataloader_num_workers": args.workers,
            "report_to": "none",
            "seed": args.seed,
            "data_seed": args.seed,
        }
        if eval_save_steps is not None:
            training_kwargs["eval_steps"] = eval_save_steps
            training_kwargs["save_steps"] = eval_save_steps
        trainer = WeightedTrainer(
            model=model,
            args=TrainingArguments(**training_kwargs),
            train_dataset=train_data,
            eval_dataset=validation_data,
            data_collator=DataCollatorWithPadding(tokenizer=tokenizer),
            processing_class=tokenizer,
            compute_metrics=_compute_metrics,
        )
        trainer.train()
        metrics = {
            key.removeprefix("eval_"): float(value)
            for key, value in trainer.evaluate().items()
            if isinstance(value, (int, float))
        }
        model = trainer.model
        dataset_summary = {
            "mode": "fine_tuned",
            "training_files": [os.path.basename(path) for path in args.data],
            "source_unique_class_counts": source_counts,
            "train_rows": len(train_data),
            "validation_rows": len(validation_data),
            "validation_class_counts": validation_counts,
        }

    artifact_path = output_dir / spec.artifact
    tokenizer_path = output_dir / spec.tokenizer_dir
    if tokenizer_path.exists():
        shutil.rmtree(tokenizer_path)
    tokenizer.save_pretrained(tokenizer_path)
    _export_onnx(model, tokenizer, artifact_path, args.max_len, args.quantize)

    metadata = {
        "artifact": artifact_path.name,
        "architecture": model.config.model_type,
        "base_model": model_name,
        "purpose": spec.purpose,
        "label_mapping": {"0": "benign", "1": "malicious"},
        "max_length": args.max_len,
        "quantized_int8": args.quantize,
        "tokenizer_dir": tokenizer_path.name,
        "freeze_base": args.freeze_base,
        "trainable_parameters": int(sum(p.numel() for p in model.parameters() if p.requires_grad)),
        "sha256": _sha256(artifact_path),
        "dataset": dataset_summary,
        "metrics": metrics,
    }
    metadata_path = artifact_path.with_suffix(".meta.json")
    metadata_path.write_text(json.dumps(metadata, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")
    print(json.dumps(metadata, indent=2))


if __name__ == "__main__":
    main()
