"""Live domain-age and public reputation intelligence for URL assessment.

Only fixed, HTTPS intelligence providers are contacted. Results are cached to avoid
repeated third-party requests and failures degrade to an explicit unavailable state.
"""
from __future__ import annotations

import threading
import time
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any
from urllib.parse import quote

import httpx

from backend.config import settings


@dataclass(frozen=True)
class DomainIntelligence:
    domain: str
    age_days: int | None
    created_at: str | None
    registrar: str | None
    reputation_status: str
    reputation_source: str
    listed: bool | None
    score: float
    reasons: tuple[str, ...]
    available: bool


class DomainIntelligenceService:
    """Query RDAP for age and URLhaus for public malicious-URL reputation."""

    def __init__(self, timeout_seconds: float = 4.0, cache_ttl_seconds: int = 3600) -> None:
        self.timeout_seconds = timeout_seconds
        self.cache_ttl_seconds = cache_ttl_seconds
        self._cache: dict[tuple[str, str], tuple[float, DomainIntelligence]] = {}
        self._lock = threading.Lock()

    def inspect(self, domain: str, url: str) -> DomainIntelligence:
        key = (domain.lower(), url)
        with self._lock:
            cached = self._cache.get(key)
            if cached and time.monotonic() - cached[0] < self.cache_ttl_seconds:
                return cached[1]

        whoisxml, whoisxml_error = self._query_whoisxml(domain)
        whois, whois_error = (None, None) if whoisxml else self._query_ip2whois(domain)
        rdap, rdap_error = (None, None) if (whoisxml or whois) else self._query_rdap(domain)
        certificates, certificate_error = (None, None) if (whoisxml or whois) else self._query_certificates(domain)
        reputation, reputation_error = self._query_reputation(domain)
        age_days, created_at = self._whoisxml_age(whoisxml)
        if age_days is None:
            age_days, created_at = self._ip2whois_age(whois)
        if age_days is None:
            age_days, created_at = self._domain_age(rdap)
        if age_days is None:
            age_days, created_at = self._certificate_age(certificates)
        registrar = self._whoisxml_registrar(whoisxml) or self._ip2whois_registrar(whois) or self._registrar(rdap)
        listed = self._reputation_listed(reputation)
        reasons: list[str] = []
        score = 0.0
        if age_days is not None:
            if age_days < 30:
                score += 0.20
                reasons.append(f"Domain mới đăng ký {age_days} ngày (<30 ngày).")
            elif age_days < 90:
                score += 0.12
                reasons.append(f"Domain mới đăng ký {age_days} ngày (<90 ngày).")
            elif age_days < 180:
                score += 0.06
                reasons.append(f"Domain còn mới: {age_days} ngày (<180 ngày).")
        if listed:
            score += 0.45
            reasons.append("Nguồn urlscan.io có kết quả đánh dấu độc hại cho domain.")
        if not reasons and (whoisxml or whois or rdap or certificates or reputation):
            reasons.append("Không phát hiện domain mới hoặc kết quả độc hại trong nguồn công khai đã truy vấn.")
        errors = [error for error in (whoisxml_error, whois_error, rdap_error, certificate_error, reputation_error) if error]
        if errors and not (whoisxml or whois or rdap or certificates or reputation):
            reasons.append("Không thể truy vấn nguồn intelligence: " + "; ".join(errors))

        result = DomainIntelligence(
            domain=domain,
            age_days=age_days,
            created_at=created_at,
            registrar=registrar,
            reputation_status="listed" if listed else "not_listed" if listed is False else "unavailable",
            reputation_source="urlscan.io",
            listed=listed,
            score=min(1.0, score),
            reasons=tuple(reasons),
            available=bool(whoisxml or whois or rdap or certificates or reputation),
        )
        with self._lock:
            self._cache[key] = (time.monotonic(), result)
        return result

    def _query_whoisxml(self, domain: str) -> tuple[dict[str, Any] | None, str | None]:
        if not settings.whoisxml_api_key:
            return None, "WHOISXML_API_KEY chưa cấu hình"
        try:
            response = httpx.post(
                "https://www.whoisxmlapi.com/whoisserver/WhoisService",
                json={
                    "domainName": domain,
                    "apiKey": settings.whoisxml_api_key,
                    "outputFormat": "JSON",
                },
                timeout=max(self.timeout_seconds, 12.0),
                headers={"Content-Type": "application/json", "Accept": "application/json"},
            )
            if response.status_code != 200:
                return None, f"WhoisXML HTTP {response.status_code}"
            data = response.json()
            if data.get("ErrorMessage"):
                return None, f"WhoisXML {data['ErrorMessage']}"
            record = data.get("WhoisRecord")
            return (record, None) if record else (None, "WhoisXML thiếu WhoisRecord")
        except Exception as exc:
            return None, f"WhoisXML {type(exc).__name__}"

    @classmethod
    def _whoisxml_age(cls, data: dict[str, Any] | None) -> tuple[int | None, str | None]:
        if not data:
            return None, None
        registry = data.get("registryData") or {}
        raw = (
            registry.get("createdDateNormalized")
            or registry.get("createdDate")
            or data.get("createdDateNormalized")
            or data.get("createdDate")
        )
        created = cls._parse_date(raw)
        if created is None:
            return None, str(raw) if raw else None
        return max(0, (datetime.now(UTC) - created).days), str(raw)

    @staticmethod
    def _whoisxml_registrar(data: dict[str, Any] | None) -> str | None:
        if not data:
            return None
        registry = data.get("registryData") or {}
        value = registry.get("registrarName") or data.get("registrarName")
        return str(value) if value else None

    def _query_ip2whois(self, domain: str) -> tuple[dict[str, Any] | None, str | None]:
        if not settings.ip2whois_api_key:
            return None, "IP2WHOIS_API_KEY chưa cấu hình"
        try:
            response = httpx.get(
                "https://api.ip2whois.com/v2",
                params={"key": settings.ip2whois_api_key, "domain": domain},
                timeout=max(self.timeout_seconds, 8.0),
                headers={"Accept": "application/json", "User-Agent": "Prewise/0.2"},
            )
            if response.status_code != 200:
                return None, f"IP2WHOIS HTTP {response.status_code}"
            data = response.json()
            error = data.get("error")
            if isinstance(error, dict):
                return None, f"IP2WHOIS {error.get('error_message') or error.get('error_code') or 'unknown error'}"
            if error or data.get("error_code"):
                return None, f"IP2WHOIS {data.get('error_message') or error or data.get('error_code')}"
            return data, None
        except Exception as exc:
            return None, f"IP2WHOIS {type(exc).__name__}"

    @staticmethod
    def _parse_date(raw: object) -> datetime | None:
        if not raw:
            return None
        value = str(raw).strip()
        if value.endswith(" UTC"):
            value = value[:-4] + "+00:00"
        candidates = (value, value.replace("Z", "+00:00"))
        for candidate in candidates:
            try:
                parsed = datetime.fromisoformat(candidate)
                return parsed.replace(tzinfo=UTC) if parsed.tzinfo is None else parsed.astimezone(UTC)
            except ValueError:
                pass
        for pattern in ("%Y-%m-%d", "%Y/%m/%d", "%d-%b-%Y", "%Y-%m-%d %H:%M:%S"):
            try:
                return datetime.strptime(value, pattern).replace(tzinfo=UTC)
            except ValueError:
                pass
        return None

    @classmethod
    def _ip2whois_age(cls, data: dict[str, Any] | None) -> tuple[int | None, str | None]:
        if not data:
            return None, None
        raw = data.get("create_date") or data.get("created_date") or data.get("createdDate")
        created = cls._parse_date(raw)
        if created is None:
            return None, str(raw) if raw else None
        return max(0, (datetime.now(UTC) - created).days), str(raw)

    @staticmethod
    def _ip2whois_registrar(data: dict[str, Any] | None) -> str | None:
        if not data:
            return None
        registrar = data.get("registrar")
        if isinstance(registrar, dict):
            return str(registrar.get("name") or registrar.get("organization") or "") or None
        return str(registrar) if registrar else None

    def _query_rdap(self, domain: str) -> tuple[dict[str, Any] | None, str | None]:
        try:
            response = httpx.get(
                f"https://rdap.org/domain/{quote(domain, safe='')}",
                timeout=self.timeout_seconds,
                follow_redirects=True,
                headers={"Accept": "application/rdap+json", "User-Agent": "Prewise/0.2"},
            )
            if response.status_code == 200:
                return response.json(), None
            return None, f"RDAP HTTP {response.status_code}"
        except Exception as exc:
            return None, f"RDAP {type(exc).__name__}"

    def _query_urlhaus(self, url: str) -> tuple[dict[str, Any] | None, str | None]:
        try:
            response = httpx.post(
                "https://urlhaus-api.abuse.ch/v1/url/",
                data={"url": url},
                timeout=self.timeout_seconds,
                headers={"User-Agent": "Prewise/0.2"},
            )
            if response.status_code == 200:
                return response.json(), None
            return None, f"URLhaus HTTP {response.status_code}"
        except Exception as exc:
            return None, f"URLhaus {type(exc).__name__}"

    def _query_certificates(self, domain: str) -> tuple[list[dict[str, Any]] | None, str | None]:
        try:
            response = httpx.get(
                "https://crt.sh/",
                params={"q": f"%.{domain}", "output": "json"},
                timeout=max(self.timeout_seconds, 8.0),
                headers={"User-Agent": "Prewise/0.2"},
            )
            if response.status_code == 200:
                return response.json(), None
            return None, f"crt.sh HTTP {response.status_code}"
        except Exception as exc:
            return None, f"crt.sh {type(exc).__name__}"

    def _query_reputation(self, domain: str) -> tuple[dict[str, Any] | None, str | None]:
        try:
            response = httpx.get(
                "https://urlscan.io/api/v1/search/",
                params={"q": f"domain:{domain}", "size": 20},
                timeout=max(self.timeout_seconds, 8.0),
                headers={"User-Agent": "Prewise/0.2"},
            )
            if response.status_code == 200:
                return response.json(), None
            return None, f"urlscan HTTP {response.status_code}"
        except Exception as exc:
            return None, f"urlscan {type(exc).__name__}"

    @staticmethod
    def _certificate_age(data: list[dict[str, Any]] | None) -> tuple[int | None, str | None]:
        dates: list[datetime] = []
        for item in data or []:
            raw = item.get("not_before") or item.get("entry_timestamp")
            if not raw:
                continue
            try:
                dates.append(datetime.fromisoformat(str(raw).replace("Z", "+00:00")).astimezone(UTC))
            except ValueError:
                continue
        if not dates:
            return None, None
        earliest = min(dates)
        return max(0, (datetime.now(UTC) - earliest).days), earliest.isoformat()

    @staticmethod
    def _reputation_listed(data: dict[str, Any] | None) -> bool | None:
        if not data:
            return None
        results = data.get("results", [])
        return any(bool(item.get("verdicts", {}).get("overall", {}).get("malicious")) for item in results)

    @staticmethod
    def _domain_age(data: dict[str, Any] | None) -> tuple[int | None, str | None]:
        if not data:
            return None, None
        for event in data.get("events", []):
            if event.get("eventAction") in {"registration", "registered"} and event.get("eventDate"):
                raw = str(event["eventDate"])
                try:
                    created = datetime.fromisoformat(raw.replace("Z", "+00:00"))
                    return max(0, (datetime.now(UTC) - created.astimezone(UTC)).days), raw
                except ValueError:
                    return None, raw
        return None, None

    @staticmethod
    def _registrar(data: dict[str, Any] | None) -> str | None:
        if not data:
            return None
        for entity in data.get("entities", []):
            if "registrar" not in entity.get("roles", []):
                continue
            for row in entity.get("vcardArray", [None, []])[1]:
                if row and row[0] == "fn" and len(row) > 3:
                    return str(row[3])
        return None


domain_intelligence_service = DomainIntelligenceService()
