import httpx

from security.risk_core import default_config
from security.risk_core.external_adapters import SPECS, _verdict, collect_external
from security.risk_core.types import CriterionStatus, ProviderVerdict


def test_google_safe_browsing_profile_distinguishes_hit_from_no_hit():
    assert _verdict({"threats": [{"threatTypes": ["SOCIAL_ENGINEERING"]}]},
                    "google_safe_browsing") == ProviderVerdict.MALICIOUS
    assert _verdict({"threats": []}, "google_safe_browsing") == ProviderVerdict.NO_HIT


def test_phishtank_requires_verified_and_valid_for_malicious():
    hit = {"results": {"in_database": True, "verified": True, "valid": True}}
    retired = {"results": {"in_database": True, "verified": True, "valid": False}}

    assert _verdict(hit, "phishtank") == ProviderVerdict.MALICIOUS
    assert _verdict(retired, "phishtank") == ProviderVerdict.NO_HIT


def test_hudson_rock_is_compromise_context_not_malicious_verdict():
    assert _verdict({"data": [{"id": "record"}]}, "hudson_rock") == (
        ProviderVerdict.SUSPICIOUS
    )
    assert _verdict({"data": []}, "hudson_rock") == ProviderVerdict.NO_HIT


def test_scored_url_provider_profiles_are_conservative():
    assert _verdict({"risk_score": 95, "phishing": True}, "ipqs") == (
        ProviderVerdict.MALICIOUS
    )
    assert _verdict({"risk_score": 0.65, "threat": False}, "phishdestroy") == (
        ProviderVerdict.SUSPICIOUS
    )
    assert _verdict({"risk_score": 0, "unsafe": False}, "ipqs") == ProviderVerdict.NO_HIT


def test_provider_config_can_enable_keyless_phishdestroy(monkeypatch):
    for spec in SPECS:
        monkeypatch.delenv(spec.endpoint_env, raising=False)
        monkeypatch.delenv(spec.key_env, raising=False)
        if spec.enable_env:
            monkeypatch.delenv(spec.enable_env, raising=False)
    monkeypatch.delenv("GOOGLE_SAFE_BROWSING_API_KEY", raising=False)

    def fake_get(url, **kwargs):
        assert url == "https://api.destroy.tools/v1/check"
        assert kwargs["params"] == {"domain": "wallet-login.example.test"}
        request = httpx.Request("GET", url)
        return httpx.Response(
            200,
            json={"threat": True, "risk_score": 0.92},
            request=request,
        )

    monkeypatch.setattr(httpx, "get", fake_get)
    evidence = collect_external(
        "https://wallet-login.example.test",
        default_config(),
        provider_config={"phishdestroy_enabled": True},
    )
    result = next(item for item in evidence if item.source_id == "64")

    assert result.status == CriterionStatus.MALICIOUS
    assert result.provider_verdict == ProviderVerdict.MALICIOUS
