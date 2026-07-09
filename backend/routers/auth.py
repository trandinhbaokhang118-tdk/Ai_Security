"""Authenticated development sessions and account endpoints for the web UI.

State is intentionally kept in memory for the local demo, but account data is
protected by opaque Bearer sessions and scoped to the authenticated user.
"""

from __future__ import annotations

import hmac
import secrets
import time
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from hashlib import pbkdf2_hmac, sha256
from typing import Annotated, NoReturn

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field, field_validator

router = APIRouter(prefix="/v1", tags=["auth"])


class Credentials(BaseModel):
    email: str = Field(min_length=3)
    password: str = Field(min_length=1)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if "@" not in normalized:
            raise ValueError("Email không hợp lệ.")
        local, _, domain = normalized.partition("@")
        if not local or "." not in domain:
            raise ValueError("Email không hợp lệ.")
        return normalized


class RegisterInput(Credentials):
    displayName: str = Field(min_length=1)


class UserProfile(BaseModel):
    id: str
    email: str
    displayName: str
    avatarUrl: str | None = None


class PlanInfo(BaseModel):
    tier: str
    label: str
    renewsAt: str | None = None
    dailyScanLimit: int


class Session(BaseModel):
    token: str
    user: UserProfile
    plan: PlanInfo


class ScanRecord(BaseModel):
    id: str
    timestamp: str
    type: str
    score: int
    riskLevel: str


class ApiKeyInfo(BaseModel):
    key: str
    createdAt: str


@dataclass
class DevUser:
    id: str
    email: str
    display_name: str
    password_salt: str
    password_hash: str
    plan_tier: str
    api_key: ApiKeyInfo


@dataclass(frozen=True)
class AuthenticatedSession:
    token: str
    user: DevUser


@dataclass(frozen=True)
class SessionRecord:
    email: str
    expires_at: float


USERS: dict[str, DevUser] = {}
SESSIONS: dict[str, SessionRecord] = {}
PASSWORD_ITERATIONS = 600_000
SESSION_TTL_SECONDS = 12 * 60 * 60
DUMMY_PASSWORD_SALT = "00" * 16
bearer_scheme = HTTPBearer(auto_error=False)
BearerCredentials = Annotated[
    HTTPAuthorizationCredentials | None,
    Depends(bearer_scheme),
]


def create_api_key() -> ApiKeyInfo:
    return ApiKeyInfo(
        key="sk-dev-" + secrets.token_hex(24),
        createdAt=datetime.now().strftime("%d/%m %H:%M"),
    )


def hash_password(password: str, salt: str) -> str:
    return pbkdf2_hmac(
        "sha256",
        password.encode(),
        bytes.fromhex(salt),
        PASSWORD_ITERATIONS,
    ).hex()


DUMMY_PASSWORD_HASH = hash_password("invalid", DUMMY_PASSWORD_SALT)


def session_key(token: str) -> str:
    return sha256(token.encode()).hexdigest()


def unauthorized() -> NoReturn:
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Phiên đăng nhập không hợp lệ hoặc đã hết hạn.",
        headers={"WWW-Authenticate": "Bearer"},
    )


def require_session(credentials: BearerCredentials) -> AuthenticatedSession:
    if credentials is None or credentials.scheme.lower() != "bearer":
        unauthorized()

    token = credentials.credentials
    key = session_key(token)
    record = SESSIONS.get(key)
    if record is None or record.expires_at <= time.time():
        SESSIONS.pop(key, None)
        unauthorized()

    user = USERS.get(record.email)
    if user is None:
        unauthorized()
    return AuthenticatedSession(token=token, user=user)


CurrentSession = Annotated[AuthenticatedSession, Depends(require_session)]


def infer_plan_tier(email: str) -> str:
    local = email.split("@", 1)[0].lower()
    if "team" in local:
        return "team"
    if "pro" in local or "demo" in local:
        return "pro"
    return "free"


def build_plan_info(tier: str) -> PlanInfo:
    labels = {"free": "FREE", "pro": "PRO", "team": "TEAM"}
    return PlanInfo(
        tier=tier,
        label=labels.get(tier, "FREE"),
        renewsAt=None if tier == "free" else (date.today() + timedelta(days=30)).strftime("%d/%m/%Y"),
        dailyScanLimit=50 if tier == "free" else 999_999,
    )


def create_user(email: str, password: str, display_name: str, plan_tier: str | None = None) -> DevUser:
    normalized = email.strip().lower()
    salt = secrets.token_hex(16)
    user = DevUser(
        id=secrets.token_urlsafe(12),
        email=normalized,
        display_name=display_name.strip(),
        password_salt=salt,
        password_hash=hash_password(password, salt),
        plan_tier=plan_tier or infer_plan_tier(normalized),
        api_key=create_api_key(),
    )
    USERS[normalized] = user
    return user


def build_session(user: DevUser) -> Session:
    token = secrets.token_urlsafe(32)
    SESSIONS[session_key(token)] = SessionRecord(
        email=user.email,
        expires_at=time.time() + SESSION_TTL_SECONDS,
    )
    return Session(
        token=token,
        user=UserProfile(
            id=user.id,
            email=user.email,
            displayName=user.display_name,
        ),
        plan=build_plan_info(user.plan_tier),
    )


def verify_user(email: str, password: str) -> DevUser:
    normalized = email.strip().lower()
    user = USERS.get(normalized)
    salt = user.password_salt if user is not None else DUMMY_PASSWORD_SALT
    expected_hash = user.password_hash if user is not None else DUMMY_PASSWORD_HASH
    supplied_hash = hash_password(password, salt)
    if user is None or not hmac.compare_digest(supplied_hash, expected_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không đúng.",
        )
    return user


def seed_demo_user() -> None:
    if "demo@aisec.local" not in USERS:
        create_user("demo@aisec.local", "Demo@123456", "Demo User", "pro")


seed_demo_user()


@router.post("/auth/login", response_model=Session)
def login(cred: Credentials) -> Session:
    return build_session(verify_user(str(cred.email), cred.password))


@router.post("/auth/register", response_model=Session)
def register(cred: RegisterInput) -> Session:
    email = str(cred.email).strip().lower()
    if email in USERS:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email đã được đăng ký.",
        )
    return build_session(create_user(email, cred.password, cred.displayName))


@router.post("/auth/logout")
def logout(auth: CurrentSession) -> dict[str, bool]:
    SESSIONS.pop(session_key(auth.token), None)
    return {"ok": True}


@router.get("/account/plan", response_model=PlanInfo)
def get_plan(auth: CurrentSession) -> PlanInfo:
    return build_plan_info(auth.user.plan_tier)


@router.get("/account/history", response_model=list[ScanRecord])
def get_scan_history(auth: CurrentSession) -> list[ScanRecord]:
    del auth
    return []


@router.get("/account/api-key", response_model=ApiKeyInfo)
def get_api_key(auth: CurrentSession) -> ApiKeyInfo:
    return auth.user.api_key


@router.post("/account/api-key/rotate", response_model=ApiKeyInfo)
def rotate_api_key(auth: CurrentSession) -> ApiKeyInfo:
    auth.user.api_key = create_api_key()
    return auth.user.api_key
