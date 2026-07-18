import pytest

from security.risk_core import PolicyEngineV2, default_config
from security.risk_core import assess as assess_risk_v2
from security.risk_core.detectors import (
    ScanObservations,
    add_offline_url_findings,
    build_criteria_evidence,
)
from security.risk_core.url_overrides import URL_OVERRIDE_RULES
from security.url_risk_core import assess_url


@pytest.mark.parametrize(
    "url,rule_id",
    [
        (
            "https://files.example.test/CV-Nguyen.pdf.exe",
            "url-disguised-executable-v1",
        ),
        (
            "https://microsoft-login.pages.dev/account/verify",
            "url-brand-shared-hosting-lure-v1",
        ),
        (
            "http://paypa1-verify.tk/login",
            "url-homoglyph-risky-tld-lure-v1",
        ),
    ],
)
def test_high_confidence_offline_url_patterns_hard_block_in_v2(url, rule_id):
    obs = ScanObservations(url)
    add_offline_url_findings(obs, assess_url(url).evidence)
    evidence = build_criteria_evidence(obs, default_config())
    risk = assess_risk_v2(evidence, override_rules=URL_OVERRIDE_RULES)
    policy = PolicyEngineV2().decide(risk)

    assert risk.risk_score >= 85
    assert risk.effective_override is not None
    assert risk.effective_override.rule_id == rule_id
    assert policy.decision.value == "hard_block"


def test_benign_url_has_no_v2_override():
    url = "https://github.com/openai"
    obs = ScanObservations(url)
    add_offline_url_findings(obs, assess_url(url).evidence)
    evidence = build_criteria_evidence(obs, default_config())
    risk = assess_risk_v2(evidence, override_rules=URL_OVERRIDE_RULES)

    assert risk.effective_override is None
    assert risk.risk_score < 20
    policy = PolicyEngineV2().decide(risk)
    assert policy.decision.value == "allow"


def test_login_keyword_alone_is_not_a_warning_decision():
    url = "https://github.com/login"
    obs = ScanObservations(url)
    add_offline_url_findings(obs, assess_url(url).evidence)
    evidence = build_criteria_evidence(obs, default_config())
    risk = assess_risk_v2(evidence, override_rules=URL_OVERRIDE_RULES)
    policy = PolicyEngineV2().decide(risk)

    assert risk.risk_score < 20
    assert policy.decision.value == "allow"
    assert policy.next_action.value == "deep_scan"
