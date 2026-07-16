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


SPECS = (
    ProviderSpec("51", "scamadviser", "SCAMADVISER_API_URL", "SCAMADVISER_API_KEY"),
    ProviderSpec("52", "criminal_ip", "CRIMINAL_IP_API_URL", "CRIMINAL_IP_API_KEY"),
    ProviderSpec("53", "hudson_rock", "HUDSON_ROCK_API_URL", "HUDSON_ROCK_API_KEY"),
    ProviderSpec("54", "hibp", "HIBP_API_URL", "HIBP_API_KEY"),
    ProviderSpec("55", "phishtank", "PHISHTANK_API_URL", "PHISHTANK_API_KEY"),
    ProviderSpec("56", "cyradar", "CYRADAR_API_URL", "CYRADAR_API_KEY"),
    ProviderSpec("57", "nca", "NCA_API_URL", "NCA_API_KEY"),
    ProviderSpec("58", "ncsc", "NCSC_API_URL", "NCSC_API_KEY"),
    ProviderSpec("59", "scamvn", "SCAMVN_API_URL", "SCAMVN_API_KEY"),
    ProviderSpec("60", "ipqs", "IPQS_API_URL", "IPQS_API_KEY"),
    ProviderSpec("61", "google_web_risk", "GOOGLE_WEB_RISK_API_URL", "GOOGLE_WEB_RISK_API_KEY"),
    ProviderSpec("62", "bfore", "BFORE_API_URL", "BFORE_API_KEY"),
    ProviderSpec("63", "apivoid", "APIVOID_API_URL", "APIVOID_API_KEY"),
    ProviderSpec("64", "phishdestroy", "PHISHDESTROY_API_URL", "PHISHDESTROY_API_KEY"),
)


def collect_external(url: str, config: RiskConfig, timeout: float = 4.0) -> list[EvidenceV2]:
    keys = normalize_url(url)
    source_map = {s.source_id: s for s in config.sources}
    output = []
    for spec in SPECS:
        endpoint = os.getenv(spec.endpoint_env, "").strip()
        api_key = os.getenv(spec.key_env, "").strip()
        if not endpoint or not api_key:
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
            response = httpx.get(
                endpoint,
                params={"url": url},
                headers={"Authorization": f"Bearer {api_key}", "Accept": "application/json"},
                timeout=timeout,
                follow_redirects=False,
            )
            if response.status_code == 429:
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
            verdict = _verdict(data)
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
                    str(data.get("summary", verdict.value))[:500],
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


def _verdict(data: dict[str, Any]) -> ProviderVerdict:
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
    return EvidenceV2(
        evidence_id=f"external-{spec.source_id}-{keys.exact_subject_key[:20]}",
        exact_subject_key=keys.exact_subject_key,
        campaign_subject_key=keys.campaign_subject_key,
        finding_key=make_finding_key(keys.exact_subject_key, finding, spec.slug),
        incident_key=make_incident_key(keys.campaign_subject_key, "external_reputation", "scan"),
        criterion_id=None,
        source_id=spec.source_id,
        organization_id=spec.slug,
        source_family=family,
        matched_subject=MatchedSubject.EXACT_URL,
        finding_type=finding,
        status=status,
        provider_verdict=verdict,
        severity=severity,
        evidence_quality=quality,
        match_strength=1.0,
        freshness_factor=1.0,
        authority_tier=3,
        observed_at=now,
        metadata={"summary": summary, "adapter_status": adapter_status},
    )
