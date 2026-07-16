"""Canonical URL and identity keys used before any scoring occurs."""

from __future__ import annotations

import hashlib
import posixpath
from urllib.parse import parse_qsl, quote, urlencode, urlsplit, urlunsplit

from .types import SubjectKeys

_TRACKING = {"fbclid", "gclid", "mc_cid", "mc_eid"}


def _registrable(host: str) -> str:
    # Conservative fallback without a public-suffix dependency.
    parts = host.split(".")
    return ".".join(parts[-2:]) if len(parts) >= 2 else host


def normalize_url(url: str) -> SubjectKeys:
    value = url.strip()
    if "://" not in value:
        value = "https://" + value
    p = urlsplit(value)
    scheme = p.scheme.lower()
    host = (p.hostname or "").encode("idna").decode("ascii").lower().rstrip(".")
    if not host:
        raise ValueError("URL must contain a host")
    port = p.port
    netloc = (
        host
        if port is None or (scheme, port) in {("http", 80), ("https", 443)}
        else f"{host}:{port}"
    )
    path = posixpath.normpath(p.path or "/")
    if p.path.endswith("/") and not path.endswith("/"):
        path += "/"
    path = quote(path, safe="/%:@-._~!$&'()*+,;=")
    # Preserve exact query order: endpoints and provider signatures can be
    # semantics-sensitive. Only the campaign key removes versioned tracking keys.
    query = p.query
    normalized = urlunsplit((scheme, netloc, path, query, ""))
    campaign_query = urlencode(
        [
            (k, v)
            for k, v in parse_qsl(p.query, keep_blank_values=True)
            if k.lower() not in _TRACKING
        ],
        doseq=True,
    )
    campaign = urlunsplit((scheme, netloc, path, campaign_query, ""))
    exact = hashlib.sha256(normalized.encode()).hexdigest()
    campaign_key = hashlib.sha256(campaign.encode()).hexdigest()
    registrable = _registrable(host)
    return SubjectKeys(exact, campaign_key, registrable, normalized)


def make_finding_key(exact_subject_key: str, finding_type: str, provider_identity: str) -> str:
    raw = "\x1f".join(
        (exact_subject_key, finding_type.strip().lower(), provider_identity.strip().lower())
    )
    return hashlib.sha256(raw.encode()).hexdigest()


def make_incident_key(campaign_subject_key: str, finding_type: str, time_bucket: str) -> str:
    raw = "\x1f".join((campaign_subject_key, finding_type.strip().lower(), time_bucket))
    return hashlib.sha256(raw.encode()).hexdigest()
