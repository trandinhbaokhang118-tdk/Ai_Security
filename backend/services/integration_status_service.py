"""Provider-safe capability status for optional external integrations."""

from __future__ import annotations

import shutil
from typing import Any

from backend.config import Settings


def _state(
    *,
    configured: bool,
    ready: bool | None = None,
    missing: list[str] | None = None,
    mode: str = "optional",
    note: str = "",
) -> dict[str, Any]:
    effective_ready = configured if ready is None else ready
    if effective_ready:
        status = "ready"
    elif configured:
        status = "unavailable"
    else:
        status = "not_configured"
    return {
        "status": status,
        "configured": configured,
        "ready": effective_ready,
        "mode": mode,
        "missing": missing or [],
        "note": note,
    }


def integration_status(
    settings: Settings,
    *,
    clamav_is_ready: bool = False,
    cloud_sandbox_is_configured: bool | None = None,
) -> dict[str, dict[str, Any]]:
    """Return a status matrix without endpoint URLs, account IDs, or secrets."""

    gmail_required = {
        "GMAIL_OAUTH_CLIENT_ID": settings.gmail_oauth_client_id,
        "GMAIL_OAUTH_CLIENT_SECRET": settings.gmail_oauth_client_secret,
        "GMAIL_OAUTH_REDIRECT_URI": settings.gmail_oauth_redirect_uri,
        "GMAIL_TOKEN_ENCRYPTION_KEYS": settings.gmail_token_encryption_keys,
    }
    sepay_required = {
        "SEPAY_WEBHOOK_SECRET or SEPAY_WEBHOOK_API_KEY": (
            settings.sepay_webhook_secret or settings.sepay_webhook_api_key
        ),
        "SEPAY_BANK_ACCOUNT": settings.sepay_bank_account,
        "SEPAY_BANK_NAME": settings.sepay_bank_name,
        "SEPAY_ACCOUNT_NAME": settings.sepay_account_name,
    }
    aws_required = {
        "AWS_SANDBOX_AMI_ID": settings.aws_sandbox_ami_id,
        "AWS_SANDBOX_SUBNET_ID": settings.aws_sandbox_subnet_id,
        "AWS_SANDBOX_SECURITY_GROUP_ID": settings.aws_sandbox_security_group_id,
    }

    def missing(required: dict[str, str]) -> list[str]:
        return [name for name, value in required.items() if not value]

    gmail_missing = missing(gmail_required)
    sepay_missing = missing(sepay_required)
    aws_missing = missing(aws_required)
    if cloud_sandbox_is_configured is None:
        cloud_sandbox_is_configured = not aws_missing
    tesseract_ready = bool(settings.tesseract_executable or shutil.which("tesseract"))

    return {
        "gmail": _state(
            configured=not gmail_missing,
            missing=gmail_missing,
            note="OAuth consent still requires a Google Cloud client owned by the deployer.",
        ),
        "sepay": _state(
            configured=not sepay_missing,
            missing=sepay_missing,
            note="Checkout is activated only by an authenticated incoming-payment webhook.",
        ),
        "cloud_sandbox": _state(
            configured=cloud_sandbox_is_configured,
            missing=aws_missing,
            note="Uses disposable Windows EC2 instances; AWS credentials use the standard SDK chain.",
        ),
        "metadefender": _state(
            configured=bool(settings.metadefender_api_key),
            missing=[] if settings.metadefender_api_key else ["METADEFENDER_API_KEY"],
            note="Local PE analysis remains available without this provider.",
        ),
        "clamav": _state(
            configured=bool(settings.clamav_host),
            ready=clamav_is_ready if settings.clamav_host else False,
            missing=[] if settings.clamav_host else ["CLAMAV_HOST"],
            note="ClamAV must be reachable only on a trusted service network.",
        ),
        "ocr": _state(
            configured=tesseract_ready,
            ready=tesseract_ready,
            missing=[] if tesseract_ready else ["TESSERACT_EXECUTABLE or tesseract in PATH"],
            mode="local",
        ),
        "misp": _state(
            configured=bool(
                settings.misp_enabled and settings.misp_base_url and settings.misp_api_key
            ),
            missing=[
                name
                for name, value in {
                    "MISP_ENABLED=true": settings.misp_enabled,
                    "MISP_BASE_URL": settings.misp_base_url,
                    "MISP_API_KEY": settings.misp_api_key,
                }.items()
                if not value
            ],
        ),
        "domain_intelligence": _state(
            configured=bool(settings.whoisxml_api_key or settings.ip2whois_api_key),
            missing=(
                []
                if settings.whoisxml_api_key or settings.ip2whois_api_key
                else ["WHOISXML_API_KEY or IP2WHOIS_API_KEY"]
            ),
            note="RDAP and local heuristics continue to work without a commercial key.",
        ),
        "phone_intelligence": _state(
            configured=bool(settings.ipqs_phone_api_key),
            missing=[] if settings.ipqs_phone_api_key else ["IPQS_PHONE_API_KEY"],
        ),
        "safe_browsing": _state(
            configured=bool(settings.google_safe_browsing_api_key),
            missing=(
                [] if settings.google_safe_browsing_api_key else ["GOOGLE_SAFE_BROWSING_API_KEY"]
            ),
        ),
    }
