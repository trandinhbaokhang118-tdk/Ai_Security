from backend.config import settings
from security.ip_intelligence import IPIntelligenceService


def test_public_ip_enrichment_parses_location_and_asn(monkeypatch):
    class Response:
        status_code = 200

        @staticmethod
        def json():
            return {
                "city_name": "Hanoi",
                "region_name": "Ha Noi",
                "country_name": "Viet Nam",
                "country_code": "VN",
                "asn": "38732",
                "as": "CMC Telecom Infrastructure Company",
                "isp": "CMC Telecom",
            }

    monkeypatch.setattr(settings, "ip_geolocation_enabled", True)
    monkeypatch.setattr("security.ip_intelligence.httpx.get", lambda *args, **kwargs: Response())
    result = IPIntelligenceService().inspect("42.96.35.96")
    assert result.available is True
    assert result.city == "Hanoi"
    assert result.asn == "AS38732"
    assert result.as_name == "CMC Telecom Infrastructure Company"


def test_private_ip_is_never_sent_to_provider(monkeypatch):
    monkeypatch.setattr(
        "security.ip_intelligence.httpx.get",
        lambda *args, **kwargs: (_ for _ in ()).throw(AssertionError("network called")),
    )
    result = IPIntelligenceService().inspect("127.0.0.1")
    assert result.available is False
    assert result.error == "non_public_ip"
