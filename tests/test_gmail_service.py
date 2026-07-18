from __future__ import annotations

import base64
from urllib.parse import parse_qs, urlsplit

import httpx
import pytest
from cryptography.fernet import Fernet
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from backend.config import settings
from backend.db import Base
from backend.models import GmailConnection, GmailOAuthState, User
from backend.security_utils import create_password_salt, hash_password
from backend.services.gmail_service import GmailIntegrationError, GmailService


@pytest.fixture
def gmail_db() -> Session:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    db = Session(engine)
    salt = create_password_salt()
    db.add(
        User(
            id="gmail-user",
            email="demo@example.com",
            display_name="Gmail Demo",
            password_salt=salt,
            password_hash=hash_password("DemoPassword123", salt),
        )
    )
    db.commit()
    try:
        yield db
    finally:
        db.close()


def _configure(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "gmail_oauth_client_id", "client-id")
    monkeypatch.setattr(settings, "gmail_oauth_client_secret", "client-secret")
    monkeypatch.setattr(settings, "gmail_oauth_redirect_uri", "https://api.example.test/callback")
    monkeypatch.setattr(settings, "gmail_token_encryption_keys", Fernet.generate_key().decode())


def test_gmail_oauth_list_raw_and_disconnect(
    monkeypatch: pytest.MonkeyPatch, gmail_db: Session
) -> None:
    _configure(monkeypatch)
    raw_email = b"From: alert@example.com\r\nSubject: Verify\r\n\r\nClick now"

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.host == "oauth2.googleapis.com" and request.url.path == "/token":
            return httpx.Response(
                200,
                json={
                    "access_token": "access-secret",
                    "refresh_token": "refresh-secret",
                    "expires_in": 3600,
                    "scope": "https://www.googleapis.com/auth/gmail.readonly",
                },
            )
        if request.url.path.endswith("/profile"):
            return httpx.Response(200, json={"emailAddress": "owner@gmail.com"})
        if request.url.path.endswith("/messages"):
            return httpx.Response(200, json={"messages": [{"id": "abc123", "threadId": "t1"}]})
        if request.url.path.endswith("/messages/abc123") and request.url.params.get("format") == "metadata":
            return httpx.Response(
                200,
                json={
                    "id": "abc123",
                    "threadId": "t1",
                    "snippet": "Verify account",
                    "labelIds": ["SPAM"],
                    "payload": {"headers": [
                        {"name": "From", "value": "Alert <alert@example.com>"},
                        {"name": "Subject", "value": "Verify"},
                    ]},
                },
            )
        if request.url.path.endswith("/messages/abc123"):
            return httpx.Response(
                200,
                json={
                    "id": "abc123",
                    "threadId": "t1",
                    "labelIds": ["SPAM"],
                    "raw": base64.urlsafe_b64encode(raw_email).decode().rstrip("="),
                },
            )
        if request.url.path == "/revoke":
            return httpx.Response(200, json={})
        return httpx.Response(404, json={})

    service = GmailService(transport=httpx.MockTransport(handler))
    auth_url = service.begin_oauth(gmail_db, "gmail-user", "demo@example.com")
    query = parse_qs(urlsplit(auth_url).query)
    assert query["scope"] == ["https://www.googleapis.com/auth/gmail.readonly"]
    assert query["code_challenge_method"] == ["S256"]
    state = query["state"][0]

    connection = service.complete_oauth(gmail_db, state, "authorization-code")
    assert connection.gmail_address == "owner@gmail.com"
    assert "access-secret" not in connection.access_token_ciphertext
    assert "refresh-secret" not in connection.refresh_token_ciphertext
    assert gmail_db.get(GmailOAuthState, service._state_hash(state)).consumed_at is not None

    messages = service.list_messages(gmail_db, "gmail-user")
    assert messages[0]["subject"] == "Verify"
    assert messages[0]["labelIds"] == ["SPAM"]
    raw = service.get_raw_message(gmail_db, "gmail-user", "abc123")
    assert raw.data == raw_email
    assert raw.label_ids == ["SPAM"]

    service.disconnect(gmail_db, "gmail-user")
    assert gmail_db.execute(select(GmailConnection)).scalar_one_or_none() is None


def test_gmail_oauth_state_is_single_use(
    monkeypatch: pytest.MonkeyPatch, gmail_db: Session
) -> None:
    _configure(monkeypatch)

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/token":
            return httpx.Response(500, json={"error": "failed"})
        return httpx.Response(404, json={})

    service = GmailService(transport=httpx.MockTransport(handler))
    state = parse_qs(urlsplit(service.begin_oauth(gmail_db, "gmail-user")).query)["state"][0]
    with pytest.raises(GmailIntegrationError, match="token"):
        service.complete_oauth(gmail_db, state, "bad-code")
    with pytest.raises(GmailIntegrationError, match="không hợp lệ"):
        service.complete_oauth(gmail_db, state, "replay")


def test_gmail_context_marks_provider_label_in_assessment() -> None:
    from backend.dependencies import get_inference_service

    response = get_inference_service().assess_email_bytes(
        b"From: alert@example.com\r\nSubject: Verify\r\n\r\nConfirm account now",
        gmail_context={"message_id": "abc123", "thread_id": "t1", "label_ids": ["SPAM"]},
    )

    assert response.analysis_coverage["gmail_context"] == "completed"
    assert response.message_metadata["source"] == "gmail"
    assert any(item.feature == "E-CONTEXT-provider-label" for item in response.evidence)


def test_gmail_safe_preview_never_returns_active_html_or_raw_links(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from backend.routers import gmail as gmail_router
    from backend.services.gmail_service import GmailRawMessage

    raw_email = (
        b"From: Alert <alert@example.com>\r\n"
        b"Subject: Verify\r\n"
        b"Content-Type: text/html; charset=utf-8\r\n\r\n"
        b"<p>Open https://evil.example/login</p><script>alert(1)</script>"
    )
    monkeypatch.setattr(
        gmail_router.gmail_service,
        "get_raw_message",
        lambda _db, _user_id, _message_id: GmailRawMessage(
            data=raw_email,
            message_id="abc123",
            thread_id="thread1",
            label_ids=["INBOX", "UNREAD"],
        ),
    )

    preview = gmail_router._get_safe_preview("gmail-user", "abc123")

    assert preview["from"] == "Alert <alert@example.com>"
    assert preview["subject"] == "Verify"
    assert "https://" not in preview["body"]
    assert "alert(1)" not in preview["body"]
    assert preview["linksRemoved"] == 1
