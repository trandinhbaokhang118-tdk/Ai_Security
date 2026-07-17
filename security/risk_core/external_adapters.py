"""External CoreGuide providers 51..64 with explicit unavailable/no-hit semantics.

Adapters are enabled only when a fixed HTTPS endpoint is configured. Provider errors
never become no_hit. Generic JSON extraction is intentionally conservative and each
provider can be specialized without changing Risk Engine ordering.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any
from urllib.parse import quote, urlsplit

import httpx

from .config import RiskConfig
from .normalization import make_finding_key, make_incident_key, normalize_url
from .types import CriterionStatus, EvidenceV2, MatchedSubject, ProviderVerdict


@dataclass(frozen=True)
class ProviderSpec:
    source_id: str
    slug: str
    endpoint_env: str
    key_env: str
    profile: str = "generic"
    default_endpoint: str = ""
    enable_env: str = ""
    key_optional: bool = False


SPECS = (
    ProviderSpec("51", "scamadviser", "SCAMADVISER_API_URL", "SCAMADVISER_API_KEY"),
    ProviderSpec("52", "criminal_ip", "CRIMINAL_IP_API_URL", "CRIMINAL_IP_API_KEY"),
    ProviderSpec(
        "53",
        "hudson_rock",
        "HUDSON_ROCK_API_URL",
        "HUDSON_ROCK_API_KEY",
        profile="hudson_rock",
        default_endpoint="https://api.hudsonrock.com/json/v3/search-by-domain",
    ),
    ProviderSpec("54", "hibp", "HIBP_API_URL", "HIBP_API_KEY"),
    ProviderSpec(
        "55",
        "phishtank",
        "PHISHTANK_API_URL",
        "PHISHTANK_API_KEY",
        profile="phishtank",
        default_endpoint="https://checkurl.phishtank.com/checkurl/",
        enable_env="PHISHTANK_ENABLED",
        key_optional=True,
    ),
    ProviderSpec("56", "cyradar", "CYRADAR_API_URL", "CYRADAR_API_KEY"),
    ProviderSpec("57", "nca", "NCA_API_URL", "NCA_API_KEY"),
    ProviderSpec("58", "ncsc", "NCSC_API_URL", "NCSC_API_KEY"),
    ProviderSpec("59", "scamvn", "SCAMVN_API_URL", "SCAMVN_API_KEY"),
    ProviderSpec(
        "60",
        "ipqs",
        "IPQS_API_URL",
        "IPQS_API_KEY",
        profile="ipqs",
        default_endpoint="https://www.ipqualityscore.com/api/json/url",
    ),
    ProviderSpec(
        "61",
        "google_web_risk",
        "GOOGLE_WEB_RISK_API_URL",
        "GOOGLE_WEB_RISK_API_KEY",
        profile="google_safe_browsing",
        default_endpoint="https://safebrowsing.googleapis.com/v5/urls:search",
    ),
    ProviderSpec("62", "bfore", "BFORE_API_URL", "BFORE_API_KEY"),
    ProviderSpec(
        "63",
        "apivoid",
        "APIVOID_API_URL",
        "APIVOID_API_KEY",
        profile="apivoid",
        default_endpoint="https://api.apivoid.com/v2/url-reputation",
    ),
    ProviderSpec(
        "64",
        "phishdestroy",
        "PHISHDESTROY_API_URL",
        "PHISHDESTROY_API_KEY",
        profile="phishdestroy",
        default_endpoint="https://api.destroy.tools/v1/check",
        enable_env="PHISHDESTROY_ENABLED",
        key_optional=True,
    ),
)


def collect_external(
    url: str,
    config: RiskConfig,
    timeout: float = 4.0,
    provider_config: dict[str, Any] | None = None,
) -> list[EvidenceV2]:
    keys = normalize_url(url)
    source_map = {s.source_id: s for s in config.sources}
    output = []
    for spec in SPECS:
        endpoint_override = _config_value(spec.endpoint_env, provider_config)
        api_key = _config_value(spec.key_env, provider_config)
        if spec.profile == "google_safe_browsing" and not api_key:
            api_key = _config_value("GOOGLE_SAFE_BROWSING_API_KEY", provider_config)
        explicitly_enabled = (
            _truthy(_config_value(spec.enable_env, provider_config)) if spec.enable_env else False
        )
        endpoint = endpoint_override or spec.default_endpoint
        enabled = bool(endpoint_override or api_key or explicitly_enabled)
        if not endpoint or not enabled or (not spec.key_optional and not api_key):
            output.append(
                _result(
                    keys,
                    spec,
                    source_map[spec.source_id].family,
                    ProviderVerdict.UNKNOWN,
                    CriterionStatus.NOT_CHECKED,
                    0,
                    0,
                    "Provider is not configured.",
                    "not_configured",
                )
            )
            continue
        if not endpoint.startswith("https://"):
            raise ValueError(f"{spec.endpoint_env} must use HTTPS")
        try:
            response = _request_provider(spec, endpoint, api_key, url, timeout)
            if response.status_code in {429, 509}:
                output.append(
                    _result(
                        keys,
                        spec,
                        source_map[spec.source_id].family,
                        ProviderVerdict.UNAVAILABLE,
                        CriterionStatus.UNAVAILABLE,
                        0,
                        0,
                        "Provider rate limited the request.",
                        "rate_limited",
                    )
                )
                continue
            response.raise_for_status()
            data = response.json()
            if not isinstance(data, dict):
                raise TypeError("Provider response must be a JSON object")
            verdict = _verdict(data, spec.profile)
            severity = (
                1.0
                if verdict == ProviderVerdict.MALICIOUS
                else 0.5
                if verdict == ProviderVerdict.SUSPICIOUS
                else 0
            )
            if verdict == ProviderVerdict.MALICIOUS:
                status = CriterionStatus.MALICIOUS
            elif verdict == ProviderVerdict.SUSPICIOUS:
                status = CriterionStatus.SUSPICIOUS
            elif verdict == ProviderVerdict.CLEAN:
                status = CriterionStatus.CLEAN
            else:
                status = CriterionStatus.NOT_CHECKED
            output.append(
                _result(
                    keys,
                    spec,
                    source_map[spec.source_id].family,
                    verdict,
                    status,
                    severity,
                    0.8 if severity else 0,
                    _summary(data, spec.profile, verdict),
                    "completed",
                )
            )
        except (httpx.HTTPError, ValueError, TypeError) as exc:
            output.append(
                _result(
                    keys,
                    spec,
                    source_map[spec.source_id].family,
                    ProviderVerdict.UNAVAILABLE,
                    CriterionStatus.UNAVAILABLE,
                    0,
                    0,
                    f"Provider unavailable: {type(exc).__name__}",
                    "provider_error",
                )
            )
    return output


def _truthy(value: str) -> bool:
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _config_value(name: str, provider_config: dict[str, Any] | None) -> str:
    environment_value = os.getenv(name, "").strip()
    if environment_value:
        return environment_value
    if not provider_config:
        return ""
    return str(provider_config.get(name.lower(), "") or "").strip()


def _request_provider(
    spec: ProviderSpec,
    endpoint: str,
    api_key: str,
    url: str,
    timeout: float,
) -> httpx.Response:
    common: dict[str, Any] = {
        "timeout": timeout,
        "follow_redirects": False,
    }
    if spec.profile == "google_safe_browsing":
        return httpx.get(endpoint, params={"key": api_key, "urls": url}, **common)
    if spec.profile == "phishtank":
        form = {"url": url, "format": "json"}
        if api_key:
            form["app_key"] = api_key
        return httpx.post(
            endpoint,
            data=form,
            headers={"User-Agent": "ai-security-armor/url-scanner", "Accept": "application/json"},
            **common,
        )
    if spec.profile == "hudson_rock":
        host = urlsplit(url if "://" in url else f"https://{url}").hostname or ""
        return httpx.post(
            endpoint,
            json={"domains": [host]},
            headers={"api-key": api_key, "Accept": "application/json"},
            **common,
        )
    if spec.profile == "ipqs":
        target = f"{endpoint.rstrip('/')}/{quote(api_key, safe='')}/{quote(url, safe='')}"
        return httpx.get(target, **common)
    if spec.profile == "apivoid":
        return httpx.post(
            endpoint,
            json={"url": url},
            headers={"X-API-Key": api_key, "Accept": "application/json"},
            **common,
        )
    if spec.profile == "phishdestroy":
        host = urlsplit(url if "://" in url else f"https://{url}").hostname or ""
        return httpx.get(endpoint, params={"domain": host}, **common)
    return httpx.get(
        endpoint,
        params={"url": url},
        headers={"Authorization": f"Bearer {api_key}", "Accept": "application/json"},
        **common,
    )


def _verdict(data: dict[str, Any], profile: str = "generic") -> ProviderVerdict:
    if profile == "google_safe_browsing":
        return ProviderVerdict.MALICIOUS if data.get("threats") else ProviderVerdict.NO_HIT
    if profile == "phishtank":
        result = data.get("results") if isinstance(data.get("results"), dict) else data
        if _as_bool(result.get("valid")) and _as_bool(result.get("verified")):
            return ProviderVerdict.MALICIOUS
        if _as_bool(result.get("in_database")):
            if _as_bool(result.get("verified")):
                return ProviderVerdict.NO_HIT
            return ProviderVerdict.SUSPICIOUS
        return ProviderVerdict.NO_HIT
    if profile == "hudson_rock":
        records = data.get("data")
        return ProviderVerdict.SUSPICIOUS if isinstance(records, list) and records else ProviderVerdict.NO_HIT

    phishing = _lookup(data, "phishing")
    malware = _lookup(data, "malware")
    unsafe = _lookup(data, "unsafe")
    suspicious = _lookup(data, "suspicious")
    threat = _lookup(data, "threat")
    raw_risk_score = _lookup(data, "risk_score")
    if raw_risk_score is None:
        raw_risk_score = _lookup(data, "riskScore")
    risk_score = _number(raw_risk_score)
    if 0 < risk_score <= 1:
        risk_score *= 100
    if _as_bool(phishing) or _as_bool(malware) or risk_score >= 90:
        return ProviderVerdict.MALICIOUS
    if _as_bool(unsafe) or _as_bool(suspicious) or _as_bool(threat) or risk_score >= 50:
        return ProviderVerdict.SUSPICIOUS
    if profile in {"ipqs", "apivoid", "phishdestroy"}:
        return ProviderVerdict.NO_HIT

    raw = str(data.get("verdict", data.get("status", "unknown"))).lower()
    if raw in {"malicious", "phishing", "malware", "unsafe", "listed"}:
        return ProviderVerdict.MALICIOUS
    if raw in {"suspicious", "warning", "risky"}:
        return ProviderVerdict.SUSPICIOUS
    if raw in {"clean", "safe", "benign"}:
        return ProviderVerdict.CLEAN
    if raw in {"no_hit", "not_found", "unlisted"}:
        return ProviderVerdict.NO_HIT
    return ProviderVerdict.UNKNOWN


def _lookup(data: dict[str, Any], key: str) -> Any:
    if key in data:
        return data[key]
    for value in data.values():
        if isinstance(value, dict):
            found = _lookup(value, key)
            if found is not None:
                return found
    return None


def _as_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {"1", "true", "yes", "listed", "active"}


def _number(value: Any) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _summary(
    data: dict[str, Any], profile: str, verdict: ProviderVerdict
) -> str:
    if profile == "hudson_rock":
        if verdict == ProviderVerdict.SUSPICIOUS:
            return "Infostealer/breach exposure was found for the domain; this is not a malicious-URL verdict."
        return "No infostealer exposure record was returned for the domain."
    summary = _lookup(data, "summary")
    return str(summary if summary is not None else verdict.value)[:500]


def _result(
    keys: Any,
    spec: ProviderSpec,
    family: str,
    verdict: ProviderVerdict,
    status: CriterionStatus,
    severity: float,
    quality: float,
    summary: str,
    adapter_status: str,
) -> EvidenceV2:
    now = datetime.now(UTC).isoformat()
    finding = f"external_{spec.slug}"
    if verdict == ProviderVerdict.MALICIOUS and spec.profile in {
        "google_safe_browsing",
        "phishtank",
    }:
        finding += "_known_malicious"
    domain_context = spec.profile == "hudson_rock"
    finding_subject_key = (
        keys.registrable_domain_key if domain_context else keys.exact_subject_key
    )
    return EvidenceV2(
        evidence_id=f"external-{spec.source_id}-{keys.exact_subject_key[:20]}",
        exact_subject_key=keys.exact_subject_key,
        campaign_subject_key=keys.campaign_subject_key,
        finding_key=make_finding_key(finding_subject_key, finding, spec.slug),
        incident_key=make_incident_key(keys.campaign_subject_key, "external_reputation", "scan"),
        criterion_id=None,
        source_id=spec.source_id,
        organization_id=spec.slug,
        source_family=family,
        matched_subject=(MatchedSubject.EXACT_DOMAIN if domain_context else MatchedSubject.EXACT_URL),
        finding_type=finding,
        status=status,
        provider_verdict=verdict,
        severity=severity,
        evidence_quality=quality,
        match_strength=0.7 if domain_context else 1.0,
        freshness_factor=1.0,
        authority_tier=3,
        observed_at=now,
        metadata={
            "summary": summary,
            "adapter_status": adapter_status,
            "evidence_kind": "compromise_exposure" if domain_context else "url_reputation",
        },
    )
