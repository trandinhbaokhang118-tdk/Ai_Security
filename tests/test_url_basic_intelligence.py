from security.dns_intelligence import DNSIntelligence
from security.domain_intelligence import DomainIntelligence
from security.ip_intelligence import IPIntelligence
from security.url_basic_intelligence import build_url_basic_intelligence


def test_basic_url_intelligence_combines_dns_registration_and_ip():
    domain = DomainIntelligence(
        domain="example.vn",
        age_days=100,
        created_at="2026-01-25T00:00:00Z",
        registrar="GMO-Z.com RUNSYSTEM",
        reputation_status="not_listed",
        reputation_source="urlscan.io",
        listed=False,
        score=0,
        reasons=(),
        available=True,
        expires_at="2027-01-25T00:00:00Z",
        registrant="Nguyễn Thành Đạt",
        registration_nameservers=("ns-a1.tenten.vn", "ns-a2.tenten.vn"),
        registration_source="RDAP",
        registration_available=True,
    )
    dns = DNSIntelligence(
        "example.vn",
        ("42.96.35.96",),
        ("ns-a1.tenten.vn",),
        ("mx.example.vn",),
        True,
        True,
        False,
        True,
        (),
    )
    ip = IPIntelligence(
        ip="42.96.35.96",
        city="Hanoi",
        country="Viet Nam",
        asn="AS38732",
        as_name="CMC Telecom Infrastructure Company",
        available=True,
        status="completed",
    )
    result = build_url_basic_intelligence("example.vn", domain, dns, ip)
    assert result.primary_ip == "42.96.35.96"
    assert result.ip_location == "Hanoi, Viet Nam"
    assert result.provider == "CMC Telecom Infrastructure Company"
    assert result.registrant == "Nguyễn Thành Đạt"
    assert result.nameservers == ["ns-a1.tenten.vn", "ns-a2.tenten.vn"]
    assert [source.status for source in result.sources] == ["completed", "completed", "completed"]


def test_redacted_owner_stays_null():
    domain = DomainIntelligence(
        domain="example.com",
        age_days=None,
        created_at=None,
        registrar=None,
        reputation_status="unavailable",
        reputation_source="urlscan.io",
        listed=None,
        score=0,
        reasons=(),
        available=False,
        registration_available=True,
    )
    result = build_url_basic_intelligence("example.com", domain, None, None)
    assert result.registrant is None
    assert result.sources[1].status == "redacted"
