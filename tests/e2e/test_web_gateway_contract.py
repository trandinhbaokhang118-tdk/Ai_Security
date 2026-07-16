"""E2E contract test: web RealApiClient request shapes <-> live gateway.

Uses the FastAPI TestClient to drive the EXACT JSON bodies that
frontend/web/lib/api/real.ts sends, verifying the web app and backend agree on the
contract (the bug class that breaks E2E). Also exercises the WebSocket chat flow the
useChatSession hook relies on.
"""

from __future__ import annotations

import json

from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)


def test_assess_url_contract_matches_web_client():
    # real.ts assessUrl -> POST /v1/assess/url {url, context:""}
    r = client.post("/v1/assess/url", json={"url": "http://paypa1-verify.tk/login", "context": ""})
    assert r.status_code == 200
    body = r.json()
    # Fields the web mapAssessResponse() reads:
    for key in ("risk_score", "risk_level", "confidence", "reasons", "evidence", "request_id"):
        assert key in body
    assert 0.0 <= body["risk_score"] <= 1.0
    assert body["decision"] == "BLOCK"


def test_assess_text_contract_matches_web_client():
    # real.ts assessText -> POST /v1/assess/text {text, modality, metadata}
    r = client.post(
        "/v1/assess/text",
        json={
            "text": "Tài khoản bị khóa, xác minh ngay: http://bit.ly/x",
            "modality": "email",
            "metadata": {"sender": "noreply@x.com"},
        },
    )
    assert r.status_code == 200
    assert r.json()["risk_score"] > 0.4


def test_ws_chat_flow_matches_useChatSession():
    # useChatSession sends {question, context:{content,modality}, history}
    # and expects {type:"delta",delta} chunks then {type:"final", assessment}.
    with client.websocket_connect("/v1/chat") as ws:
        ws.send_text(
            json.dumps(
                {
                    "question": "URL này có an toàn không?",
                    "context": {"content": "http://vietc0mbank-verify.xyz/login",
                                "modality": "url"},
                    "history": [],
                }
            )
        )
        saw_delta = False
        assessment = None
        for _ in range(200):
            msg = json.loads(ws.receive_text())
            if msg["type"] == "delta":
                saw_delta = True
            elif msg["type"] == "final":
                assessment = msg.get("assessment")
                break
            elif msg["type"] == "error":
                raise AssertionError(f"WS error: {msg}")
        assert saw_delta, "expected streaming delta tokens"
        assert assessment is not None
        assert assessment["risk_score"] > 0.7
        assert assessment["decision"] == "BLOCK"


def test_health_contract():
    body = client.get("/v1/health").json()
    assert set(("status", "models_loaded", "llm_available", "model_status", "version")).issubset(
        body
    )
    assert "models" in body["model_status"]
