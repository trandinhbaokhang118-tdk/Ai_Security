import json

import httpx

from security import misp_adapter
from security.misp_adapter import collect_misp


def test_disabled_misp_reports_unavailable_without_network():
    evidence = collect_misp(
        "https://example.test",
        enabled=False,
        base_url="",
        api_key="",
    )

    assert evidence[0].metadata["adapter_status"] == "disabled"
    assert evidence[0].eligible_for_external_score is False


def test_misp_exact_url_hit_becomes_malicious_evidence(monkeypatch):
    def handler(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content)
        if body["type"] == "url":
            return httpx.Response(
                200,
                json={
                    "response": [
                        {
                            "Attribute": {
                                "id": "42",
                                "uuid": "test-attribute",
                                "event_id": "7",
                                "type": "url",
                                "category": "Network activity",
                            }
                        }
                    ]
                },
            )
        return httpx.Response(200, json={"response": []})

    monkeypatch.setattr(
        misp_adapter,
        "_client",
        lambda **_: httpx.Client(transport=httpx.MockTransport(handler)),
    )
    evidence = collect_misp(
        "https://malicious.example/login",
        enabled=True,
        base_url="https://misp.example.test",
        api_key="secret",
    )

    assert evidence[0].metadata["checks"][0]["status"] == "danger"
    assert evidence[1].finding_type == "misp_exact_url_match"
    assert evidence[1].severity == 0.98
