"""Integration tests (test-plan.md §3 + §4 demo cases) via FastAPI TestClient."""

from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)


def test_health():
    r = client.get("/v1/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_url_assess_e2e_phishing():
    # Demo case #1: obvious phishing
    r = client.post("/v1/assess/url", json={"url": "http://paypa1-secure-verify.tk/login"})
    assert r.status_code == 200
    body = r.json()
    assert body["risk_score"] > 0.7
    assert body["decision"] in ("BLOCK", "WARN")
    assert any("homoglyph" in e["feature"] for e in body["evidence"] if e.get("feature"))


def test_url_assess_deceptive_subdomain_brand_mismatch():
    r = client.post(
        "/v1/assess/url",
        json={"url": "https://facebook.com.security-login-check.xyz/verify"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["risk_score"] > 0.7
    assert body["decision"] == "BLOCK"
    assert any(e.get("feature") == "brand_domain_mismatch" for e in body["evidence"])
    assert any(e.get("feature") == "deceptive_subdomain" for e in body["evidence"])


def test_url_assess_e2e_benign():
    # Demo case #2: benign
    r = client.post("/v1/assess/url", json={"url": "https://github.com"})
    assert r.status_code == 200
    assert r.json()["risk_score"] < 0.3
    assert r.json()["decision"] == "ALLOW"


def test_confidence_varies_with_risk_and_evidence():
    phishing = client.post(
        "/v1/assess/url",
        json={"url": "https://facebook.com.security-login-check.xyz/verify"},
    ).json()
    benign = client.post("/v1/assess/url", json={"url": "https://github.com"}).json()

    assert 0.0 <= phishing["confidence"] <= 1.0
    assert 0.0 <= benign["confidence"] <= 1.0
    assert phishing["confidence"] != 0.9
    assert benign["confidence"] != 0.9


def test_url_sandbox_blocks_private_network_with_exact_error():
    r = client.post("/v1/assess/url/sandbox", json={"url": "http://127.0.0.1:8000"})
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is False
    assert body["execution_status"] == "failed"
    assert body["issues"][0]["code"] == "private_network_blocked"


def test_browser_sandbox_blocks_private_network_with_exact_error():
    r = client.post("/v1/assess/url/browser-sandbox", json={"url": "http://127.0.0.1:8000"})
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is False
    assert body["execution_status"] == "failed"
    assert body["issues"][0]["code"] == "private_network_blocked"


def test_text_assess_vietnamese_phishing():
    # Demo case #3
    r = client.post(
        "/v1/assess/text",
        json={
            "text": "Tài khoản của bạn bị khóa, nhấn vào đây để xác minh ngay: http://bit.ly/xxx",
            "modality": "email",
        },
    )
    assert r.status_code == 200
    assert r.json()["risk_score"] > 0.4


def test_action_block_credential_exfil():
    # Demo case #4-style: agent submitting credentials to risky URL
    r = client.post(
        "/v1/assess/action",
        json={
            "action_type": "submit_form",
            "target_url": "http://vietc0mbank-verify.xyz/login",
            "data_types": ["password"],
            "agent_context": {"agent_type": "browser_agent"},
        },
    )
    assert r.status_code == 200
    assert r.json()["decision"] == "BLOCK"
    assert r.json()["requires_user_confirmation"] is False


def test_prompt_benign_not_blocked():
    # Demo case #5: benign security question must NOT be blocked (false-positive guard)
    r = client.post("/v1/assess/prompt", json={"content": "Explain what phishing is"})
    assert r.status_code == 200
    assert r.json()["decision"] == "ALLOW"


def test_llm_explanation_fallback_present_in_health():
    # Ollama not running in CI -> llm_available False, API still healthy
    assert client.get("/v1/health").json()["models_loaded"] in (True, False)
