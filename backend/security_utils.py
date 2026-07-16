"""Security helpers for credentials, opaque sessions, API keys, and request hashes."""

from __future__ import annotations

import hmac
import re
import secrets
from datetime import UTC, datetime
from hashlib import pbkdf2_hmac, sha256

from backend.config import settings

PASSWORD_ITERATIONS = 600_000
DUMMY_PASSWORD_SALT = "00" * 16


def utcnow() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def hash_password(password: str, salt: str) -> str:
    return pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        bytes.fromhex(salt),
        PASSWORD_ITERATIONS,
    ).hex()


DUMMY_PASSWORD_HASH = hash_password("invalid", DUMMY_PASSWORD_SALT)


def verify_password(password: str, salt: str | None, expected_hash: str | None) -> bool:
    actual_salt = salt or DUMMY_PASSWORD_SALT
    actual_hash = expected_hash or DUMMY_PASSWORD_HASH
    supplied = hash_password(password, actual_salt)
    return hmac.compare_digest(supplied, actual_hash)


def session_key(token: str) -> str:
    return sha256(token.encode("utf-8")).hexdigest()


def hash_api_key(key: str) -> str:
    payload = f"{settings.api_key_pepper}:{key}".encode()
    return sha256(payload).hexdigest()


def hash_metadata(value: str | None) -> str | None:
    if not value:
        return None
    return sha256(value.encode("utf-8")).hexdigest()


def create_session_token() -> str:
    return secrets.token_urlsafe(32)


def create_api_key_value() -> str:
    """Create a high-entropy credential with an identifiable Prewise prefix."""
    return "pw_live_" + secrets.token_urlsafe(36)


def create_password_salt() -> str:
    return secrets.token_hex(16)


def mask_api_key(prefix: str, tail: str) -> str:
    return f"{prefix}****{tail}"


def format_short_datetime(value: datetime | None) -> str:
    if value is None:
        value = utcnow()
    return value.strftime("%d/%m %H:%M")


def input_sha256(value: str | bytes | None) -> str:
    if value is None:
        data = b""
    elif isinstance(value, bytes):
        data = value
    else:
        data = value.encode("utf-8", errors="ignore")
    return sha256(data).hexdigest()


def input_preview(value: str | bytes | None, limit: int = 160) -> str:
    if value is None:
        return ""
    if isinstance(value, bytes):
        text = value[:limit].decode("utf-8", errors="replace")
    else:
        text = value
    text = re.sub(r"\s+", " ", text).strip()
    return text[:limit]
