"""Bounded, privacy-minimised phone reputation provider integration."""

from __future__ import annotations

import time
from typing import Any
from urllib.parse import quote

import httpx

from backend.services.adapter_registry import AdapterOutcome
from shared.adapter_schemas import (
    AdapterFinding,
    AdapterRunStatus,
    AdapterTask,
    AdapterTrace,
    PhoneIntelligenceOutput,
)


def _trace(
    started: float,
    status: AdapterRunStatus,
    *,
    error: str = "",
    risk_signal: float | None = None,
    confidence: float | None = None,
) -> AdapterTrace:
    return AdapterTrace(
        task=AdapterTask.PHONE_INTELLIGENCE,
        adapter_id="ipqs-phone-v1",
        status=status,
        latency_ms=round((time.perf_counter() - started) * 1000, 2),
        risk_signal=risk_signal,
        confidence=confidence,
        error=error[:300],
        scoring_mode="active" if status == AdapterRunStatus.COMPLETED else "none",
    )


def query_ipqs_phone(
    phone_number: str,
    *,
    country_hint: str = "",
    api_key: str = "",
    endpoint: str = "https://www.ipqualityscore.com/api/json/phone",
    timeout_seconds: float = 8.0,
    transport: httpx.BaseTransport | None = None,
) -> AdapterOutcome:
    """Query IPQS without exposing the API key or subscriber identity fields."""

    started = time.perf_counter()
    if not api_key:
        return AdapterOutcome(
            trace=_trace(
                started,
                AdapterRunStatus.NOT_CONFIGURED,
                error="IPQS phone API key is not configured",
            )
        )
    if not endpoint.startswith("https://"):
        return AdapterOutcome(
            trace=_trace(started, AdapterRunStatus.INCOMPATIBLE, error="phone endpoint must use HTTPS")
        )

    normalized = "".join(char for char in phone_number if char.isdigit() or char == "+")
    if len("".join(char for char in normalized if char.isdigit())) < 3:
        return AdapterOutcome(
            trace=_trace(started, AdapterRunStatus.INVALID_SCHEMA, error="invalid phone number")
        )

    params: list[tuple[str, str | int]] = [("strictness", 1)]
    hint = country_hint.strip().upper()
    if hint:
        params.append(("country[]", hint[:2]))
    target = f"{endpoint.rstrip('/')}/{quote(api_key, safe='')}/{quote(normalized, safe='+')}"
    try:
        with httpx.Client(
            timeout=max(1.0, min(float(timeout_seconds), 20.0)),
            follow_redirects=False,
            transport=transport,
        ) as client:
            response = client.get(target, params=params, headers={"Accept": "application/json"})
        response.raise_for_status()
        data = response.json()
        if not isinstance(data, dict):
            raise TypeError("provider response must be an object")
        if not data.get("success"):
            message = str(data.get("message") or "provider rejected the request")
            if api_key:
                message = message.replace(api_key, "[redacted]")
            return AdapterOutcome(
                trace=_trace(started, AdapterRunStatus.ERROR, error=message)
            )

        fraud_score = max(0.0, min(float(data.get("fraud_score") or 0), 100.0))
        recent_abuse = data.get("recent_abuse") is True
        spammer = data.get("spammer") is True
        risky = data.get("risky") is True
        voip = data.get("VOIP") is True or data.get("voip") is True
        prepaid = data.get("prepaid") is True
        valid = data.get("valid") is True

        findings: list[AdapterFinding] = []
        if recent_abuse or spammer:
            findings.append(AdapterFinding(
                evidence_id="phone_recent_abuse",
                category="phone_reputation",
                summary="Nguồn đối chứng ghi nhận dấu hiệu lạm dụng hoặc phát tán rác gần đây.",
                severity="high",
                risk_signal=max(0.75, fraud_score / 100),
                attributes={"recent_abuse": recent_abuse, "spammer": spammer},
            ))
        elif fraud_score >= 75 or risky:
            findings.append(AdapterFinding(
                evidence_id="phone_elevated_fraud_score",
                category="phone_reputation",
                summary="Số gửi có điểm gian lận cao từ nguồn đối chứng.",
                severity="high" if fraud_score >= 85 else "medium",
                risk_signal=max(0.55, fraud_score / 100),
                attributes={"fraud_score": fraud_score},
            ))
        if voip or prepaid:
            findings.append(AdapterFinding(
                evidence_id="phone_line_type",
                category="phone_line_type",
                summary="Số gửi sử dụng loại thuê bao ảo hoặc trả trước; đây chỉ là dấu hiệu phụ.",
                severity="low",
                risk_signal=0.12,
                attributes={"voip": voip, "prepaid": prepaid},
            ))
        if not valid:
            findings.append(AdapterFinding(
                evidence_id="phone_invalid",
                category="phone_validity",
                summary="Số điện thoại không được nguồn đối chứng xác nhận là hợp lệ.",
                severity="low",
                risk_signal=0.10,
                attributes={"valid": False},
            ))

        strongest = max((item.risk_signal for item in findings), default=0.0)
        if (recent_abuse or spammer) and fraud_score >= 90:
            reputation = "malicious"
        elif recent_abuse or spammer or fraud_score >= 75 or risky:
            reputation = "suspicious"
        elif valid:
            reputation = "neutral"
        else:
            reputation = "unknown"
        safe_metadata: dict[str, Any] = {
            "valid": valid,
            "formatted": str(data.get("formatted") or "")[:40],
            "country": str(data.get("country") or "")[:10],
            "carrier": str(data.get("carrier") or "")[:100],
            "line_type": str(data.get("line_type") or "")[:50],
            "active": data.get("active") if isinstance(data.get("active"), bool) else None,
            "fraud_score": fraud_score,
            "recent_abuse": recent_abuse,
            "spammer": spammer,
            "voip": voip,
            "prepaid": prepaid,
            "request_id": str(data.get("request_id") or "")[:100],
        }
        output = PhoneIntelligenceOutput(
            provider="IPQualityScore",
            provider_status="completed",
            reputation=reputation,
            confidence=0.85 if valid or findings else 0.65,
            metadata=safe_metadata,
            findings=findings,
        )
        return AdapterOutcome(
            trace=_trace(
                started,
                AdapterRunStatus.COMPLETED,
                risk_signal=strongest,
                confidence=output.confidence,
            ),
            output=output,
        )
    except httpx.TimeoutException:
        return AdapterOutcome(
            trace=_trace(started, AdapterRunStatus.TIMEOUT, error="phone provider timed out")
        )
    except httpx.HTTPStatusError as exc:
        return AdapterOutcome(
            trace=_trace(
                started,
                AdapterRunStatus.ERROR,
                error=f"phone provider returned HTTP {exc.response.status_code}",
            )
        )
    except (httpx.HTTPError, TypeError, ValueError) as exc:
        return AdapterOutcome(
            trace=_trace(
                started,
                AdapterRunStatus.ERROR,
                error=f"phone provider failed: {type(exc).__name__}",
            )
        )
