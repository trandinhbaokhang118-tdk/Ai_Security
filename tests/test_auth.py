import secrets

from fastapi.testclient import TestClient

from backend.main import app
from backend.routers import auth

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


def test_expired_session_is_rejected_and_removed() -> None:
    session = login_demo()
    key = auth.session_key(session["token"])
    record = auth.SESSIONS[key]
    auth.SESSIONS[key] = auth.SessionRecord(email=record.email, expires_at=0)

    response = client.get("/v1/account/plan", headers=bearer(session["token"]))

    assert response.status_code == 401
    assert key not in auth.SESSIONS
