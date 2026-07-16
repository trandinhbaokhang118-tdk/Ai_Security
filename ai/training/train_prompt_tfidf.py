"""Train lightweight TF-IDF + Logistic Regression prompt injection classifier.

This is a lighter-weight alternative when GPU/disk space is limited.
For production quality, use train_prompt_transformer.py with DeBERTa.

Usage:
    python -m ai.training.train_prompt_tfidf --data data/prompt_injection_train.csv --out ai/models
"""

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
import pandas as pd
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import StringTensorType
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline


def load_and_prepare_data(train_files, val_files, test_size=0.2, max_samples=None, seed=42):
    """Load CSV files and prepare train/validation splits."""
    # Load training data
    train_dfs = [pd.read_csv(f) for f in train_files]
    df_train = pd.concat(train_dfs, ignore_index=True)

    # Clean data
    df_train = df_train.dropna(subset=["text", "label"])
    df_train["text"] = df_train["text"].astype(str).str.strip()
    df_train = df_train[df_train["text"].str.len() > 0]
    df_train["label"] = df_train["label"].astype(int)

    # Remove duplicates
    df_train = df_train.drop_duplicates(subset=["text"])

    # Sample if needed
    if max_samples and len(df_train) > max_samples:
        df_train = df_train.sample(n=max_samples, random_state=seed)

    # Split or load validation
    if val_files:
        val_dfs = [pd.read_csv(f) for f in val_files]
        df_val = pd.concat(val_dfs, ignore_index=True)
        df_val = df_val.dropna(subset=["text", "label"])
        df_val["text"] = df_val["text"].astype(str).str.strip()
        df_val = df_val[df_val["text"].str.len() > 0]
        df_val["label"] = df_val["label"].astype(int)
        df_val = df_val.drop_duplicates(subset=["text"])

        X_train, y_train = df_train["text"].values, df_train["label"].values
        X_val, y_val = df_val["text"].values, df_val["label"].values
    else:
        X_train, X_val, y_train, y_val = train_test_split(
            df_train["text"].values,
            df_train["label"].values,
            test_size=test_size,
            random_state=seed,
            stratify=df_train["label"].values,
        )

    return X_train, X_val, y_train, y_val


def train_model(X_train, y_train, max_features=5000, ngram_range=(1, 3)):
    """Train TF-IDF + Logistic Regression pipeline for prompt injection detection."""
    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(
            max_features=max_features,
            ngram_range=ngram_range,
            lowercase=True,
            strip_accents=None,  # ONNX export requires None
            stop_words=None,  # Keep all words for injection detection
            min_df=2,
            max_df=0.9,
            analyzer="word",  # Word analyzer for ONNX compatibility
        )),
        ("classifier", LogisticRegression(
            max_iter=1000,
            class_weight="balanced",
            random_state=42,
            solver="saga",
            C=1.0,
        ))
    ])

    print("Training TF-IDF + Logistic Regression model for prompt injection...")
    pipeline.fit(X_train, y_train)
    print("Training complete!")

    return pipeline


def evaluate_model(model, X_val, y_val):
    """Evaluate model and return metrics."""
    y_pred = model.predict(X_val)
    y_proba = model.predict_proba(X_val)[:, 1]

    metrics = {
        "accuracy": float(accuracy_score(y_val, y_pred)),
        "precision": float(precision_score(y_val, y_pred)),
        "recall": float(recall_score(y_val, y_pred)),
        "f1": float(f1_score(y_val, y_pred)),
        "roc_auc": float(roc_auc_score(y_val, y_proba)),
    }

    print("\n=== Validation Metrics ===")
    for key, value in metrics.items():
        print(f"{key}: {value:.4f}")

    print("\n=== Classification Report ===")
    print(classification_report(y_val, y_pred, target_names=["Benign", "Malicious"]))

    return metrics


def export_to_onnx(model, output_path):
    """Export sklearn pipeline to ONNX format."""
    print(f"\nExporting to ONNX: {output_path}")

    # Convert to ONNX
    initial_type = [("input", StringTensorType([None, 1]))]
    onnx_model = convert_sklearn(
        model,
        initial_types=initial_type,
        target_opset=17,
        options={
            "zipmap": False,  # Disable ZipMap for cleaner output
        }
    )

    # Save ONNX model
    with open(output_path, "wb") as f:
        f.write(onnx_model.SerializeToString())

    print(f"Model exported successfully: {output_path}")
    return output_path


def compute_sha256(filepath):
    """Compute SHA256 hash of file."""
    sha256 = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            sha256.update(chunk)
    return sha256.hexdigest()


def save_metadata(output_path, metrics, train_files, train_size, val_size):
    """Save model metadata."""
    metadata = {
        "artifact": output_path.name,
        "architecture": "tfidf_logistic_regression_char",
        "purpose": "prompt injection detection (lightweight alternative)",
        "label_mapping": {"0": "benign", "1": "injection"},
        "training_files": [Path(f).name for f in train_files],
        "train_size": int(train_size),
        "validation_size": int(val_size),
        "metrics": metrics,
        "sha256": compute_sha256(output_path),
        "note": "Lightweight TF-IDF model with character n-grams. For better accuracy, use DeBERTa transformer.",
    }

    metadata_path = output_path.with_suffix(".meta.json")
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)

    print(f"\nMetadata saved: {metadata_path}")
    return metadata


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", action="append", required=True, help="Training CSV file(s)")
    parser.add_argument("--validation-data", action="append", help="Validation CSV file(s)")
    parser.add_argument("--out", default="ai/models", help="Output directory")
    parser.add_argument("--max-features", type=int, default=5000, help="Max TF-IDF features")
    parser.add_argument("--max-samples", type=int, help="Max training samples (for testing)")
    parser.add_argument("--test-size", type=float, default=0.2, help="Validation split ratio")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")

    args = parser.parse_args()

    # Load data
    print("Loading data...")
    X_train, X_val, y_train, y_val = load_and_prepare_data(
        args.data,
        args.validation_data,
        args.test_size,
        args.max_samples,
        args.seed,
    )

    print(f"Training samples: {len(X_train)} (benign: {np.sum(y_train == 0)}, injection: {np.sum(y_train == 1)})")
    print(f"Validation samples: {len(X_val)} (benign: {np.sum(y_val == 0)}, injection: {np.sum(y_val == 1)})")

    # Train model
    model = train_model(X_train, y_train, max_features=args.max_features)

    # Evaluate
    metrics = evaluate_model(model, X_val, y_val)

    # Export
    output_dir = Path(args.out)
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / "prompt_tfidf_logreg.onnx"

    export_to_onnx(model, output_path)

    # Save metadata
    metadata = save_metadata(
        output_path,
        metrics,
        args.data,
        len(X_train),
        len(X_val),
    )

    print("\n=== Training Complete ===")
    print(json.dumps(metadata, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
