"""Train the URL phishing LightGBM classifier and export to ONNX.

Usage:
    python -m ai.training.train_url_lgbm --data data/url_dataset.csv --out server/models

Dataset CSV must have columns: url,label  (label: 1=phishing, 0=benign).
Sources (see dataset-plan.md): PhishTank, OpenPhish, Tranco (benign).

This is the real training path. It requires the [ml] and [train] extras
(lightgbm, scikit-learn, onnxmltools, numpy). It is intentionally NOT imported by the
runtime; the gateway falls back to heuristics when the ONNX model is absent.
"""

from __future__ import annotations

import argparse
import os
from datetime import UTC, datetime


def main() -> None:  # pragma: no cover - offline training job
    import collections
    import csv
    import hashlib
    import json

    import lightgbm as lgb
    import numpy as np
    from onnxmltools import convert_lightgbm
    from onnxmltools.convert.common.data_types import FloatTensorType
    from sklearn.metrics import classification_report, f1_score
    from sklearn.model_selection import train_test_split

    from ai.adapters.url_adapter import FEATURE_NAMES, extract_enriched_url_features

    parser = argparse.ArgumentParser()
    parser.add_argument("--data", required=True, help="CSV with columns url,label")
    parser.add_argument("--out", default="server/models")
    parser.add_argument("--test-size", type=float, default=0.2)
    args = parser.parse_args()

    X, y = [], []
    skipped_rows = 0
    with open(args.data, encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            try:
                context = {
                    name: row[name]
                    for name in FEATURE_NAMES
                    if name in row and row[name] not in {None, ""}
                }
                X.append(extract_enriched_url_features(row["url"], context=context))
                y.append(int(row["label"]))
            except (ValueError, KeyError):
                skipped_rows += 1
                continue

    X = np.array(X, dtype=np.float32)
    y = np.array(y)
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=args.test_size, random_state=42,
                                          stratify=y)

    model = lgb.LGBMClassifier(
        n_estimators=300, num_leaves=48, learning_rate=0.05,
        subsample=0.8, colsample_bytree=0.8, random_state=42,
    )
    model.fit(Xtr, ytr)
    pred = model.predict(Xte)
    report = classification_report(yte, pred, output_dict=True)
    f1 = f1_score(yte, pred)
    print(classification_report(yte, pred))
    print("F1:", f1)

    os.makedirs(args.out, exist_ok=True)
    onnx_model = convert_lightgbm(
        model, initial_types=[("input", FloatTensorType([None, len(FEATURE_NAMES)]))]
    )
    out_path = os.path.join(args.out, "url_lgbm.onnx")
    payload = onnx_model.SerializeToString()
    with open(out_path, "wb") as fh:
        fh.write(payload)
    label_counts = collections.Counter(int(value) for value in y.tolist())
    metadata = {
        "artifact": "url_lgbm.onnx",
        "architecture": "LightGBM LGBMClassifier over handcrafted URL features",
        "runtime_input": f"tensor(float) shape [N, {len(FEATURE_NAMES)}]",
        "runtime_outputs": ["label", "probabilities"],
        "purpose": "real-data URL phishing classifier for gateway serving",
        "trained_at_utc": datetime.now(UTC).replace(microsecond=0).isoformat(),
        "label_mapping": {"0": "benign", "1": "phishing"},
        "dataset": {
            "path": args.data,
            "rows": int(len(y)),
            "skipped_rows": int(skipped_rows),
            "class_counts": {str(label): int(label_counts[label]) for label in (0, 1)},
            "test_size": args.test_size,
            "train_rows": int(len(ytr)),
            "test_rows": int(len(yte)),
        },
        "feature_names": list(FEATURE_NAMES),
        "model_config": {
            "n_estimators": 300,
            "num_leaves": 48,
            "learning_rate": 0.05,
            "subsample": 0.8,
            "colsample_bytree": 0.8,
            "random_state": 42,
        },
        "metrics": {
            "test": {
                "f1": float(f1),
                "classification_report": report,
            }
        },
        "sha256": hashlib.sha256(payload).hexdigest(),
    }
    metadata_path = os.path.join(args.out, "url_lgbm.meta.json")
    with open(metadata_path, "w", encoding="utf-8") as fh:
        json.dump(metadata, fh, indent=2, ensure_ascii=True)
        fh.write("\n")
    print("Saved", out_path)


if __name__ == "__main__":
    main()
