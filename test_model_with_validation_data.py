"""Test trained models with validation data to verify accuracy.

This script loads the validation dataset and tests each model's predictions
against the known labels to ensure the models are working correctly.
"""

import csv
import os
from collections import Counter

from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)

from ai.inference.engine import InferenceEngine


def load_validation_data(csv_path: str) -> tuple[list[str], list[int]]:
    """Load validation data from CSV file."""
    texts = []
    labels = []

    if not os.path.exists(csv_path):
        print(f"⚠️  File not found: {csv_path}")
        return texts, labels

    with open(csv_path, encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Handle both 'text' and 'url' columns
            text = row.get('text') or row.get('url', '')
            label = int(row.get('label', 0))

            if text.strip():
                texts.append(text.strip())
                labels.append(label)

    return texts, labels


def test_text_model(engine: InferenceEngine, val_data_path: str) -> dict:
    """Test text phishing model with validation data."""
    print("\n" + "=" * 70)
    print("📝 TESTING TEXT PHISHING MODEL")
    print("=" * 70)

    texts, true_labels = load_validation_data(val_data_path)

    if not texts:
        print(f"❌ No validation data found at {val_data_path}")
        return {"error": "No data"}

    print(f"\n✅ Loaded {len(texts)} validation samples")
    print(f"   Label distribution: {dict(Counter(true_labels))}")

    # Make predictions
    print("\n🔄 Running predictions...")
    predictions = []
    risk_scores = []

    for text in texts:
        try:
            result = engine.predict_text(text)
            # Convert risk score to binary prediction (>0.5 = malicious)
            pred = 1 if result.risk_score > 0.5 else 0
            predictions.append(pred)
            risk_scores.append(result.risk_score)
        except Exception as e:
            print(f"⚠️  Error predicting: {e}")
            predictions.append(0)
            risk_scores.append(0.0)

    # Calculate metrics
    accuracy = accuracy_score(true_labels, predictions)
    precision = precision_score(true_labels, predictions, zero_division=0)
    recall = recall_score(true_labels, predictions, zero_division=0)
    f1 = f1_score(true_labels, predictions, zero_division=0)

    print("\n📊 METRICS:")
    print(f"   Accuracy:  {accuracy:.4f}")
    print(f"   Precision: {precision:.4f}")
    print(f"   Recall:    {recall:.4f}")
    print(f"   F1 Score:  {f1:.4f}")

    # Confusion matrix
    cm = confusion_matrix(true_labels, predictions)
    print("\n📈 CONFUSION MATRIX:")
    print(f"   True Negatives:  {cm[0][0]}")
    print(f"   False Positives: {cm[0][1]}")
    print(f"   False Negatives: {cm[1][0]}")
    print(f"   True Positives:  {cm[1][1]}")

    # Show some examples
    print("\n🔍 EXAMPLE PREDICTIONS (First 5):")
    for i in range(min(5, len(texts))):
        text_preview = texts[i][:60] + "..." if len(texts[i]) > 60 else texts[i]
        true_label = "MALICIOUS" if true_labels[i] == 1 else "BENIGN"
        pred_label = "MALICIOUS" if predictions[i] == 1 else "BENIGN"
        match = "✅" if true_labels[i] == predictions[i] else "❌"

        print(f"\n   {match} Text: {text_preview}")
        print(f"      True: {true_label}, Predicted: {pred_label}, Score: {risk_scores[i]:.4f}")

    # Show misclassifications
    misclassified = [(i, texts[i], true_labels[i], predictions[i], risk_scores[i])
                     for i in range(len(texts))
                     if true_labels[i] != predictions[i]]

    if misclassified:
        print(f"\n⚠️  MISCLASSIFICATIONS ({len(misclassified)} total):")
        for i, (_idx, text, true_label, pred, score) in enumerate(misclassified[:5]):
            text_preview = text[:60] + "..." if len(text) > 60 else text
            true_label_str = "MALICIOUS" if true_label == 1 else "BENIGN"
            pred_label_str = "MALICIOUS" if pred == 1 else "BENIGN"
            print(f"\n   [{i+1}] Text: {text_preview}")
            print(f"       True: {true_label_str}, Predicted: {pred_label_str}, Score: {score:.4f}")

    return {
        "accuracy": accuracy,
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "total_samples": len(texts),
        "misclassified": len(misclassified)
    }


def test_url_model(engine: InferenceEngine, val_data_path: str) -> dict:
    """Test URL model with validation data."""
    print("\n" + "=" * 70)
    print("🌐 TESTING URL PHISHING MODEL")
    print("=" * 70)

    # For URL model, we expect a file named url_dataset.csv or similar
    if not os.path.exists(val_data_path):
        print(f"❌ No validation data found at {val_data_path}")
        return {"error": "No data"}

    urls, true_labels = load_validation_data(val_data_path)

    if not urls:
        print("❌ No URL validation data found")
        return {"error": "No data"}

    # Sample for testing (URLs can be large)
    max_test = min(500, len(urls))
    urls = urls[:max_test]
    true_labels = true_labels[:max_test]

    print(f"\n✅ Loaded {len(urls)} validation samples (capped at {max_test})")
    print(f"   Label distribution: {dict(Counter(true_labels))}")

    # Make predictions
    print("\n🔄 Running predictions...")
    predictions = []
    risk_scores = []

    for url in urls:
        try:
            result = engine.predict_url(url)
            pred = 1 if result.risk_score > 0.5 else 0
            predictions.append(pred)
            risk_scores.append(result.risk_score)
        except Exception as e:
            print(f"⚠️  Error predicting: {e}")
            predictions.append(0)
            risk_scores.append(0.0)

    # Calculate metrics
    accuracy = accuracy_score(true_labels, predictions)
    precision = precision_score(true_labels, predictions, zero_division=0)
    recall = recall_score(true_labels, predictions, zero_division=0)
    f1 = f1_score(true_labels, predictions, zero_division=0)

    print("\n📊 METRICS:")
    print(f"   Accuracy:  {accuracy:.4f}")
    print(f"   Precision: {precision:.4f}")
    print(f"   Recall:    {recall:.4f}")
    print(f"   F1 Score:  {f1:.4f}")

    # Confusion matrix
    cm = confusion_matrix(true_labels, predictions)
    print("\n📈 CONFUSION MATRIX:")
    print(f"   True Negatives:  {cm[0][0]}")
    print(f"   False Positives: {cm[0][1]}")
    print(f"   False Negatives: {cm[1][0]}")
    print(f"   True Positives:  {cm[1][1]}")

    return {
        "accuracy": accuracy,
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "total_samples": len(urls)
    }


def test_prompt_model(engine: InferenceEngine, val_data_path: str) -> dict:
    """Test prompt injection model with validation data."""
    print("\n" + "=" * 70)
    print("💬 TESTING PROMPT INJECTION MODEL")
    print("=" * 70)

    prompts, true_labels = load_validation_data(val_data_path)

    if not prompts:
        print(f"❌ No validation data found at {val_data_path}")
        return {"error": "No data"}

    print(f"\n✅ Loaded {len(prompts)} validation samples")
    print(f"   Label distribution: {dict(Counter(true_labels))}")

    # Make predictions
    print("\n🔄 Running predictions...")
    predictions = []
    risk_scores = []

    for prompt in prompts:
        try:
            result = engine.predict_prompt(prompt)
            pred = 1 if result.risk_score > 0.5 else 0
            predictions.append(pred)
            risk_scores.append(result.risk_score)
        except Exception as e:
            print(f"⚠️  Error predicting: {e}")
            predictions.append(0)
            risk_scores.append(0.0)

    # Calculate metrics
    accuracy = accuracy_score(true_labels, predictions)
    precision = precision_score(true_labels, predictions, zero_division=0)
    recall = recall_score(true_labels, predictions, zero_division=0)
    f1 = f1_score(true_labels, predictions, zero_division=0)

    print("\n📊 METRICS:")
    print(f"   Accuracy:  {accuracy:.4f}")
    print(f"   Precision: {precision:.4f}")
    print(f"   Recall:    {recall:.4f}")
    print(f"   F1 Score:  {f1:.4f}")

    # Confusion matrix
    cm = confusion_matrix(true_labels, predictions)
    print("\n📈 CONFUSION MATRIX:")
    print(f"   True Negatives:  {cm[0][0]}")
    print(f"   False Positives: {cm[0][1]}")
    print(f"   False Negatives: {cm[1][0]}")
    print(f"   True Positives:  {cm[1][1]}")

    # Show some examples
    print("\n🔍 EXAMPLE PREDICTIONS (First 5):")
    for i in range(min(5, len(prompts))):
        prompt_preview = prompts[i][:60] + "..." if len(prompts[i]) > 60 else prompts[i]
        true_label = "INJECTION" if true_labels[i] == 1 else "BENIGN"
        pred_label = "INJECTION" if predictions[i] == 1 else "BENIGN"
        match = "✅" if true_labels[i] == predictions[i] else "❌"

        print(f"\n   {match} Prompt: {prompt_preview}")
        print(f"      True: {true_label}, Predicted: {pred_label}, Score: {risk_scores[i]:.4f}")

    return {
        "accuracy": accuracy,
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "total_samples": len(prompts)
    }


def main():
    """Main test function."""
    print("=" * 70)
    print("MODEL VALIDATION TEST")
    print("=" * 70)

    # Initialize inference engine
    engine = InferenceEngine('ai/models')

    if not engine.models_loaded:
        print("❌ Models not loaded properly!")
        return 1

    results = {}

    # Test text model
    text_val_path = "data/phishing_text_validation.csv"
    if os.path.exists(text_val_path):
        results['text'] = test_text_model(engine, text_val_path)
    else:
        print(f"\n⚠️  Skipping text model test - {text_val_path} not found")

    # Test URL model
    url_val_path = "data/url_dataset.csv"
    if os.path.exists(url_val_path):
        results['url'] = test_url_model(engine, url_val_path)
    else:
        print(f"\n⚠️  Skipping URL model test - {url_val_path} not found")

    # Test prompt model
    prompt_val_path = "data/prompt_injection_validation.csv"
    if os.path.exists(prompt_val_path):
        results['prompt'] = test_prompt_model(engine, prompt_val_path)
    else:
        print(f"\n⚠️  Skipping prompt model test - {prompt_val_path} not found")

    # Summary
    print("\n" + "=" * 70)
    print("📋 SUMMARY")
    print("=" * 70)

    for model_name, metrics in results.items():
        if 'error' not in metrics:
            print(f"\n{model_name.upper()} MODEL:")
            print(f"  Accuracy:  {metrics['accuracy']:.4f}")
            print(f"  Precision: {metrics['precision']:.4f}")
            print(f"  Recall:    {metrics['recall']:.4f}")
            print(f"  F1 Score:  {metrics['f1']:.4f}")
            print(f"  Samples:   {metrics['total_samples']}")

    print("\n" + "=" * 70)
    print("✅ VALIDATION TEST COMPLETE")
    print("=" * 70 + "\n")

    return 0


if __name__ == "__main__":
    exit(main())
