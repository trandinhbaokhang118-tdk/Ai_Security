"""URL Risk Adapter — lexical feature extraction (module-specification.md M1).

Extracts a 15-dimensional feature vector from a raw URL and detects phishing signals
(homoglyph, risky TLD, IP host, suspicious keywords). Pure-Python + stdlib only, so it
runs without numpy; the ML training scripts consume the same feature order.
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass
from urllib.parse import parse_qs, unquote, urlparse

from shared.constants import HIGH_RISK_TLDS, KNOWN_BRANDS

SHORTLINK_DOMAINS = {"bit.ly", "tinyurl.com", "goo.gl", "t.co", "ow.ly", "is.gd", "buff.ly"}
SUSPICIOUS_KEYWORDS = (
    "login",
    "verify",
    "secure",
    "security",
    "account",
    "update",
    "confirm",
    "signin",
    "password",
    "otp",
    "bank",
    "gift",
    "free",
    "wallet",
    "bonus",
    "prize",
    "claim",
    "reward",
    "unlock",
    "payment",
    "billing",
    "card",
    "cccd",
)

MULTI_PART_PUBLIC_SUFFIXES = {
    "com.vn",
    "net.vn",
    "org.vn",
    "edu.vn",
    "gov.vn",
    "co.uk",
    "com.au",
    "co.jp",
    "co.kr",
    "com.br",
    "com.sg",
    "com.my",
    "com.hk",
    "com.cn",
    "com.tw",
    "co.id",
    "co.th",
}

BRAND_CANONICAL_DOMAINS: dict[str, tuple[str, ...]] = {
    "paypal": ("paypal.com",),
    "facebook": ("facebook.com", "fb.com"),
    "google": ("google.com",),
    "apple": ("apple.com",),
    "microsoft": ("microsoft.com", "live.com", "office.com", "microsoftonline.com"),
    "amazon": ("amazon.com",),
    "vietcombank": ("vietcombank.com.vn",),
    "techcombank": ("techcombank.com.vn",),
    "mbbank": ("mbbank.com.vn",),
    "tpbank": ("tpbank.com.vn", "tpb.vn"),
    "bidv": ("bidv.com.vn",),
    "agribank": ("agribank.com.vn",),
    "netflix": ("netflix.com",),
    "instagram": ("instagram.com",),
    "shopee": ("shopee.vn", "shopee.com"),
    "tiki": ("tiki.vn",),
    "zalo": ("zalo.me", "zalo.vn"),
}

# Digits commonly substituted for letters in homoglyph attacks.
_HOMOGLYPH_DIGITS = "013457"

FEATURE_NAMES = (
    "url_length", "domain_entropy", "subdomain_depth", "tld_risk_score",
    "has_ip_address", "special_char_ratio", "path_depth", "query_param_count",
    "has_https", "homoglyph_score", "is_shortlink", "digit_ratio",
    "vowel_consonant_ratio", "url_path_entropy", "has_suspicious_keywords",
)


@dataclass(frozen=True)
class URLParts:
    normalized_url: str
    host: str
    domain_label: str
    registrable_domain: str
    subdomain: str
    suffix: str


@dataclass(frozen=True)
class URLSignals:
    parts: URLParts
    brand_mentions: tuple[str, ...]
    brand_mismatch: bool
    brand_in_subdomain: bool
    deceptive_subdomain: bool
    suspicious_keywords: tuple[str, ...]
    long_url: bool
    many_delimiters: bool
    excessive_dots: bool
    percent_encoded: bool
    at_symbol: bool
    risky_tld: bool
    ip_host: bool
    no_https: bool
    shortlink: bool
    homoglyph: bool
    path_depth: int
    query_param_count: int
    delimiter_count: int


def shannon_entropy(s: str) -> float:
    if not s:
        return 0.0
    counts = {c: s.count(c) for c in set(s)}
    n = len(s)
    return -sum((c / n) * math.log2(c / n) for c in counts.values())


def levenshtein(a: str, b: str) -> int:
    if a == b:
        return 0
    if not a:
        return len(b)
    if not b:
        return len(a)
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def min_brand_distance(domain: str) -> float:
    """Normalized min edit distance to any known brand (lower = more suspicious)."""
    if not domain:
        return 1.0
    brands = tuple(dict.fromkeys((*KNOWN_BRANDS, *BRAND_CANONICAL_DOMAINS.keys())))
    dists = [levenshtein(domain, b) / max(len(domain), len(b)) for b in brands]
    return min(dists)


def _registered_domain(host: str) -> str:
    """Best-effort registrable domain without tldextract."""
    return parse_url_parts(host).registrable_domain


def _normalize_for_urlparse(url: str) -> str:
    """Normalize URL for urlparse, handling edge cases."""
    url = url.strip()
    # Handle IPv6 URLs by ensuring they're properly formatted
    if '[' in url and ']' in url:
        # Already has IPv6 brackets
        if '://' not in url:
            return f"http://{url}"
        return url
    # Regular URL normalization
    return url if "://" in url else f"http://{url}"


def parse_url_parts(url: str) -> URLParts:
    """Return host/subdomain/registrable-domain pieces used by URL rules."""
    if not url or not isinstance(url, str):
        raise ValueError("URL must be a non-empty string")

    try:
        normalized = _normalize_for_urlparse(url.strip()[:2048])
        parsed = urlparse(normalized)
        host = (parsed.hostname or "").strip(".").lower()
        if not host:
            raise ValueError("URL must include a host")
        if is_ip_host(normalized):
            return URLParts(
                normalized_url=normalized,
                host=host,
                domain_label=host,
                registrable_domain=host,
                subdomain="",
                suffix="",
            )
    except Exception as e:
        # Handle malformed URLs gracefully
        raise ValueError(f"Cannot parse URL: {str(e)}")

    labels = [label for label in host.split(".") if label]
    if len(labels) == 1:
        return URLParts(
            normalized_url=normalized,
            host=host,
            domain_label=labels[0],
            registrable_domain=labels[0],
            subdomain="",
            suffix="",
        )

    last_two = ".".join(labels[-2:])
    if len(labels) >= 3 and last_two in MULTI_PART_PUBLIC_SUFFIXES:
        suffix_labels = 2
        domain_index = -3
    else:
        suffix_labels = 1
        domain_index = -2

    domain_label = labels[domain_index]
    suffix = ".".join(labels[-suffix_labels:])
    registrable_domain = ".".join(labels[domain_index:])
    subdomain_labels = labels[:domain_index]
    return URLParts(
        normalized_url=normalized,
        host=host,
        domain_label=domain_label,
        registrable_domain=registrable_domain,
        subdomain=".".join(subdomain_labels),
        suffix=suffix,
    )


def _split_host(url: str) -> tuple[str, str, str]:
    parts = parse_url_parts(url)
    return parts.host, parts.domain_label, parts.subdomain + "|" + parts.suffix


# Map look-alike digits back to the letters they impersonate.
_DIGIT_TO_LETTER = str.maketrans({"0": "o", "1": "l", "3": "e", "4": "a", "5": "s", "7": "t"})


def has_homoglyph(url: str) -> bool:
    parts = parse_url_parts(url)
    domain = parts.domain_label
    host = parts.host
    if re.search(r"[a-z]", host) and re.search(r"[^\x00-\x7f]", host):
        return True  # mixed ASCII + non-ASCII (Cyrillic look-alikes)
    if re.search(rf"[a-z][{_HOMOGLYPH_DIGITS}]+[a-z]", domain):
        return True  # digit substitution inside a label (e.g. vietc0mbank)
    # Digit-substituted brand impersonation, incl. at word boundaries (e.g. paypa1).
    if any(ch.isdigit() for ch in domain):
        deleet = domain.translate(_DIGIT_TO_LETTER)
        for brand in KNOWN_BRANDS:
            if brand in deleet and brand not in domain:
                return True
    return False


def is_ip_host(url: str) -> bool:
    """Check if URL uses an IP address (IPv4 or IPv6) instead of domain name."""
    try:
        parsed = urlparse(_normalize_for_urlparse(url))
        host = (parsed.hostname or "").lower()
        # IPv4 pattern
        if re.match(r"^\d{1,3}(\.\d{1,3}){3}$", host):
            return True
        # IPv6 pattern (simplified check)
        if ":" in host and not host.startswith("["):
            return True
        return False
    except Exception:
        return False


def _brand_names() -> tuple[str, ...]:
    return tuple(dict.fromkeys((*KNOWN_BRANDS, *BRAND_CANONICAL_DOMAINS.keys())))


def _brand_mentions(text: str) -> tuple[str, ...]:
    return tuple(brand for brand in _brand_names() if brand in text)


def _brand_domain_allowed(brand: str, host: str, registrable_domain: str) -> bool:
    allowed = BRAND_CANONICAL_DOMAINS.get(brand, (f"{brand}.com",))
    return any(registrable_domain == domain or host == domain or host.endswith("." + domain)
               for domain in allowed)


def analyze_url_signals(url: str) -> URLSignals:
    """Extract explainable phishing signals from the URL string itself.

    This complements the fixed 15-value ML feature vector. It is intentionally
    pure-stdlib and does not fetch the webpage.
    """
    parts = parse_url_parts(url)
    parsed = urlparse(parts.normalized_url)
    decoded_url = unquote(parts.normalized_url).lower()
    decoded_host = unquote(parts.host).lower()
    path = parsed.path or ""
    query = parsed.query or ""
    query_param_count = len(parse_qs(query))
    path_depth = len([p for p in path.split("/") if p])
    delimiter_count = sum(parts.normalized_url.count(ch) for ch in ("-", "_", "%", "@", "?", "="))
    mentions = _brand_mentions(decoded_host)
    brand_mismatch = any(
        not _brand_domain_allowed(brand, parts.host, parts.registrable_domain)
        for brand in mentions
    )
    brand_in_subdomain = any(brand in parts.subdomain for brand in mentions)
    subdomain_labels = [label for label in parts.subdomain.split(".") if label]
    deceptive_subdomain = (
        brand_in_subdomain
        or any(label in {"com", "vn", "net", "org", "security", "secure", "login"}
               for label in subdomain_labels)
    ) and brand_mismatch
    keywords = tuple(k for k in SUSPICIOUS_KEYWORDS if k in decoded_url)

    return URLSignals(
        parts=parts,
        brand_mentions=mentions,
        brand_mismatch=brand_mismatch,
        brand_in_subdomain=brand_in_subdomain,
        deceptive_subdomain=deceptive_subdomain,
        suspicious_keywords=keywords,
        long_url=len(parts.normalized_url) >= 100,
        many_delimiters=delimiter_count >= 5,
        excessive_dots=parts.host.count(".") >= 3,
        percent_encoded="%" in parts.normalized_url,
        at_symbol="@" in parts.normalized_url,
        risky_tld=parts.suffix.split(".")[-1] in HIGH_RISK_TLDS,
        ip_host=is_ip_host(parts.normalized_url),
        no_https=parsed.scheme != "https",
        shortlink=parts.host in SHORTLINK_DOMAINS,
        homoglyph=has_homoglyph(parts.normalized_url),
        path_depth=path_depth,
        query_param_count=query_param_count,
        delimiter_count=delimiter_count,
    )


def extract_url_features(url: str) -> list[float]:
    """Return the 15-dim feature vector (order == FEATURE_NAMES).

    Raises ValueError on empty/None input.
    """
    if not url or not isinstance(url, str):
        raise ValueError("URL must be a non-empty string")
    url = url.strip()[:2048]
    parsed = urlparse(_normalize_for_urlparse(url))
    host, domain, sub_tld = _split_host(url)
    subdomain, tld = (sub_tld.split("|", 1) + [""])[:2]
    path = parsed.path or ""

    f = [0.0] * 15
    f[0] = min(len(url), 2048)
    f[1] = shannon_entropy(domain)
    f[2] = float(len(subdomain.split(".")) if subdomain else 0)
    f[3] = 1.0 if tld in HIGH_RISK_TLDS else 0.0
    f[4] = 1.0 if is_ip_host(url) else 0.0
    f[5] = sum(1 for c in domain if c in "@-_") / max(len(domain), 1)
    f[6] = float(len([p for p in path.split("/") if p]))
    f[7] = float(len(parse_qs(parsed.query)))
    f[8] = 1.0 if parsed.scheme == "https" else 0.0
    f[9] = min_brand_distance(domain)
    f[10] = 1.0 if host in SHORTLINK_DOMAINS else 0.0
    f[11] = sum(1 for c in domain if c.isdigit()) / max(len(domain), 1)
    vowels = sum(1 for c in domain if c in "aeiou")
    cons = sum(1 for c in domain if c.isalpha() and c not in "aeiou")
    f[12] = vowels / max(cons, 1)
    f[13] = shannon_entropy(path)
    f[14] = 1.0 if any(k in path.lower() for k in SUSPICIOUS_KEYWORDS) else 0.0
    return f
