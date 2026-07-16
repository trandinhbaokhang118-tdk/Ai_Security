"""Bounded DNS-over-HTTPS collector for current DNS and email-security posture."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import httpx


@dataclass(frozen=True)
class DNSIntelligence:
    domain: str
    addresses: tuple[str, ...]
    nameservers: tuple[str, ...]
    mx: tuple[str, ...]
    spf: bool
    dmarc: bool
    dkim_observed: bool
    available: bool
    errors: tuple[str, ...]


class DNSIntelligenceService:
    ENDPOINT = "https://cloudflare-dns.com/dns-query"

    def __init__(self, timeout_seconds: float = 4.0) -> None:
        self.timeout_seconds = timeout_seconds

    def inspect(self, domain: str) -> DNSIntelligence:
        records: dict[str, list[str]] = {}
        errors: list[str] = []
        for name, kind in ((domain, "A"), (domain, "AAAA"), (domain, "NS"),
                           (domain, "MX"), (domain, "TXT"), (f"_dmarc.{domain}", "TXT"),
                           (f"default._domainkey.{domain}", "TXT")):
            values, error = self._query(name, kind)
            records[f"{name}:{kind}"] = values
            if error:
                errors.append(error)
        root_txt = records[f"{domain}:TXT"]
        dmarc_txt = records[f"_dmarc.{domain}:TXT"]
        dkim_txt = records[f"default._domainkey.{domain}:TXT"]
        addresses = (*records[f"{domain}:A"], *records[f"{domain}:AAAA"])
        return DNSIntelligence(
            domain=domain,
            addresses=tuple(sorted(set(addresses))),
            nameservers=tuple(sorted(set(records[f"{domain}:NS"]))),
            mx=tuple(sorted(set(records[f"{domain}:MX"]))),
            spf=any("v=spf1" in value.lower() for value in root_txt),
            dmarc=any("v=dmarc1" in value.lower() for value in dmarc_txt),
            dkim_observed=any("v=dkim1" in value.lower() or "p=" in value.lower() for value in dkim_txt),
            available=bool(addresses or records[f"{domain}:NS"]),
            errors=tuple(errors),
        )

    def _query(self, name: str, kind: str) -> tuple[list[str], str | None]:
        try:
            response = httpx.get(self.ENDPOINT, params={"name": name, "type": kind},
                                 headers={"Accept": "application/dns-json"},
                                 timeout=self.timeout_seconds, follow_redirects=False)
            response.raise_for_status()
            payload: dict[str, Any] = response.json()
            if int(payload.get("Status", -1)) not in {0, 3}:
                return [], f"DNS {name}/{kind} status {payload.get('Status')}"
            return [str(item.get("data", "")).strip('"') for item in payload.get("Answer", [])
                    if item.get("data")], None
        except (httpx.HTTPError, ValueError, TypeError) as exc:
            return [], f"DNS {name}/{kind}: {type(exc).__name__}"


dns_intelligence_service = DNSIntelligenceService()
