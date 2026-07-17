"""Train leakage-resistant LightGBM, Random Forest, and XGBoost URL models.

The input CSV requires ``url,label``. Optional enrichment columns may use any name
from ``ai.adapters.url_adapter.FEATURE_NAMES``. Artifacts are exported to ONNX with
their exact ordered feature schema in sidecar metadata.
"""
from __future__ import annotations

import argparse
import collections
import csv
import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path


def _load_dataset(path: Path):
    import numpy as np

    from ai.adapters.url_adapter import (
        FEATURE_NAMES,
        extract_enriched_url_features,
        parse_url_parts,
    )

    rows: dict[str, tuple[list[float], int, str]] = {}
    skipped = 0
    with path.open(encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            try:
                url = str(row["url"]).strip()
                label = int(row["label"])
                if label not in {0, 1}:
                    raise ValueError("label must be 0 or 1")
                context = {
                    name: row[name]
                    for name in FEATURE_NAMES
                    if name in row and row[name] not in {None, ""}
                }
                features = extract_enriched_url_features(url, context=context)
                parts = parse_url_parts(url)
                rows[url] = (features, label, parts.registrable_domain)
            except (KeyError, TypeError, ValueError):
                skipped += 1
    if len(rows) < 20:
        raise ValueError("At least 20 valid, unique URLs are required")
    values = list(rows.values())
    return (
        np.asarray([item[0] for item in values], dtype=np.float32),
        np.asarray([item[1] for item in values], dtype=np.int64),
        np.asarray([item[2] for item in values]),
        skipped,
    )


def _split(X, y, groups, test_size: float):
    from sklearn.model_selection import GroupShuffleSplit

    splitter = GroupShuffleSplit(n_splits=1, test_size=test_size, random_state=42)
    train_index, test_index = next(splitter.split(X, y, groups=groups))
    if len(set(y[train_index])) < 2 or len(set(y[test_index])) < 2:
        raise ValueError("Domain-group split must contain both classes in train and test")
    return X[train_index], X[test_index], y[train_index], y[test_index]


def _train_lightgbm(X_train, y_train):
    import lightgbm as lgb

    model = lgb.LGBMClassifier(
        n_estimators=400,
        num_leaves=48,
        learning_rate=0.04,
        subsample=0.8,
        colsample_bytree=0.8,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)
    return model


def _train_random_forest(X_train, y_train):
    from sklearn.ensemble import RandomForestClassifier

    model = RandomForestClassifier(
        n_estimators=300,
        max_features="sqrt",
        min_samples_leaf=2,
        class_weight="balanced_subsample",
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)
    return model


def _train_xgboost(X_train, y_train):
    from xgboost import XGBClassifier

    negatives = max(1, int((y_train == 0).sum()))
    positives = max(1, int((y_train == 1).sum()))
    model = XGBClassifier(
        n_estimators=500,
        max_depth=8,
        learning_rate=0.04,
        subsample=0.8,
        colsample_bytree=0.8,
        objective="binary:logistic",
        eval_metric="logloss",
        scale_pos_weight=negatives / positives,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)
    return model


def _export_onnx(name: str, model, feature_count: int) -> bytes:
    if name == "lightgbm":
        from onnxmltools import convert_lightgbm
        from onnxmltools.convert.common.data_types import FloatTensorType

        converted = convert_lightgbm(
            model, initial_types=[("input", FloatTensorType([None, feature_count]))]
        )
    elif name == "xgboost":
        from onnxmltools import convert_xgboost
        from onnxmltools.convert.common.data_types import FloatTensorType

        converted = convert_xgboost(
            model, initial_types=[("input", FloatTensorType([None, feature_count]))]
        )
    else:
        from skl2onnx import convert_sklearn
        from skl2onnx.common.data_types import FloatTensorType

        converted = convert_sklearn(
            model, initial_types=[("input", FloatTensorType([None, feature_count]))]
        )
    return converted.SerializeToString()


def main() -> None:  # pragma: no cover - offline training job
    from sklearn.metrics import accuracy_score, classification_report, f1_score

    from ai.adapters.url_adapter import FEATURE_NAMES

    parser = argparse.ArgumentParser()
    parser.add_argument("--data", required=True, type=Path)
    parser.add_argument("--out", default=Path("server/models"), type=Path)
    parser.add_argument("--test-size", type=float, default=0.2)
    parser.add_argument(
        "--algorithms",
        nargs="+",
        choices=("lightgbm", "random_forest", "xgboost"),
        default=("lightgbm", "random_forest", "xgboost"),
    )
    args = parser.parse_args()

    X, y, groups, skipped = _load_dataset(args.data)
    X_train, X_test, y_train, y_test = _split(X, y, groups, args.test_size)
    args.out.mkdir(parents=True, exist_ok=True)
    trainers = {
        "lightgbm": _train_lightgbm,
        "random_forest": _train_random_forest,
        "xgboost": _train_xgboost,
    }
    artifact_names = {
        "lightgbm": "url_lgbm.onnx",
        "random_forest": "url_rf.onnx",
        "xgboost": "url_xgb.onnx",
    }
    summaries: list[dict] = []
    for name in args.algorithms:
        try:
            model = trainers[name](X_train, y_train)
            prediction = model.predict(X_test)
            probability = model.predict_proba(X_test)[:, 1]
            f1 = float(f1_score(y_test, prediction))
            accuracy = float(accuracy_score(y_test, prediction))
            payload = _export_onnx(name, model, len(FEATURE_NAMES))
            artifact = args.out / artifact_names[name]
            artifact.write_bytes(payload)
            report = classification_report(y_test, prediction, output_dict=True)
            metadata = {
                "artifact": artifact.name,
                "architecture": name,
                "ensemble_role": "url_phishing_classifier",
                "runtime_input": f"tensor(float) shape [N, {len(FEATURE_NAMES)}]",
                "feature_names": list(FEATURE_NAMES),
                "trained_at_utc": datetime.now(UTC).replace(microsecond=0).isoformat(),
                "dataset": {
                    "path": str(args.data),
                    "rows": int(len(y)),
                    "skipped_rows": skipped,
                    "class_counts": dict(collections.Counter(map(int, y))),
                    "train_rows": int(len(y_train)),
                    "test_rows": int(len(y_test)),
                    "split": "registrable-domain-grouped",
                },
                "metrics": {
                    "test": {
                        "f1": f1,
                        "accuracy": accuracy,
                        "classification_report": report,
                        "mean_probability": float(probability.mean()),
                    }
                },
                "sha256": hashlib.sha256(payload).hexdigest(),
            }
            artifact.with_suffix(".meta.json").write_text(
                json.dumps(metadata, indent=2, ensure_ascii=True) + "\n",
                encoding="utf-8",
            )
            summaries.append({"algorithm": name, "status": "completed", "f1": f1, "accuracy": accuracy})
        except (ImportError, ModuleNotFoundError) as exc:
            summaries.append({"algorithm": name, "status": "dependency_missing", "error": str(exc)})

    completed = [item for item in summaries if item["status"] == "completed"]
    if not completed:
        raise RuntimeError("No URL model was trained; install the ml/train dependencies")
    best = max(completed, key=lambda item: float(item["f1"]))
    print(f"F1: {best['f1']:.6f}")
    print(f"Accuracy: {best['accuracy']:.6f}")
    print(json.dumps({"best": best, "models": summaries}, ensure_ascii=True))


if __name__ == "__main__":
    main()
