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
