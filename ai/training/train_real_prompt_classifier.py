"""Train the production lightweight prompt-injection classifier from real CSV splits.

The Transformer prompt model can be exported from ProtectAI or fine-tuned when GPU
budget is available. This CPU-safe path trains the lightweight ONNX artifact that
the gateway can also load directly: ``server/models/protectai_prompt.onnx``.
"""

from __future__ import annotations

import argparse
import collections
import csv
import hashlib
import json
import sys
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path


@dataclass(frozen=True)
class Dataset:
    texts: list[str]
    labels: list[int]


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--train", default="data/prompt_injection_train.csv")
    parser.add_argument("--validation", default="data/prompt_injection_validation.csv")
    parser.add_argument("--test", default="data/prompt_injection_test.csv")
    parser.add_argument("--out", default="server/models")
    parser.add_argument("--max-features", type=int, default=80_000)
    parser.add_argument("--min-df", type=int, default=2)
    parser.add_argument("--c", type=float, default=4.0)
    return parser


def read_dataset(path: Path) -> Dataset:
    csv.field_size_limit(min(sys.maxsize, 2**31 - 1))
    texts: list[str] = []
    labels: list[int] = []
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames is None or {"text", "label"} - set(reader.fieldnames):
            raise ValueError(f"{path} must contain text,label columns")
        for row in reader:
            text = " ".join((row.get("text") or "").split())
            if not text:
                continue
            label = int(row.get("label") or 0)
            if label not in {0, 1}:
                continue
            texts.append(text)
            labels.append(label)
    if len(set(labels)) != 2:
        raise ValueError(f"{path} must contain both classes")
    return Dataset(texts, labels)


def class_counts(labels: list[int]) -> dict[str, int]:
    counts = collections.Counter(labels)
    return {str(label): int(counts[label]) for label in (0, 1)}


def evaluate(pipe, dataset: Dataset) -> dict[str, object]:
    from sklearn.metrics import (
        accuracy_score,
        confusion_matrix,
        f1_score,
        precision_score,
        recall_score,
        roc_auc_score,
    )

    predicted = pipe.predict(dataset.texts)
    probabilities = pipe.predict_proba(dataset.texts)[:, 1]
    tn, fp, fn, tp = confusion_matrix(dataset.labels, predicted, labels=[0, 1]).ravel()
    return {
        "rows": len(dataset.labels),
        "class_counts": class_counts(dataset.labels),
        "accuracy": float(accuracy_score(dataset.labels, predicted)),
        "precision": float(precision_score(dataset.labels, predicted, zero_division=0)),
        "recall": float(recall_score(dataset.labels, predicted, zero_division=0)),
        "f1": float(f1_score(dataset.labels, predicted, zero_division=0)),
        "roc_auc": float(roc_auc_score(dataset.labels, probabilities)),
        "confusion_matrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
    }


def train(train_data: Dataset, *, max_features: int, min_df: int, c_value: float):
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.linear_model import LogisticRegression
    from sklearn.pipeline import Pipeline

    pipe = Pipeline(
        [
            (
                "tfidf",
                TfidfVectorizer(
                    analyzer="word",
                    ngram_range=(1, 2),
                    lowercase=True,
                    strip_accents=None,
                    sublinear_tf=True,
                    min_df=min_df,
                    max_df=0.995,
                    max_features=max_features,
                ),
            ),
            (
                "clf",
                LogisticRegression(
                    C=c_value,
                    class_weight="balanced",
                    max_iter=1000,
                    random_state=42,
                    solver="liblinear",
                ),
            ),
        ]
    )
    pipe.fit(train_data.texts, train_data.labels)
    return pipe


def export_onnx(pipe, output_path: Path) -> str:
    from skl2onnx import convert_sklearn
    from skl2onnx.common.data_types import StringTensorType

    onnx_model = convert_sklearn(
        pipe,
        initial_types=[("prompt", StringTensorType([None, 1]))],
        options={id(pipe.named_steps["clf"]): {"zipmap": False}},
    )
    payload = onnx_model.SerializeToString()
    output_path.write_bytes(payload)
    return hashlib.sha256(payload).hexdigest()


def main(argv: list[str] | None = None) -> None:
    args = build_parser().parse_args(argv)
    train_path = Path(args.train)
    validation_path = Path(args.validation)
    test_path = Path(args.test)
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    train_data = read_dataset(train_path)
    validation_data = read_dataset(validation_path)
    test_data = read_dataset(test_path)
    pipe = train(
        train_data,
        max_features=args.max_features,
        min_df=args.min_df,
        c_value=args.c,
    )

    validation_metrics = evaluate(pipe, validation_data)
    test_metrics = evaluate(pipe, test_data)
    output_path = out_dir / "protectai_prompt.onnx"
    sha256 = export_onnx(pipe, output_path)

    metadata = {
        "artifact": output_path.name,
        "architecture": "TfidfVectorizer(word 1-2, sublinear_tf) + LogisticRegression",
        "runtime_input": "tensor(string) shape [N, 1]",
        "runtime_outputs": ["label", "probabilities"],
        "purpose": "real-data CPU prompt-injection classifier for gateway serving",
        "trained_at_utc": datetime.now(UTC).replace(microsecond=0).isoformat(),
        "label_mapping": {"0": "benign", "1": "malicious"},
        "dataset": {
            "train": {
                "path": str(train_path),
                "rows": len(train_data.labels),
                "class_counts": class_counts(train_data.labels),
            },
            "validation": {
                "path": str(validation_path),
                "rows": len(validation_data.labels),
                "class_counts": class_counts(validation_data.labels),
            },
            "test": {
                "path": str(test_path),
                "rows": len(test_data.labels),
                "class_counts": class_counts(test_data.labels),
            },
        },
        "feature_config": {
            "max_features": args.max_features,
            "min_df": args.min_df,
            "ngram_range": [1, 2],
            "class_weight": "balanced",
            "solver": "liblinear",
            "c": args.c,
        },
        "metrics": {
            "validation": validation_metrics,
            "test": test_metrics,
        },
        "sha256": sha256,
    }
    metadata_path = out_dir / "protectai_prompt.meta.json"
    metadata_path.write_text(
        json.dumps(metadata, indent=2, ensure_ascii=True) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(metadata, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
