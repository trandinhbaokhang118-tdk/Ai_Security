"""Production sandbox entitlement API: Free Web, Pro EXE, and Max GPU."""
from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import re
import secrets
import time
from datetime import timedelta
from urllib.parse import quote

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session as DbSession

from backend.config import settings
from backend.db import get_db
from backend.models import CloudSandboxSession, PaymentOrder, SandboxWallet, Subscription
from backend.routers.auth import CurrentSession
from backend.security_utils import utcnow
from backend.services.cloud_sandbox_service import cloud_sandbox_service
from security.free_web_sandbox import free_web_sandbox

router = APIRouter(prefix="/v1/sandbox-cloud", tags=["sandbox-cloud"])
TIER_RANK = {"free": 0, "pro": 1, "max": 2}
FREE_DAILY_SESSION_LIMIT = 10
PRO_MONTHLY_PRICE_VND = 99_000
# The billing page advertises 79,000 VND/month when paid yearly (20% off).
PRO_YEARLY_PRICE_VND = 79_000 * 12
TIER_CAPABILITIES = {
    "free": {"web": True, "exe": False, "gpu": False, "minutes": 10, "provider": "local"},
    "pro": {"web": True, "exe": True, "gpu": False, "minutes": 15, "provider": "aws"},
    "max": {"web": True, "exe": True, "gpu": True, "minutes": 30, "provider": "aws"},
}


class BuyCreditsInput(BaseModel):
    credits: int = Field(default=1, ge=1, le=100)


class CreateSubscriptionPaymentInput(BaseModel):
    planTier: str = Field(pattern="^pro$")
    billingPeriod: str = Field(pattern="^(monthly|yearly)$")


class CreateSessionInput(BaseModel):
    tier: str = "free"


class FreeNavigateInput(BaseModel):
    url: str = Field(min_length=1, max_length=2048)


class FreeClickInput(BaseModel):
    x: float = Field(ge=0, le=1280)
    y: float = Field(ge=0, le=720)


class FreeKeyInput(BaseModel):
    key: str = Field(min_length=1, max_length=40)


class FreeTypeInput(BaseModel):
    text: str = Field(max_length=500)


class SePayWebhook(BaseModel):
    id: str | int | None = None
    transferAmount: int | float = 0
    transferType: str = ""
    content: str = ""
    referenceCode: str | None = None


def verify_sepay_webhook_hmac(
    raw_body: bytes,
    signature: str | None,
    timestamp: str | None,
    secret: str,
    *,
    now: int | None = None,
) -> bool:
    """Verify SePay's ``sha256={hex}`` signature and reject replayed requests."""
    if not signature or not timestamp:
        return False
    signed_timestamp = timestamp.strip()
    try:
        timestamp_seconds = int(signed_timestamp)
    except (TypeError, ValueError):
        return False
    current_time = int(time.time()) if now is None else now
    if abs(current_time - timestamp_seconds) > 300:
        return False
    expected = "sha256=" + hmac.new(
        secret.encode("utf-8"),
        f"{signed_timestamp}.".encode() + raw_body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(signature.strip(), expected)


def is_incoming_sepay_transaction(transfer_type: str) -> bool:
    """Only incoming transfers can settle an order, even if a webhook is misconfigured."""
    return transfer_type.strip().lower() in {"in", "income", "incoming"}


def wallet_for(db: DbSession, user_id: str) -> SandboxWallet:
    wallet = db.get(SandboxWallet, user_id)
    if wallet is None:
        wallet = SandboxWallet(user_id=user_id, credits=0)
        db.add(wallet)
        db.flush()
    return wallet


def make_sepay_qr_url(amount_vnd: int, reference: str) -> str:
    """Create a dynamic VietQR image containing the fixed order amount and reference."""
    if not settings.sepay_bank_account or not settings.sepay_bank_name:
        return ""
    base = settings.sepay_qr_base_url.rstrip("/")
    account = quote(settings.sepay_bank_account, safe="")
    bank = quote(settings.sepay_bank_name, safe="")
    content = quote(reference, safe="")
    return f"{base}?acc={account}&bank={bank}&amount={amount_vnd}&des={content}"


def subscription_payment_dict(order: PaymentOrder) -> dict:
    return {
        "orderId": order.id,
        "reference": order.reference,
        "amountVnd": order.amount_vnd,
        "planTier": order.plan_tier,
        "billingPeriod": order.billing_period,
        "expiresAt": order.expires_at.isoformat() if order.expires_at else None,
        "bankAccount": settings.sepay_bank_account,
        "bankName": settings.sepay_bank_name,
        "accountName": settings.sepay_account_name,
        "transferContent": order.reference,
        "qrUrl": make_sepay_qr_url(order.amount_vnd, order.reference),
        "status": order.status,
    }


def activate_subscription(db: DbSession, order: PaymentOrder) -> None:
    """Idempotently replace the active plan only after an exact paid order."""
    if not order.plan_tier or not order.billing_period:
        return
    now = utcnow()
    db.execute(
        Subscription.__table__.update()
        .where(
            Subscription.user_id == order.user_id,
            Subscription.status.in_(("trialing", "active")),
        )
        .values(status="canceled", canceled_at=now)
    )
    days = 365 if order.billing_period == "yearly" else 30
    db.add(
        Subscription(
            user_id=order.user_id,
            plan_tier=order.plan_tier,
            status="active",
            provider="sepay",
            provider_subscription_id=order.id,
            renews_at=now + timedelta(days=days),
        )
    )


def account_tier(db: DbSession, user_id: str) -> str:
    row = db.execute(
        select(Subscription).where(
            Subscription.user_id == user_id,
            Subscription.status.in_(("trialing", "active")),
        ).order_by(Subscription.created_at.desc())
    ).scalar_one_or_none()
    tier = row.plan_tier if row else "free"
    if tier in {"team", "enterprise"}:
        return "max"
    return tier if tier in TIER_RANK else "free"


def session_dict(row: CloudSandboxSession) -> dict:
    return {
        "id": row.id, "tier": row.sandbox_tier, "status": row.status,
        "remoteUrl": row.remote_url, "expiresAt": row.expires_at.isoformat(), "error": row.error,
    }


@router.get("/status")
def get_status(auth: CurrentSession, db: DbSession = Depends(get_db)) -> dict:
    wallet = wallet_for(db, auth.user.id)
    plan = account_tier(db, auth.user.id)
    active = db.execute(
        select(CloudSandboxSession).where(
            CloudSandboxSession.user_id == auth.user.id,
            CloudSandboxSession.status.in_(("provisioning", "ready")),
        ).order_by(CloudSandboxSession.created_at.desc())
    ).scalar_one_or_none()
    if active is not None and active.expires_at <= utcnow():
        if active.sandbox_tier == "free":
            free_web_sandbox.close(active.id)
        active.status = "expired"
        active.terminated_at = utcnow()
        active = None
    db.commit()
    return {
        "accountTier": plan, "credits": wallet.credits,
        "availableTiers": [
            {"tier": tier, **capability, "allowed": TIER_RANK[plan] >= TIER_RANK[tier]}
            for tier, capability in TIER_CAPABILITIES.items()
        ],
        "cloudConfigured": cloud_sandbox_service.configured(),
        "freeConfigured": True,
        "session": session_dict(active) if active else None,
    }


@router.post("/payments")
def create_payment(payload: BuyCreditsInput, auth: CurrentSession, db: DbSession = Depends(get_db)) -> dict:
    reference = f"PW{secrets.token_hex(6).upper()}"
    order = PaymentOrder(
        user_id=auth.user.id, reference=reference, credits=payload.credits,
        amount_vnd=payload.credits * settings.sandbox_credit_price_vnd,
    )
    db.add(order)
    db.commit()
    return {
        "orderId": order.id, "reference": reference, "amountVnd": order.amount_vnd,
        "credits": order.credits, "bankAccount": settings.sepay_bank_account,
        "bankName": settings.sepay_bank_name, "accountName": settings.sepay_account_name,
        "transferContent": reference, "status": order.status,
    }


@router.post("/subscription-payments")
def create_subscription_payment(
    payload: CreateSubscriptionPaymentInput,
    auth: CurrentSession,
    db: DbSession = Depends(get_db),
) -> dict:
    if not settings.sepay_bank_account or not settings.sepay_bank_name:
        raise HTTPException(503, "Thanh toán SePay chưa được cấu hình.")
    amount = PRO_YEARLY_PRICE_VND if payload.billingPeriod == "yearly" else PRO_MONTHLY_PRICE_VND
    reference = f"PP{secrets.token_hex(6).upper()}"
    order = PaymentOrder(
        user_id=auth.user.id,
        reference=reference,
        amount_vnd=amount,
        credits=0,
        plan_tier=payload.planTier,
        billing_period=payload.billingPeriod,
        expires_at=utcnow() + timedelta(minutes=settings.sepay_payment_expiry_minutes),
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return subscription_payment_dict(order)


@router.get("/subscription-payments/{order_id}")
def get_subscription_payment(order_id: str, auth: CurrentSession, db: DbSession = Depends(get_db)) -> dict:
    order = db.get(PaymentOrder, order_id)
    if order is None or order.user_id != auth.user.id or order.plan_tier is None:
        raise HTTPException(404, "Không tìm thấy đơn thanh toán gói.")
    if order.status == "pending" and order.expires_at is not None and order.expires_at <= utcnow():
        order.status = "expired"
        db.commit()
        db.refresh(order)
    return subscription_payment_dict(order)


@router.post("/webhooks/sepay")
async def sepay_webhook(
    request: Request,
    db: DbSession = Depends(get_db),
    authorization: str | None = Header(default=None),
    x_sepay_signature: str | None = Header(default=None),
    x_sepay_timestamp: str | None = Header(default=None),
) -> dict:
    raw_body = await request.body()
    if settings.sepay_webhook_secret:
        if not verify_sepay_webhook_hmac(
            raw_body, x_sepay_signature, x_sepay_timestamp, settings.sepay_webhook_secret,
        ):
            raise HTTPException(401, "Chữ ký webhook không hợp lệ")
    else:
        supplied = (authorization or "").removeprefix("Apikey ").removeprefix("Bearer ").strip()
        if not settings.sepay_webhook_api_key or not secrets.compare_digest(supplied, settings.sepay_webhook_api_key):
            raise HTTPException(401, "Webhook không hợp lệ")
    try:
        payload = SePayWebhook.model_validate(json.loads(raw_body))
    except (json.JSONDecodeError, ValueError) as exc:
        raise HTTPException(400, "Dữ liệu webhook JSON không hợp lệ") from exc
    if not is_incoming_sepay_transaction(payload.transferType):
        return {"success": True, "ignored": "not_incoming"}
    match = re.search(r"\b((?:PW|PP)[A-F0-9]{12})\b", payload.content.upper())
    if not match:
        return {"success": True, "ignored": "missing_reference"}
    order = db.execute(select(PaymentOrder).where(PaymentOrder.reference == match.group(1))).scalar_one_or_none()
    if order is None or order.status == "expired" or (order.expires_at is not None and order.expires_at <= utcnow()):
        return {"success": True, "ignored": "unknown_or_expired"}
    if payload.transferAmount < order.amount_vnd:
        return {"success": True, "ignored": "insufficient"}
    transaction_id = str(payload.id or payload.referenceCode or "")
    duplicate = transaction_id and db.execute(
        select(PaymentOrder).where(PaymentOrder.provider_transaction_id == transaction_id)
    ).scalar_one_or_none()
    if duplicate:
        return {"success": True, "duplicate": True}
    if order.status != "paid":
        order.status = "paid"
        order.paid_at = utcnow()
        order.provider_transaction_id = transaction_id or None
        order.provider_payload = payload.model_dump()
        if order.plan_tier:
            activate_subscription(db, order)
        else:
            wallet_for(db, order.user_id).credits += order.credits
        db.commit()
    return {"success": True}


async def provision_task(session_id: str) -> None:
    from backend.db import SessionLocal
    with SessionLocal() as db:
        row = db.get(CloudSandboxSession, session_id)
        if row is None:
            return
        try:
            instance_id, remote_url = await asyncio.to_thread(
                cloud_sandbox_service.provision, row.id, row.user_id,
                row.expires_at.isoformat(), row.sandbox_tier,
            )
            row.provider_instance_id = instance_id
            row.remote_url = remote_url
            row.status = "ready"
        except Exception as exc:
            row.status = "failed"
            row.error = str(exc)[:1000]
            wallet_for(db, row.user_id).credits += 1
        db.commit()


@router.post("/sessions")
async def create_session(
    payload: CreateSessionInput, auth: CurrentSession, db: DbSession = Depends(get_db),
) -> dict:
    requested = payload.tier.lower()
    if requested not in TIER_RANK:
        raise HTTPException(400, "Tier Sandbox không hợp lệ")
    plan = account_tier(db, auth.user.id)
    if TIER_RANK[requested] > TIER_RANK[plan]:
        raise HTTPException(403, f"Gói {plan.upper()} không được dùng Sandbox {requested.upper()}")
    existing = db.execute(select(CloudSandboxSession).where(
        CloudSandboxSession.user_id == auth.user.id,
        CloudSandboxSession.status.in_(("provisioning", "ready")),
    )).scalar_one_or_none()
    if existing:
        return session_dict(existing)

    capability = TIER_CAPABILITIES[requested]
    if requested == "free":
        start = utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        used = db.scalar(
            select(func.count())
            .select_from(CloudSandboxSession)
            .where(
                CloudSandboxSession.user_id == auth.user.id,
                CloudSandboxSession.sandbox_tier == "free",
                CloudSandboxSession.created_at >= start,
                CloudSandboxSession.status != "failed",
            )
        ) or 0
        if used >= FREE_DAILY_SESSION_LIMIT:
            raise HTTPException(
                429,
                f"Bạn đã dùng hết {FREE_DAILY_SESSION_LIMIT} phiên Free hôm nay",
            )
        row = CloudSandboxSession(
            user_id=auth.user.id, sandbox_tier="free", provider="local", status="ready",
            remote_url=None,
            expires_at=utcnow() + timedelta(minutes=capability["minutes"]),
        )
    else:
        wallet = wallet_for(db, auth.user.id)
        if wallet.credits < 1:
            raise HTTPException(402, "Bạn cần mua một lượt Sandbox")
        wallet.credits -= 1
        row = CloudSandboxSession(
            user_id=auth.user.id, sandbox_tier=requested, provider="aws",
            expires_at=utcnow() + timedelta(minutes=capability["minutes"]),
        )
    db.add(row)
    db.commit()
    db.refresh(row)
    if requested == "free":
        try:
            await asyncio.to_thread(free_web_sandbox.create, row.id, row.expires_at)
        except Exception as exc:
            row.status = "failed"
            row.error = str(exc)[:1000]
            db.commit()
            raise HTTPException(503, f"Không khởi động được Free Sandbox: {exc}") from exc
    else:
        asyncio.create_task(provision_task(row.id))
    return session_dict(row)


@router.get("/sessions/{session_id}/browser")
def free_browser_state(session_id: str, auth: CurrentSession, db: DbSession = Depends(get_db)) -> dict:
    row = require_free_session(db, session_id, auth.user.id)
    try:
        return free_web_sandbox.state(session_id)
    except KeyError:
        # Local browser state is in memory and disappears when uvicorn reloads.
        # Recreate the temporary profile for a still-valid persisted session.
        if row.expires_at <= utcnow():
            raise HTTPException(410, "free_browser_session_expired") from None
        try:
            return free_web_sandbox.create(row.id, row.expires_at)
        except Exception as exc:
            raise HTTPException(503, f"Không khôi phục được Free Sandbox: {exc}") from exc
    except TimeoutError as exc:
        raise HTTPException(410, str(exc)) from exc


def require_free_session(db: DbSession, session_id: str, user_id: str) -> CloudSandboxSession:
    row = db.get(CloudSandboxSession, session_id)
    if row is None or row.user_id != user_id or row.sandbox_tier != "free" or row.status != "ready":
        raise HTTPException(404, "Không tìm thấy Free Sandbox đang chạy")
    return row


@router.post("/sessions/{session_id}/browser/navigate")
def free_browser_navigate(payload: FreeNavigateInput, session_id: str, auth: CurrentSession, db: DbSession = Depends(get_db)) -> dict:
    require_free_session(db, session_id, auth.user.id)
    try:
        return free_web_sandbox.navigate(session_id, payload.url)
    except PermissionError as exc:
        raise HTTPException(403, "URL nội bộ hoặc không công khai đã bị chặn") from exc
    except Exception as exc:
        raise HTTPException(502, f"Không mở được website: {exc}") from exc


@router.post("/sessions/{session_id}/browser/click")
def free_browser_click(payload: FreeClickInput, session_id: str, auth: CurrentSession, db: DbSession = Depends(get_db)) -> dict:
    require_free_session(db, session_id, auth.user.id)
    try:
        return free_web_sandbox.click(session_id, payload.x, payload.y)
    except TimeoutError as exc:
        raise HTTPException(410, "Phiên Free Sandbox đã hết hạn") from exc
    except KeyError as exc:
        raise HTTPException(409, "Trình duyệt Sandbox vừa được khởi động lại; hãy tải lại phiên") from exc
    except Exception as exc:
        raise HTTPException(502, f"Không thực hiện được thao tác click: {exc}") from exc


@router.post("/sessions/{session_id}/browser/key")
def free_browser_key(payload: FreeKeyInput, session_id: str, auth: CurrentSession, db: DbSession = Depends(get_db)) -> dict:
    require_free_session(db, session_id, auth.user.id)
    try:
        return free_web_sandbox.key(session_id, payload.key)
    except ValueError as exc:
        raise HTTPException(400, "Phím không được phép") from exc
    except TimeoutError as exc:
        raise HTTPException(410, "Phiên Free Sandbox đã hết hạn") from exc
    except KeyError as exc:
        raise HTTPException(409, "Trình duyệt Sandbox vừa được khởi động lại; hãy tải lại phiên") from exc
    except Exception as exc:
        raise HTTPException(502, f"Không gửi được phím vào Sandbox: {exc}") from exc


@router.post("/sessions/{session_id}/browser/type")
def free_browser_type(payload: FreeTypeInput, session_id: str, auth: CurrentSession, db: DbSession = Depends(get_db)) -> dict:
    require_free_session(db, session_id, auth.user.id)
    try:
        return free_web_sandbox.type_text(session_id, payload.text)
    except ValueError as exc:
        raise HTTPException(400, "Dữ liệu nhập không hợp lệ") from exc
    except TimeoutError as exc:
        raise HTTPException(410, "Phiên Free Sandbox đã hết hạn") from exc
    except KeyError as exc:
        raise HTTPException(409, "Trình duyệt Sandbox vừa được khởi động lại; hãy tải lại phiên") from exc
    except Exception as exc:
        raise HTTPException(502, f"Không điền được canary vào website: {exc}") from exc


@router.get("/sessions/{session_id}")
def get_session(session_id: str, auth: CurrentSession, db: DbSession = Depends(get_db)) -> dict:
    row = db.get(CloudSandboxSession, session_id)
    if row is None or row.user_id != auth.user.id:
        raise HTTPException(404, "Không tìm thấy phiên")
    return session_dict(row)


@router.delete("/sessions/{session_id}")
async def stop_session(session_id: str, auth: CurrentSession, db: DbSession = Depends(get_db)) -> dict:
    row = db.get(CloudSandboxSession, session_id)
    if row is None or row.user_id != auth.user.id:
        raise HTTPException(404, "Không tìm thấy phiên")
    if row.provider_instance_id:
        await asyncio.to_thread(cloud_sandbox_service.terminate, row.provider_instance_id)
    if row.sandbox_tier == "free":
        await asyncio.to_thread(free_web_sandbox.close, row.id)
    row.status = "terminated"
    row.terminated_at = utcnow()
    db.commit()
    return {"ok": True}
