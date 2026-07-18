from __future__ import annotations

import httpx

from backend.services.phone_intelligence_service import query_ipqs_phone
from shared.adapter_schemas import AdapterRunStatus, PhoneIntelligenceOutput


def test_phone_provider_is_explicitly_unavailable_without_key() -> None:
    outcome = query_ipqs_phone("+84901234567")

    assert outcome.output is None
    assert outcome.trace.status == AdapterRunStatus.NOT_CONFIGURED


def test_phone_provider_maps_abuse_and_removes_subscriber_identity() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert "secret-key" in request.url.path
        return httpx.Response(
            200,
            json={
                "success": True,
                "valid": True,
                "formatted": "+84901234567",
                "fraud_score": 96,
                "recent_abuse": True,
                "spammer": True,
                "risky": True,
                "VOIP": False,
                "prepaid": True,
                "active": True,
                "name": "Private Subscriber",
                "associated_email_addresses": {"emails": ["private@example.com"]},
                "carrier": "Example Carrier",
                "line_type": "Wireless",
                "country": "VN",
                "request_id": "req-1",
            },
        )

    outcome = query_ipqs_phone(
        "+84901234567",
        country_hint="VN",
        api_key="secret-key",
        transport=httpx.MockTransport(handler),
    )

    assert outcome.trace.status == AdapterRunStatus.COMPLETED
    assert isinstance(outcome.output, PhoneIntelligenceOutput)
    assert outcome.output.reputation == "malicious"
    assert outcome.output.metadata["country"] == "VN"
    assert "name" not in outcome.output.metadata
    assert "associated_email_addresses" not in outcome.output.metadata
    assert any(item.evidence_id == "phone_recent_abuse" for item in outcome.output.findings)


def test_phone_provider_does_not_treat_voip_alone_as_malicious() -> None:
    transport = httpx.MockTransport(
        lambda request: httpx.Response(
            200,
            json={
                "success": True,
                "valid": True,
                "fraud_score": 12,
                "recent_abuse": False,
                "spammer": False,
                "risky": False,
                "VOIP": True,
                "prepaid": False,
                "country": "VN",
            },
        )
    )

    outcome = query_ipqs_phone("+842812345678", api_key="key", transport=transport)

    assert isinstance(outcome.output, PhoneIntelligenceOutput)
    assert outcome.output.reputation == "neutral"
    assert max(item.risk_signal for item in outcome.output.findings) <= 0.12


def test_phone_provider_error_never_exposes_api_key() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError(f"failed request {request.url}", request=request)

    outcome = query_ipqs_phone(
        "+84901234567",
        api_key="super-secret-key",
        transport=httpx.MockTransport(handler),
    )

    assert outcome.trace.status == AdapterRunStatus.ERROR
    assert "super-secret-key" not in outcome.trace.error
