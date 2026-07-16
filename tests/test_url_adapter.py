"""URL adapter unit tests (test-plan.md §2.1)."""

import pytest

from ai.adapters.url_adapter import (
    analyze_url_signals,
    extract_url_features,
    has_homoglyph,
    is_ip_host,
    parse_url_parts,
)


def test_extract_features_valid_url():
    f = extract_url_features("https://github.com/user/repo")
    assert len(f) == 15
    assert f[8] == 1.0  # has_https


def test_extract_features_malformed_url():
    with pytest.raises(ValueError):
        extract_url_features("")


def test_homoglyph_detection():
    assert has_homoglyph("http://vietc0mbank-secure.xyz/login") is True
    assert has_homoglyph("https://github.com") is False


def test_ip_based_url():
    assert is_ip_host("http://192.168.1.1/login") is True
    f = extract_url_features("http://192.168.1.1/login")
    assert f[4] == 1.0


def test_risky_tld():
    f = extract_url_features("http://phish.xyz/login")
    assert f[3] == 1.0
    assert f[14] == 1.0  # suspicious keyword 'login'


def test_parse_real_domain_with_vietnamese_public_suffix():
    parts = parse_url_parts("https://vietcombank.com.vn/login")
    assert parts.domain_label == "vietcombank"
    assert parts.registrable_domain == "vietcombank.com.vn"


def test_deceptive_brand_in_subdomain():
    signals = analyze_url_signals("https://facebook.com.security-login-check.xyz/verify")
    assert signals.parts.registrable_domain == "security-login-check.xyz"
    assert signals.brand_mentions == ("facebook",)
    assert signals.brand_mismatch is True
    assert signals.brand_in_subdomain is True
    assert signals.deceptive_subdomain is True
    assert set(("security", "login", "verify")).issubset(signals.suspicious_keywords)
