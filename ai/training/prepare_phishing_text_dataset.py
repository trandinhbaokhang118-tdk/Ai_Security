"""Prepare real phishing text splits from the Hugging Face dataset.

The output CSV files use the ``text,label`` schema consumed by
``train_text_transformer.py``. Label 1 is treated as phishing/malicious.
"""

from __future__ import annotations

import argparse
import collections
import csv
import json
from pathlib import Path
from typing import Any


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", default="ealvaradob/phishing-dataset")
    parser.add_argument("--filename", default="texts.json")
    parser.add_argument("--out-dir", default="data")
    parser.add_argument("--train-name", default="phishing_text_train.csv")
    parser.add_argument("--validation-name", default="phishing_text_validation.csv")
    parser.add_argument("--test-name", default="phishing_text_test.csv")
    parser.add_argument("--validation-size", type=float, default=0.15)
    parser.add_argument("--test-size", type=float, default=0.15)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--min-text-len", type=int, default=20)
    parser.add_argument("--max-rows", type=int, default=0, help="Optional cap after cleanup")
    return parser


def _normalize_text(value: Any) -> str:
    return " ".join(str(value or "").strip().split())


def _clean_rows(rows: list[dict[str, Any]], min_text_len: int) -> list[dict[str, Any]]:
    cleaned: list[dict[str, Any]] = []
    seen: set[str] = set()
    for row in rows:
        text = _normalize_text(row.get("text"))
        try:
            label = int(row.get("label"))
        except (TypeError, ValueError):
            continue
        key = text.lower()
        if len(text) < min_text_len or label not in {0, 1} or key in seen:
            continue
        seen.add(key)
        cleaned.append({"text": text, "label": label})
    return cleaned


def _write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=["text", "label"])
        writer.writeheader()
        writer.writerows(rows)


def _counts(rows: list[dict[str, Any]]) -> dict[str, int]:
    counts = collections.Counter(int(row["label"]) for row in rows)
    return {str(label): int(counts[label]) for label in (0, 1)}


def main(argv: list[str] | None = None) -> None:
    args = build_parser().parse_args(argv)
    if args.validation_size <= 0 or args.test_size <= 0:
        raise ValueError("validation-size and test-size must be positive")
    if args.validation_size + args.test_size >= 1:
        raise ValueError("validation-size + test-size must be < 1")

    from huggingface_hub import hf_hub_download
    from sklearn.model_selection import train_test_split

    source_path = Path(
        hf_hub_download(args.repo, args.filename, repo_type="dataset")
    )
    raw_rows = json.loads(source_path.read_text(encoding="utf-8"))
    if not isinstance(raw_rows, list):
        raise ValueError(f"expected a JSON list in {source_path}")

    rows = _clean_rows(raw_rows, args.min_text_len)
    rows.sort(key=lambda row: (int(row["label"]), row["text"].lower()))
    if args.max_rows:
        rows = rows[: args.max_rows]
    labels = [int(row["label"]) for row in rows]

    train_rows, holdout_rows = train_test_split(
        rows,
        test_size=args.validation_size + args.test_size,
        random_state=args.seed,
        stratify=labels,
    )
    holdout_labels = [int(row["label"]) for row in holdout_rows]
    relative_test_size = args.test_size / (args.validation_size + args.test_size)
    validation_rows, test_rows = train_test_split(
        holdout_rows,
        test_size=relative_test_size,
        random_state=args.seed,
        stratify=holdout_labels,
    )

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    train_path = out_dir / args.train_name
    validation_path = out_dir / args.validation_name
    test_path = out_dir / args.test_name
    _write_csv(train_path, train_rows)
    _write_csv(validation_path, validation_rows)
    _write_csv(test_path, test_rows)

    metadata = {
        "source_repo": args.repo,
        "source_file": args.filename,
        "source_path": str(source_path),
        "source_rows": len(raw_rows),
        "cleaned_rows": len(rows),
        "class_counts": _counts(rows),
        "splits": {
            train_path.name: {"rows": len(train_rows), "class_counts": _counts(train_rows)},
            validation_path.name: {
                "rows": len(validation_rows),
                "class_counts": _counts(validation_rows),
            },
            test_path.name: {"rows": len(test_rows), "class_counts": _counts(test_rows)},
        },
        "seed": args.seed,
        "label_mapping": {"0": "benign", "1": "phishing"},
    }
    metadata_path = out_dir / "phishing_text_dataset.meta.json"
    metadata_path.write_text(json.dumps(metadata, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")
    print(json.dumps(metadata, indent=2))


if __name__ == "__main__":
    main()
