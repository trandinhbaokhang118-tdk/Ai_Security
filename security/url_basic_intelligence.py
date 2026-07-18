"""Compose URL registration, DNS and IP facts without inventing missing values."""

from __future__ import annotations

from datetime import UTC, datetime

from shared.schemas import IntelligenceSourceStatus, URLBasicIntelligence


def build_url_basic_intelligence(
    domain: str,
    domain_intelligence: object | None,
    dns_intelligence: object | None,
    ip_intelligence: object | None,
) -> URLBasicIntelligence:
    addresses = _strings(getattr(dns_intelligence, "addresses", ()))
    dns_nameservers = _hostnames(getattr(dns_intelligence, "nameservers", ()))
    registration_nameservers = _hostnames(getattr(domain_intelligence, "registration_nameservers", ()))
    nameservers = list(dict.fromkeys([*dns_nameservers, *registration_nameservers]))
    sources: list[IntelligenceSourceStatus] = []

    if dns_intelligence is not None and getattr(dns_intelligence, "available", False):
        sources.append(IntelligenceSourceStatus(source="Cloudflare DNS-over-HTTPS", status="completed"))
    else:
        detail = "; ".join(_strings(getattr(dns_intelligence, "errors", ())))
        sources.append(
            IntelligenceSourceStatus(source="Cloudflare DNS-over-HTTPS", status="unavailable", detail=detail)
        )

    registration_source = str(
        getattr(domain_intelligence, "registration_source", "") or "RDAP/WHOIS"
    )
    registration_available = bool(
        getattr(domain_intelligence, "registration_available", False)
    )
    registrant = _optional_text(getattr(domain_intelligence, "registrant", None))
    if registration_available:
        status = "completed" if registrant else "redacted"
        detail = "" if registrant else "Registrant không được registry công khai hoặc đã bị ẩn."
        sources.append(
            IntelligenceSourceStatus(source=registration_source, status=status, detail=detail)
        )
    else:
        sources.append(
            IntelligenceSourceStatus(
                source=registration_source,
                status="unavailable",
                detail=_optional_text(getattr(domain_intelligence, "registration_error", None)) or "",
            )
        )

    if ip_intelligence is None:
        sources.append(IntelligenceSourceStatus(source="IP2Location.io", status="unavailable"))
    else:
        ip_status = str(getattr(ip_intelligence, "status", "unavailable"))
        if ip_status not in {"completed", "not_configured", "unavailable"}:
            ip_status = "unavailable"
        sources.append(
            IntelligenceSourceStatus(
                source=str(getattr(ip_intelligence, "source", "IP2Location.io")),
                status=ip_status,
                detail=_optional_text(getattr(ip_intelligence, "error", None)) or "",
            )
        )

    city = _optional_text(getattr(ip_intelligence, "city", None))
    region = _optional_text(getattr(ip_intelligence, "region", None))
    country = _optional_text(getattr(ip_intelligence, "country", None))
    location = ", ".join(dict.fromkeys(part for part in (city, region, country) if part)) or None
    provider = (
        _optional_text(getattr(ip_intelligence, "as_name", None))
        or _optional_text(getattr(ip_intelligence, "isp", None))
    )
    return URLBasicIntelligence(
        domain=domain,
        ip_addresses=addresses,
        primary_ip=_optional_text(getattr(ip_intelligence, "ip", None)) or (addresses[0] if addresses else None),
        ip_location=location,
        city=city,
        region=region,
        country=country,
        country_code=_optional_text(getattr(ip_intelligence, "country_code", None)),
        asn=_optional_text(getattr(ip_intelligence, "asn", None)),
        provider=provider,
        registrar=_optional_text(getattr(domain_intelligence, "registrar", None)),
        registrant=registrant,
        registrant_phone=_optional_text(getattr(domain_intelligence, "registrant_phone", None)),
        registered_at=_optional_text(getattr(domain_intelligence, "created_at", None)),
        expires_at=_optional_text(getattr(domain_intelligence, "expires_at", None)),
        nameservers=nameservers,
        mx_records=_strings(getattr(dns_intelligence, "mx", ())),
        collected_at=datetime.now(UTC).isoformat(),
        sources=sources,
    )


def _strings(values: object) -> list[str]:
    if not isinstance(values, (list, tuple, set)):
        return []
    return [text for value in values if (text := _optional_text(value))]


def _hostnames(values: object) -> list[str]:
    return [value.lower().rstrip(".") for value in _strings(values)]


def _optional_text(value: object) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None
