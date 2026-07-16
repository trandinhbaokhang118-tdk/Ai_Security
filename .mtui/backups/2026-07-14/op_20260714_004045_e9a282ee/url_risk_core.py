"""Explainable multi-layer URL phishing risk core.

This module deliberately separates fast, offline analysis from live execution.  A
score is *not* a blacklist lookup: every layer emits independently auditable
signals, and expensive sandbox execution is only recommended for uncertain or
high-impact targets.
"""
from __future__ import annotations

from dataclasses import dataclass
from urllib.parse import parse_qsl, unquote, urlparse

from ai.adapters.url_adapter import URLSignals, analyze_url_signals, shannon_entropy
from shared.schemas import Evidence, Severity


@dataclass(frozen=True)
class URLRiskAssessment:
    score: float
    evidence: list[Evidence]
    requires_deep_analysis: bool
    layer_scores: dict[str, float]


def _clip(value: float) -> float:
    return max(0.0, min(1.0, value))


def _e(message: str, severity: Severity, feature: str, contribution: float) -> Evidence:
    return Evidence(
        source="url_risk_core", message=message, severity=severity,
        feature=feature, contribution=round(contribution, 3),
    )


def assess_url(url: str, model_score: float | None = None) -> URLRiskAssessment:
    """Score URL evidence in layers 0--2 without fetching an untrusted site.

    Layer 0 validates normalization; Layer 1 checks lexical/deception patterns;
    Layer 2 identifies credential-theft intent and evasion.  The caller may pass
    an ML score, but deterministic high-confidence indicators always dominate.
    """
    signals: URLSignals = analyze_url_signals(url)
    parsed = urlparse(signals.parts.normalized_url)
    decoded = unquote(signals.parts.normalized_url).lower()
    query_pairs = parse_qsl(parsed.query, keep_blank_values=True)
    evidence: list[Evidence] = []
    lexical = 0.02
    intent = 0.0
    evasion = 0.0

    # Layer 1: identity and routing deception.
    if signals.brand_mismatch:
        lexical += 0.42
        evidence.append(_e(
            f"Tên thương hiệu xuất hiện trên tên miền không chính chủ ({signals.parts.registrable_domain}).",
            Severity.CRITICAL, "brand_domain_mismatch", 0.42))
    if signals.deceptive_subdomain:
        lexical += 0.25
        evidence.append(_e("Thương hiệu hoặc nhãn 'secure/login' bị đặt ở subdomain để che tên miền thật.",
                           Severity.CRITICAL, "deceptive_subdomain", 0.25))
    if signals.homoglyph:
        lexical += 0.32
        evidence.append(_e("Tên miền có ký tự/dạng viết gần giống thương hiệu (homoglyph).",
                           Severity.CRITICAL, "homoglyph", 0.32))
    if signals.ip_host:
        lexical += 0.20
        evidence.append(_e("URL dùng địa chỉ IP thay vì tên miền, thường dùng để né nhận diện.",
                           Severity.HIGH, "ip_host", 0.20))
    if signals.risky_tld:
        lexical += 0.12
        evidence.append(_e("Tên miền cấp cao có mức lạm dụng phishing cao hơn trung bình.",
                           Severity.MEDIUM, "risky_tld", 0.12))
    if signals.no_https:
        lexical += 0.10
        evidence.append(_e("Không dùng HTTPS; dữ liệu nhập có thể bị lộ trên đường truyền.",
                           Severity.MEDIUM, "no_https", 0.10))
    if signals.shortlink:
        lexical += 0.10
        evidence.append(_e("Shortlink che giấu đích đến; cần mở rộng redirect trong sandbox.",
                           Severity.MEDIUM, "shortlink", 0.10))

    # Layer 2: credential theft intent and URL obfuscation/evasion.
    credential_terms = {"password", "otp", "card", "payment", "billing", "bank", "wallet", "cccd"}
    matched_sensitive = credential_terms.intersection(signals.suspicious_keywords)
    if matched_sensitive:
        intent += min(0.26, 0.09 * len(matched_sensitive))
        evidence.append(_e("URL nhắm tới dữ liệu nhạy cảm: " + ", ".join(sorted(matched_sensitive)) + ".",
                           Severity.HIGH, "credential_theft_intent", intent))
    if len(signals.suspicious_keywords) >= 3:
        intent += 0.10
        evidence.append(_e("Nhiều từ khóa xác minh/đăng nhập xuất hiện đồng thời.",
                           Severity.HIGH, "credential_lure_cluster", 0.10))
    if signals.at_symbol:
        evasion += 0.22
        evidence.append(_e("Ký tự @ có thể làm người dùng hiểu sai đích thực của URL.",
                           Severity.HIGH, "at_symbol", 0.22))
    if signals.percent_encoded or signals.many_delimiters:
        evasion += 0.12
        evidence.append(_e("URL bị mã hóa hoặc phân mảnh bất thường để né kiểm tra trực quan.",
                           Severity.MEDIUM, "url_obfuscation", 0.12))
    if signals.query_param_count >= 5 or len(query_pairs) >= 7:
        evasion += 0.08
        evidence.append(_e("URL chứa số lượng tham số truy vấn bất thường.",
                           Severity.LOW, "excessive_query_parameters", 0.08))
    host_entropy = shannon_entropy(signals.parts.domain_label)
    if len(signals.parts.domain_label) >= 14 and host_entropy >= 3.5:
        evasion += 0.10
        evidence.append(_e("Nhãn tên miền dài, entropy cao; có thể là tên miền sinh tự động.",
                           Severity.MEDIUM, "high_entropy_domain", 0.10))

    rule_score = _clip(lexical + intent + evasion)
    # ML augments the deterministic score but cannot reduce a strong rule verdict.
    score = _clip(max(rule_score, float(model_score or 0.0), (rule_score * 0.75) + (float(model_score or 0.0) * 0.25)))
    uncertain = 0.30 <= score < 0.70
    high_impact = bool(matched_sensitive or signals.shortlink or signals.brand_mismatch)
    requires_deep = uncertain or (high_impact and score >= 0.45)
    if requires_deep:
        evidence.append(_e("Khuyến nghị sandbox cô lập: mở trang bằng canary tổng hợp, chặn submit và theo dõi redirect/exfiltration.",
                           Severity.INFO, "deep_analysis_recommended", 0.0))
    if not evidence:
        evidence.append(_e("Không phát hiện tín hiệu rủi ro rõ rệt ở lớp phân tích ngoại tuyến.",
                           Severity.INFO, "no_offline_signal", 0.0))
    return URLRiskAssessment(score, evidence, requires_deep, {
        "lexical_identity": _clip(lexical), "credential_intent": _clip(intent), "evasion": _clip(evasion),
    })
