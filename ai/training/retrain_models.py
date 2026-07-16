#!/usr/bin/env python3
"""
Unified model retraining script that uses updated training data.
Supports retraining text, prompt, and URL classifiers.

Usage:
    python ai/training/retrain_models.py --data data/phishing_text_validation.csv --models text prompt url
"""

import argparse
import json
import logging
import sys
from datetime import datetime
from pathlib import Path

import pandas as pd

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def load_training_data(data_path: str) -> pd.DataFrame:
    """Load and validate training data from CSV."""
    logger.info(f"Loading training data from: {data_path}")

    try:
        df = pd.read_csv(data_path)
        logger.info(f"Loaded {len(df)} samples")

        # Validate required columns
        if 'text' not in df.columns or 'label' not in df.columns:
            raise ValueError("CSV must contain 'text' and 'label' columns")

        # Check distribution
        label_dist = df['label'].value_counts()
        logger.info(f"Label distribution:\n{label_dist}")

        return df
    except Exception as e:
        logger.error(f"Failed to load training data: {e}")
        raise


def retrain_text_model(df: pd.DataFrame, output_dir: str) -> dict:
    """Retrain text phishing classifier."""
    logger.info("=" * 60)
    logger.info("RETRAINING TEXT PHISHING CLASSIFIER")
    logger.info("=" * 60)

    try:
        import joblib
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.linear_model import LogisticRegression
        from sklearn.metrics import accuracy_score, classification_report, f1_score
        from sklearn.model_selection import train_test_split
        from sklearn.pipeline import Pipeline

        # Split data
        X = df['text']
        y = df['label']
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )

        logger.info(f"Training set: {len(X_train)} samples")
        logger.info(f"Test set: {len(X_test)} samples")

        # Build pipeline
        pipeline = Pipeline([
            ('tfidf', TfidfVectorizer(
                max_features=5000,
                ngram_range=(1, 3),
                min_df=2,
                stop_words='english'
            )),
            ('clf', LogisticRegression(
                C=1.0,
                max_iter=1000,
                random_state=42,
                class_weight='balanced'
            ))
        ])

        # Train
        logger.info("Training model...")
        pipeline.fit(X_train, y_train)

        # Evaluate
        y_pred = pipeline.predict(X_test)
        f1 = f1_score(y_test, y_pred, average='weighted')
        acc = accuracy_score(y_test, y_pred)

        logger.info(f"F1 Score: {f1:.4f}")
        logger.info(f"Accuracy: {acc:.4f}")
        logger.info("\nClassification Report:")
        logger.info(classification_report(y_test, y_pred))

        # Save model
        output_path = Path(output_dir) / "text_phishing_classifier.joblib"
        output_path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(pipeline, output_path)
        logger.info(f"Model saved to: {output_path}")

        return {
            "model": "text",
            "f1_score": float(f1),
            "accuracy": float(acc),
            "output_path": str(output_path)
        }

    except Exception as e:
        logger.error(f"Text model retraining failed: {e}")
        raise


def retrain_prompt_model(df: pd.DataFrame, output_dir: str) -> dict:
    """Retrain prompt injection classifier."""
    logger.info("=" * 60)
    logger.info("RETRAINING PROMPT INJECTION CLASSIFIER")
    logger.info("=" * 60)

    try:
        import joblib
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.linear_model import LogisticRegression
        from sklearn.metrics import accuracy_score, classification_report, f1_score
        from sklearn.model_selection import train_test_split
        from sklearn.pipeline import Pipeline

        # Filter for prompt injection patterns (assuming label 1 = malicious)
        # In a real scenario, you might have separate prompt injection data
        X = df['text']
        y = df['label']
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )

        logger.info(f"Training set: {len(X_train)} samples")
        logger.info(f"Test set: {len(X_test)} samples")

        # Build pipeline optimized for prompt injection
        pipeline = Pipeline([
            ('tfidf', TfidfVectorizer(
                max_features=3000,
                ngram_range=(1, 2),
                min_df=1,
                analyzer='word',
                token_pattern=r'\b\w+\b'
            )),
            ('clf', LogisticRegression(
                C=0.5,
                max_iter=500,
                random_state=42,
                class_weight='balanced'
            ))
        ])

        # Train
        logger.info("Training model...")
        pipeline.fit(X_train, y_train)

        # Evaluate
        y_pred = pipeline.predict(X_test)
        f1 = f1_score(y_test, y_pred, average='weighted')
        acc = accuracy_score(y_test, y_pred)

        logger.info(f"F1 Score: {f1:.4f}")
        logger.info(f"Accuracy: {acc:.4f}")
        logger.info("\nClassification Report:")
        logger.info(classification_report(y_test, y_pred))

        # Save model
        output_path = Path(output_dir) / "prompt_injection_classifier.joblib"
        output_path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(pipeline, output_path)
        logger.info(f"Model saved to: {output_path}")

        return {
            "model": "prompt",
            "f1_score": float(f1),
            "accuracy": float(acc),
            "output_path": str(output_path)
        }

    except Exception as e:
        logger.error(f"Prompt model retraining failed: {e}")
        raise


def retrain_url_model(df: pd.DataFrame, output_dir: str) -> dict:
    """Retrain URL phishing classifier using LightGBM."""
    logger.info("=" * 60)
    logger.info("RETRAINING URL PHISHING CLASSIFIER")
    logger.info("=" * 60)

    try:
        import joblib
        import lightgbm as lgb
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics import accuracy_score, classification_report, f1_score
        from sklearn.model_selection import train_test_split

        # Extract URL features (simplified - in production, extract more URL features)
        X = df['text']
        y = df['label']

        # Use TF-IDF for URL character patterns
        vectorizer = TfidfVectorizer(
            max_features=1000,
            analyzer='char',
            ngram_range=(2, 4)
        )

        X_vec = vectorizer.fit_transform(X)

        X_train, X_test, y_train, y_test = train_test_split(
            X_vec, y, test_size=0.2, random_state=42, stratify=y
        )

        logger.info(f"Training set: {X_train.shape[0]} samples")
        logger.info(f"Test set: {X_test.shape[0]} samples")

        # Train LightGBM
        train_data = lgb.Dataset(X_train, label=y_train)
        test_data = lgb.Dataset(X_test, label=y_test, reference=train_data)

        params = {
            'objective': 'binary',
            'metric': 'binary_logloss',
            'boosting_type': 'gbdt',
            'num_leaves': 31,
            'learning_rate': 0.05,
            'feature_fraction': 0.9,
            'bagging_fraction': 0.8,
            'bagging_freq': 5,
            'verbose': 0
        }

        logger.info("Training LightGBM model...")
        model = lgb.train(
            params,
            train_data,
            num_boost_round=100,
            valid_sets=[test_data],
            callbacks=[lgb.early_stopping(stopping_rounds=10)]
        )

        # Evaluate
        y_pred_prob = model.predict(X_test)
        y_pred = (y_pred_prob > 0.5).astype(int)
        f1 = f1_score(y_test, y_pred, average='weighted')
        acc = accuracy_score(y_test, y_pred)

        logger.info(f"F1 Score: {f1:.4f}")
        logger.info(f"Accuracy: {acc:.4f}")
        logger.info("\nClassification Report:")
        logger.info(classification_report(y_test, y_pred))

        # Save model and vectorizer
        model_path = Path(output_dir) / "url_lgbm_model.txt"
        vectorizer_path = Path(output_dir) / "url_vectorizer.joblib"
        model_path.parent.mkdir(parents=True, exist_ok=True)

        model.save_model(str(model_path))
        joblib.dump(vectorizer, vectorizer_path)
        logger.info(f"Model saved to: {model_path}")
        logger.info(f"Vectorizer saved to: {vectorizer_path}")

        return {
            "model": "url",
            "f1_score": float(f1),
            "accuracy": float(acc),
            "output_path": str(model_path)
        }

    except Exception as e:
        logger.error(f"URL model retraining failed: {e}")
        raise


def main():
    parser = argparse.ArgumentParser(
        description="Retrain AI Security models with updated data"
    )
    parser.add_argument(
        "--data",
        type=str,
        required=True,
        help="Path to CSV training data file"
    )
    parser.add_argument(
        "--models",
        nargs="+",
        choices=["text", "prompt", "url"],
        default=["text", "prompt", "url"],
        help="Models to retrain (space-separated)"
    )
    parser.add_argument(
        "--output",
        type=str,
        default="server/models",
        help="Output directory for trained models"
    )

    args = parser.parse_args()

    # Load data
    try:
        df = load_training_data(args.data)
    except Exception as e:
        logger.error(f"Failed to load data: {e}")
        sys.exit(1)

    # Retrain selected models
    results = []

    if "text" in args.models:
        try:
            result = retrain_text_model(df, args.output)
            results.append(result)
        except Exception as e:
            logger.error(f"Text model training failed: {e}")

    if "prompt" in args.models:
        try:
            result = retrain_prompt_model(df, args.output)
            results.append(result)
        except Exception as e:
            logger.error(f"Prompt model training failed: {e}")

    if "url" in args.models:
        try:
            result = retrain_url_model(df, args.output)
            results.append(result)
        except Exception as e:
            logger.error(f"URL model training failed: {e}")

    # Save results summary
    summary = {
        "timestamp": datetime.now().isoformat(),
        "data_path": args.data,
        "data_samples": len(df),
        "models_trained": len(results),
        "results": results
    }

    summary_path = Path(args.output) / "training_summary.json"
    summary_path.parent.mkdir(parents=True, exist_ok=True)
    with open(summary_path, 'w') as f:
        json.dump(summary, f, indent=2)

    logger.info("=" * 60)
    logger.info("TRAINING COMPLETE")
    logger.info("=" * 60)
    logger.info(f"Models trained: {len(results)}")
    logger.info(f"Summary saved to: {summary_path}")

    # Print JSON for easy parsing
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
