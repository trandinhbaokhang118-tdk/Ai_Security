"""Improve URL feature extraction for better phishing detection.

This script adds enhanced features to improve URL model accuracy.
"""

import re
from urllib.parse import urlparse

# Top legitimate domains (whitelist)
TOP_LEGITIMATE_DOMAINS = {
    # Tech companies
    "google.com", "facebook.com", "microsoft.com", "apple.com", "amazon.com",
    "twitter.com", "instagram.com", "linkedin.com", "youtube.com", "netflix.com",
    "github.com", "stackoverflow.com", "reddit.com", "wikipedia.org",

    # Banks (Vietnam)
    "vietcombank.com.vn", "techcombank.com.vn", "mbbank.com.vn", "tpbank.com.vn",
    "bidv.com.vn", "agribank.com.vn", "acb.com.vn", "vpbank.com.vn",

    # E-commerce
    "shopee.vn", "lazada.vn", "tiki.vn", "sendo.vn",

    # Government
    "gov.vn", "ca.gov", "gov.uk",

    # News
    "vnexpress.net", "dantri.com.vn", "bbc.com", "cnn.com",
}


def is_whitelisted_domain(url: str) -> bool:
    """Check if URL is from a known legitimate domain."""
    try:
        parsed = urlparse(url if "://" in url else f"http://{url}")
        host = (parsed.hostname or "").lower()

        # Direct match
        if host in TOP_LEGITIMATE_DOMAINS:
            return True

        # Subdomain of legitimate domain
        for legitimate_domain in TOP_LEGITIMATE_DOMAINS:
            if host.endswith("." + legitimate_domain):
                return True

        return False
    except Exception:
        return False


def extract_enhanced_url_features(url: str) -> dict[str, float]:
    """Extract enhanced features for URL analysis.

    Returns additional features beyond the base 15:
    - is_whitelisted: 1.0 if domain is in whitelist
    - has_multiple_tlds: 1.0 if URL has multiple TLD-like patterns
    - subdomain_length: Length of subdomain
    - has_numbers_in_domain: 1.0 if domain has numbers
    - url_to_domain_ratio: URL length / domain length
    """
    from ai.adapters.url_adapter import _normalize_for_urlparse, parse_url_parts

    features = {}

    try:
        # Whitelist check
        features['is_whitelisted'] = 1.0 if is_whitelisted_domain(url) else 0.0

        # Parse URL
        normalized = _normalize_for_urlparse(url.strip())
        parsed = urlparse(normalized)
        parts = parse_url_parts(url)

        # Multiple TLD pattern (e.g., paypal.com.tk)
        host = parts.host
        tld_patterns = re.findall(r'\.(com|net|org|edu|gov|co|vn|uk)', host)
        features['has_multiple_tlds'] = 1.0 if len(tld_patterns) > 1 else 0.0

        # Subdomain analysis
        features['subdomain_length'] = float(len(parts.subdomain))
        features['subdomain_has_numbers'] = 1.0 if re.search(r'\d', parts.subdomain) else 0.0

        # Domain has numbers (not just subdomain)
        features['domain_has_numbers'] = 1.0 if re.search(r'\d', parts.domain_label) else 0.0

        # URL to domain ratio
        url_len = len(normalized)
        domain_len = len(parts.registrable_domain)
        features['url_to_domain_ratio'] = url_len / max(domain_len, 1)

        # Path analysis
        path_len = len(parsed.path or "")
        features['path_length'] = float(path_len)
        features['path_to_url_ratio'] = path_len / max(url_len, 1)

        # Query string complexity
        query = parsed.query or ""
        features['query_length'] = float(len(query))
        features['query_entropy'] = _calculate_entropy(query) if query else 0.0

        # Special character analysis
        features['hyphen_count'] = float(host.count('-'))
        features['underscore_count'] = float(host.count('_'))

    except Exception:
        # On error, return safe defaults
        for key in ['is_whitelisted', 'has_multiple_tlds', 'subdomain_length',
                    'subdomain_has_numbers', 'domain_has_numbers', 'url_to_domain_ratio',
                    'path_length', 'path_to_url_ratio', 'query_length', 'query_entropy',
                    'hyphen_count', 'underscore_count']:
            if key not in features:
                features[key] = 0.0

    return features


def _calculate_entropy(s: str) -> float:
    """Calculate Shannon entropy of a string."""
    import math
    if not s:
        return 0.0

    counts = {}
    for c in s:
        counts[c] = counts.get(c, 0) + 1

    n = len(s)
    entropy = 0.0
    for count in counts.values():
        p = count / n
        entropy -= p * math.log2(p)

    return entropy


def calculate_url_risk_score(url: str) -> tuple[float, dict[str, str]]:
    """Calculate risk score with enhanced features.

    Returns:
        (risk_score, explanations)
    """
    from ai.adapters.url_adapter import analyze_url_signals

    risk_score = 0.0
    explanations = {}

    try:
        # Whitelist check first
        if is_whitelisted_domain(url):
            return 0.0, {"whitelist": "Domain is in trusted whitelist"}

        # Get base signals
        signals = analyze_url_signals(url)
        enhanced = extract_enhanced_url_features(url)

        # High-confidence phishing indicators
        if signals.brand_mismatch:
            risk_score += 0.40
            explanations['brand_mismatch'] = "Domain impersonates trusted brand"

        if signals.homoglyph:
            risk_score += 0.35
            explanations['homoglyph'] = "Domain uses look-alike characters"

        if signals.ip_host:
            risk_score += 0.25
            explanations['ip_host'] = "Uses IP address instead of domain name"

        # Medium-confidence indicators
        if enhanced['has_multiple_tlds'] > 0.5:
            risk_score += 0.30
            explanations['multiple_tlds'] = "Suspicious multiple TLD pattern"

        if signals.deceptive_subdomain:
            risk_score += 0.25
            explanations['deceptive_subdomain'] = "Brand name hidden in subdomain"

        if signals.at_symbol:
            risk_score += 0.20
            explanations['at_symbol'] = "@ symbol hides real destination"

        # Lower-confidence indicators
        if signals.risky_tld and not signals.brand_mismatch:
            risk_score += 0.15
            explanations['risky_tld'] = "Uses high-risk TLD"

        if signals.no_https and len(signals.suspicious_keywords) > 0:
            risk_score += 0.15
            explanations['no_https_with_keywords'] = "No HTTPS on sensitive page"

        if signals.long_url and signals.percent_encoded:
            risk_score += 0.12
            explanations['obfuscated'] = "URL is obfuscated"

        if enhanced['subdomain_length'] > 30:
            risk_score += 0.10
            explanations['long_subdomain'] = "Unusually long subdomain"

        # Keyword analysis (context-aware)
        sensitive_keywords = {'login', 'verify', 'secure', 'password', 'bank', 'account'}
        found_keywords = sensitive_keywords & set(signals.suspicious_keywords)
        if found_keywords and not signals.brand_mismatch:
            risk_score += 0.08 * len(found_keywords)
            explanations['keywords'] = f"Sensitive keywords: {', '.join(found_keywords)}"

    except Exception as e:
        risk_score = 0.5
        explanations['error'] = f"Error analyzing URL: {str(e)}"

    return min(1.0, max(0.0, risk_score)), explanations


def main():
    """Test enhanced features on sample URLs."""
    test_urls = [
        # Legitimate
        ("https://www.google.com/search?q=test", 0),
        ("https://github.com/user/repo", 0),
        ("https://www.vietcombank.com.vn/login", 0),

        # Phishing
        ("http://paypa1-security.com/verify", 1),
        ("https://secure2.appleid.apple.com-0583.info/login", 1),
        ("http://192.168.1.1/bank-login", 1),
        ("https://www.paypal.com.tk/secure", 1),
    ]

    print("=" * 70)
    print("TESTING ENHANCED URL FEATURES")
    print("=" * 70)

    for url, expected_label in test_urls:
        risk_score, explanations = calculate_url_risk_score(url)
        predicted = 1 if risk_score > 0.5 else 0
        match = "✅" if predicted == expected_label else "❌"

        print(f"\n{match} URL: {url}")
        print(f"   Expected: {'Phishing' if expected_label else 'Legitimate'}")
        print(f"   Risk Score: {risk_score:.4f}")
        print(f"   Prediction: {'Phishing' if predicted else 'Legitimate'}")

        if explanations:
            print("   Reasons:")
            for _key, value in explanations.items():
                print(f"     - {value}")


if __name__ == "__main__":
    main()
