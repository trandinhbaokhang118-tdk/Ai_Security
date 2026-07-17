from security.url_risk_core import assess_url


def test_multilayer_core_blocks_brand_subdomain_and_credential_lure():
    result = assess_url("https://facebook.com.security-login-check.xyz/verify?otp=1")

    assert result.score >= 0.75
    assert result.layer_scores["lexical_identity"] >= 0.6
    assert result.layer_scores["credential_intent"] > 0
    assert result.requires_deep_analysis is True
    assert {item.feature for item in result.evidence} >= {
        "brand_domain_mismatch", "deceptive_subdomain", "credential_theft_intent",
    }


def test_multilayer_core_marks_shortlink_for_sandbox():
    result = assess_url("https://bit.ly/account-verify")

    assert result.requires_deep_analysis is True
    assert any(item.feature == "is_shortlink" for item in result.evidence)


def test_multilayer_core_keeps_benign_domain_low_risk():
    result = assess_url("https://github.com/openai")

    assert result.score < 0.3
    assert result.requires_deep_analysis is False


def test_percent_encoded_xss_probe_is_blocked_after_component_normalization():
    result = assess_url(
        "https://fconline.fvplsummercup.vn/?q=%3Cscript%3Ealert(1)%3C/script%3E"
    )

    assert result.score >= 0.85
    assert result.requires_deep_analysis is True
    finding = next(item for item in result.evidence if item.feature == "xss_probe")
    assert finding.severity.value == "critical"
    assert "không tự chứng minh website có lỗ hổng" in finding.message


def test_double_encoded_xss_and_sqli_are_detected_but_benign_code_examples_are_not():
    xss = assess_url("https://example.com/?q=%253Cscript%253Ealert%25281%2529%253C%252Fscript%253E")
    sqli = assess_url("https://example.com/search?q=%27%20UNION%20SELECT%20password%20FROM%20users--")
    benign = assess_url("https://example.com/docs?topic=what-is-xss")

    assert any(item.feature == "xss_probe" for item in xss.evidence)
    assert any(item.feature == "sqli_probe" for item in sqli.evidence)
    assert not any(item.feature.endswith("_probe") for item in benign.evidence)
