"""Script to analyze and improve URL model performance.

This script analyzes misclassifications and suggests improvements.
"""

import csv
import os
from collections import Counter
from typing import List, Tuple

import numpy as np

from ai.adapters.url_adapter import analyze_url_signals, extract_url_features
from ai.inference.engine import InferenceEngine


def analyze_misclassifications(val_data_path: str, max_samples: int = 1000):
    """Analyze URL model misclassifications to identify patterns."""
    print("=" * 70)
    print("🔍 ANALYZING URL MODEL MISCLASSIFICATIONS")
    print("=" * 70)
    
    if not os.path.exists(val_data_path):
        print(f"❌ File not found: {val_data_path}")
        return
    
    # Load data
    urls = []
    labels = []
    with open(val_data_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            url = row.get('url', row.get('text', ''))
            label = int(row.get('label', 0))
            if url.strip():
                urls.append(url.strip())
                labels.append(label)
    
    # Sample for analysis
    max_test = min(max_samples, len(urls))
    urls = urls[:max_test]
    labels = labels[:max_test]
    
    print(f"\n✅ Analyzing {len(urls)} URLs")
    print(f"   Label distribution: {dict(Counter(labels))}")
    
    # Make predictions
    engine = InferenceEngine('ai/models')
    predictions = []
    risk_scores = []
    
    for url in urls:
        try:
            result = engine.predict_url(url)
            pred = 1 if result.risk_score > 0.5 else 0
            predictions.append(pred)
            risk_scores.append(result.risk_score)
        except Exception as e:
            predictions.append(0)
            risk_scores.append(0.0)
    
    # Find misclassifications
    misclassified = []
    for i in range(len(urls)):
        if labels[i] != predictions[i]:
            misclassified.append({
                'url': urls[i],
                'true_label': labels[i],
                'predicted': predictions[i],
                'score': risk_scores[i]
            })
    
    print(f"\n📊 Total misclassifications: {len(misclassified)} / {len(urls)} ({len(misclassified)/len(urls)*100:.1f}%)")
    
    # Analyze false negatives (missed phishing)
    false_negatives = [m for m in misclassified if m['true_label'] == 1]
    print(f"\n❌ FALSE NEGATIVES (Missed Phishing): {len(false_negatives)}")
    print("   These are actual phishing URLs that the model marked as safe.")
    
    if false_negatives:
        print("\n   TOP 10 FALSE NEGATIVES:")
        for i, item in enumerate(false_negatives[:10], 1):
            url = item['url'][:80] + "..." if len(item['url']) > 80 else item['url']
            print(f"\n   [{i}] Score: {item['score']:.4f}")
            print(f"       URL: {url}")
            
            # Analyze why it was missed
            try:
                signals = analyze_url_signals(item['url'])
                features = extract_url_features(item['url'])
                print(f"       Signals: ", end="")
                
                signals_found = []
                if signals.brand_mismatch:
                    signals_found.append("brand_mismatch")
                if signals.homoglyph:
                    signals_found.append("homoglyph")
                if signals.ip_host:
                    signals_found.append("ip_host")
                if signals.risky_tld:
                    signals_found.append("risky_tld")
                if signals.suspicious_keywords:
                    signals_found.append(f"keywords({len(signals.suspicious_keywords)})")
                if signals.deceptive_subdomain:
                    signals_found.append("deceptive_subdomain")
                if not signals.no_https:
                    signals_found.append("has_https")
                
                if signals_found:
                    print(", ".join(signals_found))
                else:
                    print("No obvious signals detected")
                    
                # Check feature values
                if features[9] < 0.3:  # brand distance
                    print(f"       ⚠️  Low brand distance: {features[9]:.3f}")
                if features[1] > 4.0:  # domain entropy
                    print(f"       ⚠️  High domain entropy: {features[1]:.3f}")
                    
            except Exception as e:
                print(f"       Error analyzing: {e}")
    
    # Analyze false positives (legitimate marked as phishing)
    false_positives = [m for m in misclassified if m['true_label'] == 0]
    print(f"\n✅ FALSE POSITIVES (Legitimate marked as Phishing): {len(false_positives)}")
    print("   These are safe URLs that the model incorrectly flagged.")
    
    if false_positives:
        print("\n   TOP 10 FALSE POSITIVES:")
        for i, item in enumerate(false_positives[:10], 1):
            url = item['url'][:80] + "..." if len(item['url']) > 80 else item['url']
            print(f"\n   [{i}] Score: {item['score']:.4f}")
            print(f"       URL: {url}")
            
            try:
                signals = analyze_url_signals(item['url'])
                print(f"       Triggered signals: ", end="")
                
                triggers = []
                if signals.brand_mismatch:
                    triggers.append("brand_mismatch")
                if signals.homoglyph:
                    triggers.append("homoglyph")
                if signals.risky_tld:
                    triggers.append("risky_tld")
                if signals.suspicious_keywords:
                    triggers.append(f"keywords({','.join(signals.suspicious_keywords[:3])})")
                if signals.many_delimiters:
                    triggers.append("many_delimiters")
                if signals.long_url:
                    triggers.append("long_url")
                    
                if triggers:
                    print(", ".join(triggers))
                else:
                    print("Unclear why flagged")
                    
            except Exception as e:
                print(f"       Error: {e}")
    
    # Suggestions for improvement
    print("\n" + "=" * 70)
    print("💡 SUGGESTIONS FOR IMPROVEMENT")
    print("=" * 70)
    
    suggestions = []
    
    # Check if many false negatives have HTTPS
    fn_with_https = sum(1 for item in false_negatives 
                       if not analyze_url_signals(item['url']).no_https)
    if fn_with_https > len(false_negatives) * 0.5:
        suggestions.append(
            f"• Reduce trust in HTTPS: {fn_with_https}/{len(false_negatives)} "
            "missed phishing URLs use HTTPS"
        )
    
    # Check if many false positives triggered keyword detection
    fp_with_keywords = sum(1 for item in false_positives 
                          if analyze_url_signals(item['url']).suspicious_keywords)
    if fp_with_keywords > len(false_positives) * 0.3:
        suggestions.append(
            f"• Review keyword list: {fp_with_keywords}/{len(false_positives)} "
            "legitimate URLs triggered keyword detection"
        )
    
    # General suggestions
    suggestions.extend([
        "• Consider retraining with more balanced dataset",
        "• Add more domain reputation features",
        "• Implement URL age/registration date checking",
        "• Add SSL certificate validation features",
    ])
    
    for suggestion in suggestions:
        print(suggestion)
    
    print("\n" + "=" * 70)


def main():
    """Main analysis function."""
    val_data_path = "data/url_dataset.csv"
    analyze_misclassifications(val_data_path, max_samples=1000)


if __name__ == "__main__":
    main()
