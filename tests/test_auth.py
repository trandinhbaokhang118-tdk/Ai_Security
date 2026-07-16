import secrets
from datetime import timedelta

from fastapi.testclient import TestClient
from sqlalchemy import select

from backend.db import SessionLocal
from backend.main import app
from backend.models import SessionRecord
from backend.routers import auth
from backend.security_utils import utcnow

client = TestClient(app)


def login_demo() -> dict:
    response = client.post(
        "/v1/auth/login",
        json={"email": "demo@aisec.local", "password": "Demo@123456"},
    )
    assert response.status_code == 200
    return response.json()


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_account_endpoints_require_bearer_session() -> None:
    for method, path in (
        ("GET", "/v1/account/plan"),
        ("GET", "/v1/account/history"),
        ("GET", "/v1/account/api-key"),
        ("POST", "/v1/account/api-key/rotate"),
        ("POST", "/v1/auth/logout"),
    ):
        response = client.request(method, path)
        assert response.status_code == 401
        assert response.headers["www-authenticate"] == "Bearer"


def test_login_allows_account_access_and_logout_revokes_token() -> None:
    session = login_demo()
    headers = bearer(session["token"])

    plan = client.get("/v1/account/plan", headers=headers)
    assert plan.status_code == 200
    assert plan.json()["tier"] == "pro"

    logout = client.post("/v1/auth/logout", headers=headers)
    assert logout.status_code == 200
    assert client.get("/v1/account/plan", headers=headers).status_code == 401


def test_authenticated_scan_persists_to_history_and_quota() -> None:
    session = login_demo()
    headers = bearer(session["token"])
    before_quota = client.get("/v1/account/quota", headers=headers).json()

    scan = client.post("/v1/assess/url", headers=headers, json={"url": "https://github.com"})
    assert scan.status_code == 200
    request_id = scan.json()["request_id"]

    history = client.get("/v1/account/history", headers=headers)
    after_quota = client.get("/v1/account/quota", headers=headers).json()

    assert history.status_code == 200
    assert any(item["id"] == request_id for item in history.json())
    assert after_quota["usedToday"] == before_quota["usedToday"] + 1


def test_api_keys_are_scoped_per_user_and_rotate_independently() -> None:
    demo = login_demo()
    email = f"member-{secrets.token_hex(4)}@example.com"
    registration = client.post(
        "/v1/auth/register",
        json={"email": email, "password": "StrongPass!123", "displayName": "Member"},
    )
    assert registration.status_code == 200
    member = registration.json()

    demo_key = client.get("/v1/account/api-key", headers=bearer(demo["token"])).json()["key"]
    member_headers = bearer(member["token"])
    member_key = client.get("/v1/account/api-key", headers=member_headers).json()["key"]
    assert member_key != demo_key

    rotated_key = client.post("/v1/account/api-key/rotate", headers=member_headers).json()["key"]
    assert rotated_key != member_key
    unchanged_demo_key = client.get(
        "/v1/account/api-key", headers=bearer(demo["token"])
    ).json()["key"]
    assert unchanged_demo_key == demo_key


def test_invalid_bearer_token_is_rejected() -> None:
    response = client.get("/v1/account/api-key", headers=bearer("invalid-token"))
    assert response.status_code == 401


def test_profile_update_and_password_change() -> None:
    email = f"profile-{secrets.token_hex(4)}@example.com"
    old_password = "StrongPass!123"
    new_password = "NewStrongPass!456"
    registration = client.post(
        "/v1/auth/register",
        json={"email": email, "password": old_password, "displayName": "Before"},
    )
    token = registration.json()["token"]
    headers = bearer(token)

    profile = client.patch(
        "/v1/account/profile",
        headers=headers,
        json={"displayName": "  After   Name  "},
    )
    assert profile.status_code == 200
    assert profile.json()["displayName"] == "After Name"

    wrong = client.post(
        "/v1/account/password",
        headers=headers,
        json={"currentPassword": "incorrect", "newPassword": new_password},
    )
    assert wrong.status_code == 400

    changed = client.post(
        "/v1/account/password",
        headers=headers,
        json={"currentPassword": old_password, "newPassword": new_password},
    )
    assert changed.status_code == 200
    assert client.post("/v1/auth/login", json={"email": email, "password": old_password}).status_code == 401
    assert client.post("/v1/auth/login", json={"email": email, "password": new_password}).status_code == 200


def test_paid_subscription_can_be_canceled() -> None:
    email = f"pro-{secrets.token_hex(4)}@example.com"
    registration = client.post(
        "/v1/auth/register",
        json={"email": email, "password": "StrongPass!123", "displayName": "Pro Member"},
    )
    assert registration.status_code == 200
    assert registration.json()["plan"]["tier"] == "pro"
    headers = bearer(registration.json()["token"])
    response = client.post("/v1/account/subscription/cancel", headers=headers)
    assert response.status_code == 200
    assert response.json()["tier"] == "free"


def test_expired_session_is_rejected_and_removed() -> None:
    session = login_demo()
    key = auth.session_key(session["token"])
    with SessionLocal() as db:
        record = db.execute(
            select(SessionRecord).where(SessionRecord.token_hash == key)
        ).scalar_one()
        record.expires_at = utcnow() - timedelta(seconds=1)
        db.commit()

    response = client.get("/v1/account/plan", headers=bearer(session["token"]))

    assert response.status_code == 401
    with SessionLocal() as db:
        assert (
            db.execute(select(SessionRecord).where(SessionRecord.token_hash == key)).scalar_one_or_none()
            is None
        )
