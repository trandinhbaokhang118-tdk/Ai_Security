"""Cached public-IP geolocation and ASN enrichment for URL reports."""

from __future__ import annotations

import ipaddress
import threading
import time
from dataclasses import dataclass
from typing import Any

import httpx

from backend.config import settings


@dataclass(frozen=True)
class IPIntelligence:
    ip: str
    city: str | None = None
    region: str | None = None
    country: str | None = None
    country_code: str | None = None
    asn: str | None = None
    as_name: str | None = None
    isp: str | None = None
    source: str = "IP2Location.io"
    available: bool = False
    status: str = "unavailable"
    error: str | None = None


class IPIntelligenceService:
    """Resolve only globally routable IP literals through a fixed HTTPS API."""

    endpoint = "https://api.ip2location.io/"

    def __init__(self) -> None:
        self._cache: dict[str, tuple[float, IPIntelligence]] = {}
        self._lock = threading.Lock()

    def inspect(self, raw_ip: str) -> IPIntelligence:
        try:
            address = ipaddress.ip_address(raw_ip.strip())
        except ValueError:
            return IPIntelligence(ip=raw_ip, error="invalid_ip")
        ip = address.compressed
        if not address.is_global:
            return IPIntelligence(ip=ip, error="non_public_ip")
        if not settings.ip_geolocation_enabled:
            return IPIntelligence(ip=ip, status="not_configured", error="disabled")

        with self._lock:
            cached = self._cache.get(ip)
            if cached and time.monotonic() - cached[0] < settings.ip_geolocation_cache_ttl_seconds:
                return cached[1]

        result = self._query(ip)
        with self._lock:
            self._cache[ip] = (time.monotonic(), result)
        return result

    def _query(self, ip: str) -> IPIntelligence:
        headers = {"Accept": "application/json", "User-Agent": "Prewise/0.2"}
        if settings.ip2location_api_key:
            headers["Authorization"] = f"Bearer {settings.ip2location_api_key}"
        try:
            response = httpx.get(
                self.endpoint,
                params={"ip": ip},
                headers=headers,
                timeout=settings.ip_geolocation_timeout_seconds,
            )
            if response.status_code != 200:
                return IPIntelligence(ip=ip, error=f"http_{response.status_code}")
            data = response.json()
            if not isinstance(data, dict):
                return IPIntelligence(ip=ip, error="invalid_response")
            error = self._error(data)
            if error:
                return IPIntelligence(ip=ip, error=error)
            asn = self._text(data.get("asn"))
            if asn and not asn.upper().startswith("AS"):
                asn = f"AS{asn}"
            return IPIntelligence(
                ip=ip,
                city=self._text(data.get("city_name")),
                region=self._text(data.get("region_name")),
                country=self._text(data.get("country_name")),
                country_code=self._text(data.get("country_code")),
                asn=asn,
                as_name=self._text(data.get("as")),
                isp=self._text(data.get("isp")),
                available=True,
                status="completed",
            )
        except Exception as exc:
            return IPIntelligence(ip=ip, error=type(exc).__name__)

    @staticmethod
    def _text(value: Any) -> str | None:
        if value is None:
            return None
        text = str(value).strip()
        return text or None

    @classmethod
    def _error(cls, data: dict[str, Any]) -> str | None:
        value = data.get("error") or data.get("error_message")
        if isinstance(value, dict):
            value = value.get("error_message") or value.get("message") or value.get("error_code")
        return cls._text(value)


ip_intelligence_service = IPIntelligenceService()
