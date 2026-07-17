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


def test_credential_lure_score_is_monotonic():
    two_terms = assess_url("https://example.test/login/verify")
    three_terms = assess_url("https://example.test/login/verify/account")

    assert three_terms.layer_scores["credential_intent"] >= two_terms.layer_scores[
        "credential_intent"
    ]
    assert any(item.feature == "credential_lure_cluster" for item in three_terms.evidence)


def test_disguised_executable_is_high_risk_and_requires_sandbox():
    result = assess_url("https://files.example.test/CV-Nguyen.pdf.exe")

    assert result.score >= 0.85
    assert result.requires_deep_analysis is True
    assert {item.feature for item in result.evidence} >= {
        "dangerous_download",
        "disguised_executable_download",
    }


def test_shared_hosting_only_scores_when_lure_context_exists():
    benign = assess_url("https://legitimate-project.pages.dev/docs")
    phishing = assess_url("https://microsoft-login.pages.dev/account/verify")

    assert not any(item.feature == "shared_hosting_abuse_context" for item in benign.evidence)
    assert phishing.score >= 0.85
    assert any(item.feature == "shared_hosting_abuse_context" for item in phishing.evidence)
