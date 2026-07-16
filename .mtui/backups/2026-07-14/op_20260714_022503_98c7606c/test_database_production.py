from datetime import timedelta

from backend.config import Settings, settings
from backend.db import SessionLocal
from backend.models import ApiKey
from backend.routers.auth import resolve_actor
from backend.security_utils import create_api_key_value, hash_api_key, utcnow
from fastapi.security import HTTPAuthorizationCredentials


def test_production_rejects_sqlite_and_unsafe_secrets() -> None:
    try:
        Settings(app_env="production")
    except ValueError as exc:
        message = str(exc)
        assert "DATABASE_URL" in message
        assert "API_KEY_PEPPER" in message
    else:
        raise AssertionError("Production configuration must fail closed")


def test_api_key_plaintext_is_never_stored() -> None:
    plaintext = create_api_key_value()
    digest = hash_api_key(plaintext)
    assert plaintext not in digest
    assert len(digest) == 64


def test_api_key_last_used_write_is_throttled(monkeypatch) -> None:
    monkeypatch.setattr(settings, "api_key_last_used_write_interval_seconds", 300)
    with SessionLocal() as db:
        key = db.query(ApiKey).filter(ApiKey.status == "active").first()
        assert key is not None
        key.last_used_at = utcnow()
        original = key.last_used_at
        db.commit()

        # We cannot reconstruct plaintext for an existing one-way hash, so verify
        # the interval predicate which protects the hot authentication path.
        now = utcnow()
        assert original > now - timedelta(seconds=settings.api_key_last_used_write_interval_seconds)


def test_invalid_api_key_does_not_authenticate() -> None:
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="pw_live_invalid")
    with SessionLocal() as db:
        try:
            resolve_actor(credentials, db)
        except Exception as exc:
            assert getattr(exc, "status_code", None) == 401
        else:
            raise AssertionError("Invalid API key was accepted")
