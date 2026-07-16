"""Database-backed authentication, sessions, API keys, and account endpoints."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Annotated, NoReturn

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from backend.db import get_db
from backend.models import ApiKey, DailyQuotaUsage, ScanEvent, SessionRecord, Subscription, User
from backend.security_utils import (
    create_api_key_value,
    create_password_salt,
    create_session_token,
    format_short_datetime,
    hash_api_key,
    hash_metadata,
    hash_password,
    mask_api_key,
    session_key,
    utcnow,
    verify_password,
)

router = APIRouter(prefix="/v1", tags=["auth"])
bearer_scheme = HTTPBearer(auto_error=False)
BearerCredentials = Annotated[
    HTTPAuthorizationCredentials | None,
    Depends(bearer_scheme),
]

SESSION_TTL_SECONDS = 12 * 60 * 60


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

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if len(value) < 12:
            raise ValueError("Mật khẩu phải có ít nhất 12 ký tự.")
        if len(value) > 256:
            raise ValueError("Mật khẩu không được vượt quá 256 ký tự.")
        if not any(char.isalpha() for char in value) or not any(char.isdigit() for char in value):
            raise ValueError("Mật khẩu phải chứa cả chữ và số.")
        return value


class ProfileUpdate(BaseModel):
    displayName: str = Field(min_length=1, max_length=200)

    @field_validator("displayName")
    @classmethod
    def normalize_display_name(cls, value: str) -> str:
        normalized = " ".join(value.split())
        if not normalized:
            raise ValueError("Tên hiển thị không được để trống.")
        return normalized


class PasswordChange(BaseModel):
    currentPassword: str = Field(min_length=1, max_length=256)
    newPassword: str = Field(min_length=12, max_length=256)

    @field_validator("newPassword")
    @classmethod
    def validate_new_password(cls, value: str) -> str:
        if not any(char.isalpha() for char in value) or not any(char.isdigit() for char in value):
            raise ValueError("Mật khẩu mới phải chứa cả chữ và số.")
        return value


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
    prefix: str
    lastUsedAt: str | None = None
    scopes: list[str] = Field(default_factory=list)
    status: str = "active"
    secretAvailable: bool = False


class ApiKeyRotateInput(BaseModel):
    scopes: list[str] = Field(
        default_factory=lambda: [
            "assess:url", "assess:content", "assess:prompt", "assess:file",
            "assess:action", "mcp:invoke",
        ],
        max_length=20,
    )

    @field_validator("scopes")
    @classmethod
    def validate_scopes(cls, scopes: list[str]) -> list[str]:
        allowed = {
            "assess:url", "assess:content", "assess:prompt", "assess:file",
            "assess:action", "mcp:invoke", "logs:read",
        }
        normalized = list(dict.fromkeys(scopes))
        if not normalized or any(scope not in allowed for scope in normalized):
            raise ValueError("API key scope không hợp lệ.")
        return normalized


class QuotaInfo(BaseModel):
    usageDay: str
    usedToday: int
    dailyScanLimit: int
    remaining: int


@dataclass(frozen=True)
class AuthenticatedSession:
    token: str
    user: User
    db_session_id: str


@dataclass(frozen=True)
class ActorContext:
    user: User | None = None
    api_key: ApiKey | None = None
    channel: str = "web"
    anonymous_id: str | None = None


def unauthorized() -> NoReturn:
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Phiên đăng nhập không hợp lệ hoặc đã hết hạn.",
        headers={"WWW-Authenticate": "Bearer"},
    )


def infer_plan_tier(email: str) -> str:
    local = email.split("@", 1)[0].lower()
    if "team" in local:
        return "team"
    if "pro" in local or "demo" in local:
        return "pro"
    return "free"


def _active_subscription(db: DbSession, user_id: str) -> Subscription | None:
    return db.execute(
        select(Subscription)
        .where(Subscription.user_id == user_id, Subscription.status.in_(("trialing", "active")))
        .order_by(Subscription.created_at.desc())
    ).scalar_one_or_none()


def build_plan_info(db: DbSession, user_id: str) -> PlanInfo:
    subscription = _active_subscription(db, user_id)
    if subscription is None:
        return PlanInfo(tier="free", label="FREE", renewsAt=None, dailyScanLimit=50)

    plan = subscription.plan
    renews_at = subscription.renews_at
    if renews_at is None and subscription.plan_tier != "free":
        renews_at = datetime.combine(date.today() + timedelta(days=30), datetime.min.time())
    return PlanInfo(
        tier=subscription.plan_tier,
        label=plan.label if plan is not None else subscription.plan_tier.upper(),
        renewsAt=renews_at.strftime("%d/%m/%Y") if renews_at is not None else None,
        dailyScanLimit=plan.daily_scan_limit if plan and plan.daily_scan_limit is not None else 999_999,
    )


def _create_api_key_record(
    db: DbSession,
    user_id: str,
    scopes: list[str] | None = None,
    rotated_from_id: str | None = None,
) -> tuple[ApiKey, str]:
    key = create_api_key_value()
    record = ApiKey(
        user_id=user_id,
        key_prefix=key[:16],
        key_tail=key[-4:],
        key_hash=hash_api_key(key),
        scopes=scopes or [
            "assess:url", "assess:content", "assess:prompt", "assess:file",
            "assess:action", "mcp:invoke",
        ],
        rotated_from_id=rotated_from_id,
        created_at=utcnow(),
    )
    db.add(record)
    db.flush()
    return record, key


def _active_api_key(db: DbSession, user_id: str) -> ApiKey:
    record = db.execute(
        select(ApiKey)
        .where(ApiKey.user_id == user_id, ApiKey.status == "active")
        .order_by(ApiKey.created_at.desc())
    ).scalar_one_or_none()
    if record is None:
        record, _ = _create_api_key_record(db, user_id)
        db.commit()
        db.refresh(record)
    return record


def _api_key_info(record: ApiKey, plaintext: str | None = None) -> ApiKeyInfo:
    return ApiKeyInfo(
        key=plaintext if plaintext is not None else mask_api_key(record.key_prefix, record.key_tail),
        createdAt=format_short_datetime(record.created_at),
        prefix=record.key_prefix,
        lastUsedAt=format_short_datetime(record.last_used_at) if record.last_used_at else None,
        scopes=list(record.scopes or []),
        status=record.status,
        secretAvailable=plaintext is not None,
    )


def create_user(
    db: DbSession, email: str, password: str, display_name: str, plan_tier: str | None = None
) -> User:
    normalized = email.strip().lower()
    salt = create_password_salt()
    user = User(
        email=normalized,
        display_name=display_name.strip(),
        password_salt=salt,
        password_hash=hash_password(password, salt),
    )
    db.add(user)
    db.flush()
    db.add(Subscription(user_id=user.id, plan_tier=plan_tier or infer_plan_tier(normalized)))
    _create_api_key_record(db, user.id)
    db.commit()
    db.refresh(user)
    return user


def build_session(db: DbSession, user: User, request: Request | None = None) -> Session:
    token = create_session_token()
    db_record = SessionRecord(
        user_id=user.id,
        token_hash=session_key(token),
        expires_at=utcnow() + timedelta(seconds=SESSION_TTL_SECONDS),
        source_ip_hash=hash_metadata(request.client.host if request and request.client else None),
        user_agent_hash=hash_metadata(request.headers.get("user-agent") if request else None),
    )
    user.last_login_at = utcnow()
    db.add(db_record)
    db.commit()
    return Session(
        token=token,
        user=UserProfile(id=user.id, email=user.email, displayName=user.display_name),
        plan=build_plan_info(db, user.id),
    )


def verify_user(db: DbSession, email: str, password: str) -> User:
    normalized = email.strip().lower()
    user = db.execute(select(User).where(User.email == normalized)).scalar_one_or_none()
    if user is None or user.status != "active" or not verify_password(
        password, user.password_salt, user.password_hash
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không đúng.",
        )
    return user


def require_session(
    credentials: BearerCredentials,
    db: DbSession = Depends(get_db),
) -> AuthenticatedSession:
    if credentials is None or credentials.scheme.lower() != "bearer":
        unauthorized()

    token_hash = session_key(credentials.credentials)
    record = db.execute(
        select(SessionRecord).where(SessionRecord.token_hash == token_hash)
    ).scalar_one_or_none()
    if record is None or record.revoked_at is not None or record.expires_at <= utcnow():
        if record is not None:
            db.delete(record)
            db.commit()
        unauthorized()

    user = db.get(User, record.user_id)
    if user is None or user.status != "active":
        unauthorized()
    return AuthenticatedSession(token=credentials.credentials, user=user, db_session_id=record.id)


CurrentSession = Annotated[AuthenticatedSession, Depends(require_session)]


def require_admin(auth: CurrentSession) -> AuthenticatedSession:
    if auth.user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền quản trị.",
        )
    return auth


def resolve_actor(
    credentials: HTTPAuthorizationCredentials | None,
    db: DbSession,
    request: Request | None = None,
) -> ActorContext:
    if credentials is None:
        source = request.client.host if request and request.client else "anonymous"
        return ActorContext(channel="web", anonymous_id=hash_metadata(source))

    if credentials.scheme.lower() != "bearer":
        unauthorized()

    raw = credentials.credentials
    token_hash = session_key(raw)
    session = db.execute(
        select(SessionRecord).where(SessionRecord.token_hash == token_hash)
    ).scalar_one_or_none()
    if session is not None and session.revoked_at is None and session.expires_at > utcnow():
        user = db.get(User, session.user_id)
        if user is not None and user.status == "active":
            return ActorContext(user=user, channel="web")

    api_key = db.execute(select(ApiKey).where(ApiKey.key_hash == hash_api_key(raw))).scalar_one_or_none()
    if (
        api_key is not None
        and api_key.status == "active"
        and api_key.revoked_at is None
        and (api_key.expires_at is None or api_key.expires_at > utcnow())
    ):
        user = db.get(User, api_key.user_id)
        if user is not None and user.status == "active":
            api_key.last_used_at = utcnow()
            db.commit()
            return ActorContext(user=user, api_key=api_key, channel="api")

    unauthorized()


@router.post("/auth/login", response_model=Session)
def login(
    cred: Credentials,
    request: Request,
    db: DbSession = Depends(get_db),
) -> Session:
    return build_session(db, verify_user(db, str(cred.email), cred.password), request)


@router.post("/auth/register", response_model=Session)
def register(
    cred: RegisterInput,
    request: Request,
    db: DbSession = Depends(get_db),
) -> Session:
    email = str(cred.email).strip().lower()
    existing = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email đã được đăng ký.",
        )
    return build_session(db, create_user(db, email, cred.password, cred.displayName), request)


@router.post("/auth/logout")
def logout(auth: CurrentSession, db: DbSession = Depends(get_db)) -> dict[str, bool]:
    record = db.get(SessionRecord, auth.db_session_id)
    if record is not None:
        record.revoked_at = utcnow()
        db.commit()
    return {"ok": True}


@router.get("/account/plan", response_model=PlanInfo)
def get_plan(auth: CurrentSession, db: DbSession = Depends(get_db)) -> PlanInfo:
    return build_plan_info(db, auth.user.id)


@router.post("/account/subscription/cancel", response_model=PlanInfo)
def cancel_subscription(auth: CurrentSession, db: DbSession = Depends(get_db)) -> PlanInfo:
    subscription = _active_subscription(db, auth.user.id)
    if subscription is None or subscription.plan_tier == "free":
        raise HTTPException(status_code=409, detail="Tài khoản không có gói trả phí đang hoạt động.")
    subscription.status = "canceled"
    subscription.canceled_at = utcnow()
    db.add(Subscription(user_id=auth.user.id, plan_tier="free", status="active"))
    db.commit()
    return build_plan_info(db, auth.user.id)


@router.patch("/account/profile", response_model=UserProfile)
def update_profile(
    payload: ProfileUpdate,
    auth: CurrentSession,
    db: DbSession = Depends(get_db),
) -> UserProfile:
    auth.user.display_name = payload.displayName
    db.commit()
    db.refresh(auth.user)
    return UserProfile(
        id=auth.user.id,
        email=auth.user.email,
        displayName=auth.user.display_name,
        avatarUrl=auth.user.avatar_url,
    )


@router.post("/account/password")
def change_password(
    payload: PasswordChange,
    auth: CurrentSession,
    db: DbSession = Depends(get_db),
) -> dict[str, bool]:
    if not verify_password(
        payload.currentPassword,
        auth.user.password_salt,
        auth.user.password_hash,
    ):
        raise HTTPException(status_code=400, detail="Mật khẩu hiện tại không đúng.")
    if verify_password(payload.newPassword, auth.user.password_salt, auth.user.password_hash):
        raise HTTPException(status_code=400, detail="Mật khẩu mới phải khác mật khẩu hiện tại.")

    salt = create_password_salt()
    auth.user.password_salt = salt
    auth.user.password_hash = hash_password(payload.newPassword, salt)
    db.execute(
        SessionRecord.__table__.update()
        .where(
            SessionRecord.user_id == auth.user.id,
            SessionRecord.id != auth.db_session_id,
            SessionRecord.revoked_at.is_(None),
        )
        .values(revoked_at=utcnow())
    )
    db.commit()
    return {"ok": True}


@router.get("/account/history", response_model=list[ScanRecord])
def get_scan_history(auth: CurrentSession, db: DbSession = Depends(get_db)) -> list[ScanRecord]:
    rows = db.execute(
        select(ScanEvent)
        .where(ScanEvent.user_id == auth.user.id)
        .order_by(ScanEvent.created_at.desc())
        .limit(200)
    ).scalars()
    records: list[ScanRecord] = []
    for row in rows:
        scan_type = "URL" if row.modality == "url" else "Email"
        records.append(
            ScanRecord(
                id=row.request_id,
                timestamp=format_short_datetime(row.created_at),
                type=scan_type,
                score=round(row.risk_score * 100),
                riskLevel=row.risk_level,
            )
        )
    return records


@router.get("/account/api-key", response_model=ApiKeyInfo)
def get_api_key(auth: CurrentSession, db: DbSession = Depends(get_db)) -> ApiKeyInfo:
    return _api_key_info(_active_api_key(db, auth.user.id))


@router.get("/account/quota", response_model=QuotaInfo)
def get_quota(auth: CurrentSession, db: DbSession = Depends(get_db)) -> QuotaInfo:
    today = date.today()
    plan = build_plan_info(db, auth.user.id)
    usage = db.execute(
        select(DailyQuotaUsage).where(
            DailyQuotaUsage.user_id == auth.user.id,
            DailyQuotaUsage.usage_day == today,
        )
    ).scalar_one_or_none()
    used = usage.scan_count if usage is not None else 0
    limit = plan.dailyScanLimit
    remaining = max(0, limit - used) if limit < 999_999 else 999_999
    return QuotaInfo(
        usageDay=today.isoformat(),
        usedToday=used,
        dailyScanLimit=limit,
        remaining=remaining,
    )


@router.post("/account/api-key/rotate", response_model=ApiKeyInfo)
def rotate_api_key(
    auth: CurrentSession,
    payload: ApiKeyRotateInput = ApiKeyRotateInput(),
    db: DbSession = Depends(get_db),
) -> ApiKeyInfo:
    current = list(db.execute(
        select(ApiKey)
        .where(ApiKey.user_id == auth.user.id, ApiKey.status == "active")
        .order_by(ApiKey.created_at.desc())
    ).scalars())
    previous_id = current[0].id if current else None
    for key in current:
        key.status = "revoked"
        key.revoked_at = utcnow()
    record, plaintext = _create_api_key_record(
        db, auth.user.id, payload.scopes, rotated_from_id=previous_id
    )
    db.commit()
    db.refresh(record)
    return _api_key_info(record, plaintext)


@router.delete("/account/api-key")
def revoke_api_key(auth: CurrentSession, db: DbSession = Depends(get_db)) -> dict[str, bool]:
    keys = db.execute(
        select(ApiKey).where(ApiKey.user_id == auth.user.id, ApiKey.status == "active")
    ).scalars()
    for key in keys:
        key.status = "revoked"
        key.revoked_at = utcnow()
    db.commit()
    return {"ok": True}
