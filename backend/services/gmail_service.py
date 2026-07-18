"""Server-side Gmail OAuth and read-only message retrieval.

OAuth state is single-use, tokens are encrypted at rest, and raw messages are
only returned to the assessment service—not to the browser.
"""
from __future__ import annotations

import base64
import hashlib
import secrets
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from datetime import timedelta
from typing import Any
from urllib.parse import urlencode

import httpx
from cryptography.fernet import Fernet, InvalidToken, MultiFernet
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from backend.config import settings
from backend.models import GmailConnection, GmailOAuthState
from backend.security_utils import utcnow

GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly"
_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
_TOKEN_URL = "https://oauth2.googleapis.com/token"
_REVOKE_URL = "https://oauth2.googleapis.com/revoke"
_GMAIL_BASE = "https://gmail.googleapis.com/gmail/v1/users/me"


class GmailIntegrationError(RuntimeError):
    def __init__(self, detail: str, *, code: str = "gmail_error") -> None:
        super().__init__(detail)
        self.detail = detail
        self.code = code


@dataclass(frozen=True)
class GmailRawMessage:
    data: bytes
    message_id: str
    thread_id: str
    label_ids: list[str]


class GmailService:
    def __init__(self, *, transport: httpx.BaseTransport | None = None) -> None:
        self.transport = transport

    @property
    def configured(self) -> bool:
        try:
            self._cipher()
        except GmailIntegrationError:
            return False
        return all(
            (
                settings.gmail_oauth_client_id,
                settings.gmail_oauth_client_secret,
                settings.gmail_oauth_redirect_uri,
            )
        )

    @staticmethod
    def _cipher() -> MultiFernet:
        raw_keys = [
            item.strip()
            for item in settings.gmail_token_encryption_keys.split(",")
            if item.strip()
        ]
        if not raw_keys:
            raise GmailIntegrationError("Mã hóa token Gmail chưa được cấu hình.", code="not_configured")
        try:
            return MultiFernet([Fernet(item.encode("ascii")) for item in raw_keys])
        except (ValueError, TypeError) as exc:
            raise GmailIntegrationError(
                "Khóa mã hóa token Gmail không hợp lệ.", code="not_configured"
            ) from exc

    def _encrypt(self, value: str) -> str:
        return self._cipher().encrypt(value.encode("utf-8")).decode("ascii")

    def _decrypt(self, value: str) -> str:
        try:
            return self._cipher().decrypt(value.encode("ascii")).decode("utf-8")
        except (InvalidToken, ValueError, UnicodeError) as exc:
            raise GmailIntegrationError(
                "Không thể giải mã kết nối Gmail; hãy kết nối lại.", code="token_invalid"
            ) from exc

    @staticmethod
    def _state_hash(value: str) -> str:
        return hashlib.sha256(value.encode("utf-8")).hexdigest()

    @staticmethod
    def _challenge(verifier: str) -> str:
        digest = hashlib.sha256(verifier.encode("ascii")).digest()
        return base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=")

    def begin_oauth(self, db: Session, user_id: str, login_hint: str = "") -> str:
        if not self.configured:
            raise GmailIntegrationError("Gmail OAuth chưa được cấu hình.", code="not_configured")
        now = utcnow()
        db.execute(
            delete(GmailOAuthState).where(
                GmailOAuthState.user_id == user_id,
            )
        )
        state = secrets.token_urlsafe(32)
        verifier = secrets.token_urlsafe(64)
        db.add(
            GmailOAuthState(
                state_hash=self._state_hash(state),
                user_id=user_id,
                code_verifier_ciphertext=self._encrypt(verifier),
                expires_at=now + timedelta(minutes=10),
            )
        )
        db.commit()
        params = {
            "client_id": settings.gmail_oauth_client_id,
            "redirect_uri": settings.gmail_oauth_redirect_uri,
            "response_type": "code",
            "scope": GMAIL_READONLY_SCOPE,
            "access_type": "offline",
            "include_granted_scopes": "true",
            "prompt": "consent select_account",
            "state": state,
            "code_challenge": self._challenge(verifier),
            "code_challenge_method": "S256",
        }
        if login_hint:
            params["login_hint"] = login_hint[:320]
        return f"{_AUTH_URL}?{urlencode(params)}"

    def complete_oauth(self, db: Session, state: str, code: str) -> GmailConnection:
        if not self.configured:
            raise GmailIntegrationError("Gmail OAuth chưa được cấu hình.", code="not_configured")
        now = utcnow()
        record = db.get(GmailOAuthState, self._state_hash(state))
        if record is None or record.consumed_at is not None or record.expires_at <= now:
            raise GmailIntegrationError("Phiên kết nối Gmail không hợp lệ hoặc đã hết hạn.", code="invalid_state")
        verifier = self._decrypt(record.code_verifier_ciphertext)
        record.consumed_at = now
        db.commit()

        payload = self._token_request(
            {
                "client_id": settings.gmail_oauth_client_id,
                "client_secret": settings.gmail_oauth_client_secret,
                "code": code,
                "code_verifier": verifier,
                "grant_type": "authorization_code",
                "redirect_uri": settings.gmail_oauth_redirect_uri,
            }
        )
        access_token = str(payload.get("access_token") or "")
        if not access_token:
            raise GmailIntegrationError("Google không trả về access token.", code="token_exchange_failed")
        scope_values = str(payload.get("scope") or GMAIL_READONLY_SCOPE).split()
        if GMAIL_READONLY_SCOPE not in scope_values:
            raise GmailIntegrationError("Quyền Gmail chỉ đọc chưa được cấp.", code="scope_missing")
        expires_in = max(60, min(int(payload.get("expires_in") or 3600), 86_400))
        profile = self._google_json(
            "GET",
            f"{_GMAIL_BASE}/profile",
            access_token=access_token,
        )
        address = str(profile.get("emailAddress") or "")[:320]
        connection = db.execute(
            select(GmailConnection).where(GmailConnection.user_id == record.user_id)
        ).scalar_one_or_none()
        if connection is None:
            connection = GmailConnection(
                user_id=record.user_id,
                access_token_ciphertext="",
                token_expires_at=now,
            )
            db.add(connection)
        refresh_token = str(payload.get("refresh_token") or "")
        connection.gmail_address = address
        connection.access_token_ciphertext = self._encrypt(access_token)
        if refresh_token:
            connection.refresh_token_ciphertext = self._encrypt(refresh_token)
        connection.scopes = scope_values
        connection.token_expires_at = now + timedelta(seconds=expires_in)
        connection.status = "active"
        connection.last_used_at = now
        db.commit()
        db.refresh(connection)
        return connection

    def _token_request(self, data: dict[str, str]) -> dict[str, Any]:
        try:
            with httpx.Client(
                timeout=max(2.0, min(float(settings.gmail_api_timeout_seconds), 30.0)),
                follow_redirects=False,
                transport=self.transport,
            ) as client:
                response = client.post(_TOKEN_URL, data=data, headers={"Accept": "application/json"})
            response.raise_for_status()
            payload = response.json()
            if not isinstance(payload, dict):
                raise TypeError
            return payload
        except (httpx.HTTPError, TypeError, ValueError) as exc:
            raise GmailIntegrationError(
                "Không thể trao đổi token với Google.", code="token_exchange_failed"
            ) from exc

    def _access_token(self, db: Session, user_id: str) -> tuple[GmailConnection, str]:
        connection = db.execute(
            select(GmailConnection).where(GmailConnection.user_id == user_id)
        ).scalar_one_or_none()
        if connection is None or connection.status != "active":
            raise GmailIntegrationError("Tài khoản Gmail chưa được kết nối.", code="not_connected")
        if connection.token_expires_at > utcnow() + timedelta(seconds=60):
            return connection, self._decrypt(connection.access_token_ciphertext)
        if not connection.refresh_token_ciphertext:
            connection.status = "expired"
            db.commit()
            raise GmailIntegrationError("Kết nối Gmail đã hết hạn; hãy kết nối lại.", code="expired")
        refresh_token = self._decrypt(connection.refresh_token_ciphertext)
        try:
            payload = self._token_request(
                {
                    "client_id": settings.gmail_oauth_client_id,
                    "client_secret": settings.gmail_oauth_client_secret,
                    "refresh_token": refresh_token,
                    "grant_type": "refresh_token",
                }
            )
        except GmailIntegrationError:
            connection.status = "expired"
            db.commit()
            raise
        access_token = str(payload.get("access_token") or "")
        if not access_token:
            raise GmailIntegrationError("Không thể làm mới Gmail.", code="refresh_failed")
        connection.access_token_ciphertext = self._encrypt(access_token)
        connection.token_expires_at = utcnow() + timedelta(
            seconds=max(60, min(int(payload.get("expires_in") or 3600), 86_400))
        )
        connection.last_used_at = utcnow()
        db.commit()
        return connection, access_token

    def _google_json(
        self,
        method: str,
        url: str,
        *,
        access_token: str,
        params: list[tuple[str, str | int | bool]] | None = None,
    ) -> dict[str, Any]:
        try:
            with httpx.Client(
                timeout=max(2.0, min(float(settings.gmail_api_timeout_seconds), 30.0)),
                follow_redirects=False,
                transport=self.transport,
            ) as client:
                response = client.request(
                    method,
                    url,
                    params=params,
                    headers={"Authorization": f"Bearer {access_token}", "Accept": "application/json"},
                )
            response.raise_for_status()
            payload = response.json()
            if not isinstance(payload, dict):
                raise TypeError
            return payload
        except (httpx.HTTPError, TypeError, ValueError) as exc:
            raise GmailIntegrationError("Gmail API không phản hồi hợp lệ.", code="provider_error") from exc

    def status(self, db: Session, user_id: str) -> dict[str, Any]:
        connection = db.execute(
            select(GmailConnection).where(GmailConnection.user_id == user_id)
        ).scalar_one_or_none()
        return {
            "configured": self.configured,
            "connected": bool(connection and connection.status == "active"),
            "address": connection.gmail_address if connection and connection.status == "active" else "",
            "status": connection.status if connection else "not_connected",
        }

    def list_messages(
        self,
        db: Session,
        user_id: str,
        *,
        query: str = "",
        label: str = "",
        max_results: int = 20,
    ) -> list[dict[str, Any]]:
        _connection, token = self._access_token(db, user_id)
        params: list[tuple[str, str | int | bool]] = [
            ("maxResults", max(1, min(int(max_results), 30))),
            ("includeSpamTrash", True),
        ]
        if query:
            params.append(("q", query[:200]))
        if label in {"INBOX", "SPAM", "UNREAD", "TRASH"}:
            params.append(("labelIds", label))
        listed = self._google_json("GET", f"{_GMAIL_BASE}/messages", access_token=token, params=params)
        items = listed.get("messages", [])
        if not isinstance(items, list):
            raise GmailIntegrationError("Danh sách Gmail không hợp lệ.", code="provider_error")

        def fetch_detail(item: object) -> dict[str, Any] | None:
            if not isinstance(item, dict) or not str(item.get("id", "")):
                return None
            message_id = str(item["id"])
            detail = self._google_json(
                "GET",
                f"{_GMAIL_BASE}/messages/{message_id}",
                access_token=token,
                params=[
                    ("format", "metadata"),
                    ("metadataHeaders", "From"),
                    ("metadataHeaders", "Subject"),
                    ("metadataHeaders", "Date"),
                ],
            )
            payload = detail.get("payload", {})
            if not isinstance(payload, dict):
                payload = {}
            raw_headers = payload.get("headers", [])
            if not isinstance(raw_headers, list):
                raw_headers = []
            headers = {
                str(header.get("name", "")).lower(): str(header.get("value", ""))[:1000]
                for header in raw_headers
                if isinstance(header, dict)
            }
            raw_labels = detail.get("labelIds", [])
            labels = raw_labels if isinstance(raw_labels, list) else []
            return {
                "id": message_id,
                "threadId": str(detail.get("threadId") or item.get("threadId") or ""),
                "from": headers.get("from", ""),
                "subject": headers.get("subject", "(Không có chủ đề)"),
                "date": headers.get("date", ""),
                "snippet": str(detail.get("snippet") or "")[:300],
                "labelIds": [str(value)[:80] for value in labels[:20]],
            }

        selected = items[: max(1, min(int(max_results), 30))]
        with ThreadPoolExecutor(max_workers=min(5, len(selected) or 1)) as pool:
            details = list(pool.map(fetch_detail, selected))
        return [item for item in details if item is not None]

    def get_raw_message(self, db: Session, user_id: str, message_id: str) -> GmailRawMessage:
        if not message_id or len(message_id) > 200 or not message_id.replace("-", "").isalnum():
            raise GmailIntegrationError("Mã thư Gmail không hợp lệ.", code="invalid_message_id")
        _connection, token = self._access_token(db, user_id)
        detail = self._google_json(
            "GET",
            f"{_GMAIL_BASE}/messages/{message_id}",
            access_token=token,
            params=[("format", "raw")],
        )
        raw = str(detail.get("raw") or "")
        try:
            padding = "=" * (-len(raw) % 4)
            data = base64.urlsafe_b64decode((raw + padding).encode("ascii"))
        except (ValueError, UnicodeError) as exc:
            raise GmailIntegrationError("Raw message Gmail không hợp lệ.", code="invalid_raw") from exc
        if not data or len(data) > settings.max_upload_bytes:
            raise GmailIntegrationError("Email Gmail rỗng hoặc vượt giới hạn.", code="message_too_large")
        return GmailRawMessage(
            data=data,
            message_id=message_id,
            thread_id=str(detail.get("threadId") or "")[:200],
            label_ids=[str(value)[:80] for value in detail.get("labelIds", [])[:30]],
        )

    def disconnect(self, db: Session, user_id: str) -> None:
        connection = db.execute(
            select(GmailConnection).where(GmailConnection.user_id == user_id)
        ).scalar_one_or_none()
        if connection is None:
            return
        token_ciphertext = connection.refresh_token_ciphertext or connection.access_token_ciphertext
        try:
            token = self._decrypt(token_ciphertext)
            with httpx.Client(
                timeout=max(2.0, min(float(settings.gmail_api_timeout_seconds), 15.0)),
                follow_redirects=False,
                transport=self.transport,
            ) as client:
                client.post(_REVOKE_URL, data={"token": token})
        except (GmailIntegrationError, httpx.HTTPError):
            pass
        db.delete(connection)
        db.execute(delete(GmailOAuthState).where(GmailOAuthState.user_id == user_id))
        db.commit()


gmail_service = GmailService()
