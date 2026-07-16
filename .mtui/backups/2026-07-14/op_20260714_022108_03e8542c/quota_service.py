"""Server-side scan quota enforcement backed by the database."""

from __future__ import annotations

from datetime import date

from fastapi import HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.config import settings
from backend.models import DailyQuotaUsage
from backend.routers.auth import ActorContext, build_plan_info
from backend.security_utils import hash_metadata, utcnow


def _identity(actor: ActorContext, request: Request) -> tuple[str | None, str | None, str | None]:
    if actor.api_key is not None:
        return None, actor.api_key.id, None
    if actor.user is not None:
        return actor.user.id, None, None
    source = actor.anonymous_id
    if not source:
        source = hash_metadata(request.client.host if request.client else "anonymous")
    return None, None, f"ip:{source}"


def _daily_limit(db: Session, actor: ActorContext) -> int | None:
    if actor.user is None:
        return settings.anonymous_daily_scan_limit
    plan = build_plan_info(db, actor.user.id)
    return None if plan.dailyScanLimit >= 999_999 else plan.dailyScanLimit


def reserve_scan_quota(db: Session, actor: ActorContext, request: Request) -> None:
    """Consume one scan unit atomically enough for app-level quota enforcement."""

    user_id, api_key_id, anonymous_id = _identity(actor, request)
    limit = _daily_limit(db, actor)
    today = date.today()

    for _ in range(2):
        try:
            query = select(DailyQuotaUsage).where(DailyQuotaUsage.usage_day == today)
            if user_id is not None:
                query = query.where(DailyQuotaUsage.user_id == user_id)
            elif api_key_id is not None:
                query = query.where(DailyQuotaUsage.api_key_id == api_key_id)
            else:
                query = query.where(DailyQuotaUsage.anonymous_id == anonymous_id)

            row = db.execute(query).scalar_one_or_none()
            if row is None:
                row = DailyQuotaUsage(
                    user_id=user_id,
                    api_key_id=api_key_id,
                    anonymous_id=anonymous_id,
                    usage_day=today,
                    scan_count=1,
                    limit_snapshot=limit,
                    last_scan_at=utcnow(),
                )
                db.add(row)
            else:
                if limit is not None and row.scan_count >= limit:
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail="Bạn đã hết lượt quét hôm nay.",
                    )
                row.scan_count += 1
                row.limit_snapshot = limit
                row.last_scan_at = utcnow()
            db.commit()
            return
        except IntegrityError:
            db.rollback()

    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="Không thể cập nhật quota, vui lòng thử lại.",
    )
