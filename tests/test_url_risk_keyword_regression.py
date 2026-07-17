from security.url_risk_core import assess_url


def test_multilayer_core_preserves_short_credential_lure_signal():
    result = assess_url("http://paypa1-verify.tk/login")

    assert result.score >= 0.78
    assert any(item.feature == "suspicious_keywords" for item in result.evidence)
