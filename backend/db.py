"""Database engine, session lifecycle, and local bootstrap helpers."""

from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path
from threading import Lock

from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from backend.config import settings


class Base(DeclarativeBase):
    pass


def _connect_args() -> dict:
    if settings.database_url.startswith("sqlite"):
        return {"check_same_thread": False}
    return {}


def _ensure_sqlite_parent() -> None:
    if not settings.database_url.startswith("sqlite:///"):
        return
    raw_path = settings.database_url.removeprefix("sqlite:///")
    if raw_path and raw_path != ":memory:":
        Path(raw_path).parent.mkdir(parents=True, exist_ok=True)


_ensure_sqlite_parent()


def _engine_options() -> dict:
    if settings.database_url.startswith("sqlite"):
        return {"connect_args": _connect_args()}
    return {
        "pool_pre_ping": True,
        "pool_size": settings.database_pool_size,
        "max_overflow": settings.database_max_overflow,
        "pool_timeout": settings.database_pool_timeout,
        "pool_recycle": settings.database_pool_recycle,
    }


engine = create_engine(
    settings.database_url,
    echo=settings.database_echo,
    future=True,
    **_engine_options(),
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
_init_lock = Lock()
_database_initialized = False


def get_db() -> Iterator[Session]:
    initialize_database()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def initialize_database() -> None:
    """Create local/dev tables and seed reference data.

    Production should run Alembic migrations before app startup. The auto-create
    path keeps tests and local demos self-contained when PostgreSQL is not running.
    """

    global _database_initialized

    if _database_initialized:
        return

    with _init_lock:
        if _database_initialized:
            return

        if not settings.database_auto_create:
            _database_initialized = True
            return

        from backend import models  # noqa: F401  # register metadata
        from backend.models import ApiKey, Plan, Subscription, User
        from backend.security_utils import (
            create_api_key_value,
            create_password_salt,
            hash_api_key,
            hash_password,
            utcnow,
        )

        Base.metadata.create_all(bind=engine)

        with SessionLocal() as db:
            plans = {
                "free": ("FREE", 50, 0, 0, {"api_key": False, "history_days": 7}),
                "pro": ("PRO", None, 99000, 990000, {"api_key": True, "history_days": 90}),
                "team": (
                    "TEAM",
                    None,
                    299000,
                    2990000,
                    {"api_key": True, "history_days": 365, "mcp": True},
                ),
                "enterprise": (
                    "ENTERPRISE",
                    None,
                    None,
                    None,
                    {"api_key": True, "history_days": 730, "mcp": True, "sso": True},
                ),
            }
            for tier, (label, limit, monthly, yearly, features) in plans.items():
                if db.get(Plan, tier) is None:
                    db.add(
                        Plan(
                            tier=tier,
                            label=label,
                            daily_scan_limit=limit,
                            monthly_price_vnd=monthly,
                            yearly_price_vnd=yearly,
                            features=features,
                        )
                    )

            # Upgrade legacy development keys to the explicit Agent Shield scopes.
            default_scopes = [
                "assess:url", "assess:content", "assess:prompt", "assess:file",
                "assess:action", "mcp:invoke",
            ]
            for legacy_key in db.execute(select(ApiKey)).scalars():
                if not legacy_key.scopes or legacy_key.scopes == ["scan"]:
                    legacy_key.scopes = default_scopes

            # Every account owns at least one active integration credential.
            # Existing databases are backfilled idempotently during local/dev startup.
            for user in db.execute(select(User)).scalars():
                active_key = db.execute(
                    select(ApiKey).where(ApiKey.user_id == user.id, ApiKey.status == "active")
                ).scalar_one_or_none()
                if active_key is None:
                    key = create_api_key_value()
                    db.add(
                        ApiKey(
                            user_id=user.id,
                            key_prefix=key[:16],
                            key_tail=key[-4:],
                            key_hash=hash_api_key(key),
                            scopes=default_scopes,
                            created_at=utcnow(),
                        )
                    )

            demo = db.execute(select(User).where(User.email == "demo@aisec.local")).scalar_one_or_none()
            # The demo account is an end-user account.  It must never grant
            # access to system administration merely because it is convenient
            # for local development.
            if settings.seed_demo_user and demo is not None and demo.role != "user":
                demo.role = "user"
            if settings.seed_demo_user and demo is None:
                salt = create_password_salt()
                demo = User(
                    email="demo@aisec.local",
                    display_name="Demo User",
                    password_salt=salt,
                    password_hash=hash_password("Demo@123456", salt),
                    role="user",
                )
                db.add(demo)
                db.flush()
                db.add(Subscription(user_id=demo.id, plan_tier="pro", status="active"))
                key = create_api_key_value()
                db.add(
                    ApiKey(
                        user_id=demo.id,
                        key_prefix=key[:16],
                        key_tail=key[-4:],
                        key_hash=hash_api_key(key),
                        created_at=utcnow(),
                    )
                )
            db.commit()

        _database_initialized = True


def check_database() -> bool:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
