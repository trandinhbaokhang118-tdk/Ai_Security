"""Automated SePay credit purchase and disposable AWS sandbox sessions."""
from __future__ import annotations

import asyncio
import re
import secrets
from datetime import timedelta

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from backend.config import settings
from backend.db import get_db
from backend.models import CloudSandboxSession, PaymentOrder, SandboxWallet
from backend.routers.auth import CurrentSession
from backend.security_utils import utcnow
from backend.services.cloud_sandbox_service import cloud_sandbox_service

router = APIRouter(prefix="/v1/sandbox-cloud", tags=["sandbox-cloud"])


class BuyCreditsInput(BaseModel):
    credits: int = Field(default=1, ge=1, le=100)


class SePayWebhook(BaseModel):
    id: str | int | None = None
    transferAmount: int | float = 0
    content: str = ""
    transactionDate: str | None = None
    referenceCode: str | None = None


def wallet_for(db: DbSession, user_id: str) -> SandboxWallet:
    wallet = db.get(SandboxWallet, user_id)
    if wallet is None:
        wallet = SandboxWallet(user_id=user_id, credits=0)
        db.add(wallet)
        db.flush()
    return wallet


@router.get("/status")
def status(auth: CurrentSession, db: DbSession = Depends(get_db)) -> dict:
    wallet = wallet_for(db, auth.user.id)
    active = db.execute(select(CloudSandboxSession).where(
        CloudSandboxSession.user_id == auth.user.id,
        CloudSandboxSession.status.in_(("provisioning", "ready")),
    ).order_by(CloudSandboxSession.created_at.desc())).scalar_one_or_none()
    db.commit()
    return {"credits": wallet.credits, "configured": cloud_sandbox_service.configured(), "session": session_dict(active) if active else None}


@router.post("/payments")
def create_payment(payload: BuyCreditsInput, auth: CurrentSession, db: DbSession = Depends(get_db)) -> dict:
    reference = f"PW{secrets.token_hex(6).upper()}"
    order = PaymentOrder(user_id=auth.user.id, reference=reference, credits=payload.credits,
                         amount_vnd=payload.credits * settings.sandbox_credit_price_vnd)
    db.add(order); db.commit()
    return {"orderId": order.id, "reference": reference, "amountVnd": order.amount_vnd,
            "credits": order.credits, "bankAccount": settings.sepay_bank_account,
            "bankName": settings.sepay_bank_name, "accountName": settings.sepay_account_name,
            "transferContent": reference, "status": order.status}


@router.get("/payments/{order_id}")
def payment_status(order_id: str, auth: CurrentSession, db: DbSession = Depends(get_db)) -> dict:
    order = db.get(PaymentOrder, order_id)
    if order is None or order.user_id != auth.user.id:
        raise HTTPException(404, "Không tìm thấy đơn thanh toán")
    return {"orderId": order.id, "status": order.status, "credits": order.credits}


@router.post("/webhooks/sepay")
def sepay_webhook(payload: SePayWebhook, request: Request, db: DbSession = Depends(get_db),
                  authorization: str | None = Header(default=None)) -> dict:
    expected = settings.sepay_webhook_api_key
    supplied = (authorization or "").removeprefix("Apikey ").removeprefix("Bearer ").strip()
    if not expected or not secrets.compare_digest(supplied, expected):
        raise HTTPException(401, "Webhook không hợp lệ")
    match = re.search(r"\b(PW[A-F0-9]{12})\b", payload.content.upper())
    if not match:
        return {"success": True, "ignored": "missing_reference"}
    order = db.execute(select(PaymentOrder).where(PaymentOrder.reference == match.group(1))).scalar_one_or_none()
    if order is None:
        return {"success": True, "ignored": "unknown_reference"}
    transaction_id = str(payload.id or payload.referenceCode or "")
    duplicate = transaction_id and db.execute(select(PaymentOrder).where(
        PaymentOrder.provider_transaction_id == transaction_id)).scalar_one_or_none()
    if duplicate:
        return {"success": True, "duplicate": True}
    if payload.transferAmount < order.amount_vnd:
        return {"success": True, "ignored": "insufficient_amount"}
    if order.status != "paid":
        order.status = "paid"; order.paid_at = utcnow(); order.provider_transaction_id = transaction_id or None
        order.provider_payload = payload.model_dump()
        wallet_for(db, order.user_id).credits += order.credits
        db.commit()
    return {"success": True}


def session_dict(row: CloudSandboxSession) -> dict:
    return {"id": row.id, "status": row.status, "remoteUrl": row.remote_url,
            "expiresAt": row.expires_at.isoformat(), "error": row.error}


async def provision_task(session_id: str) -> None:
    from backend.db import SessionLocal
    with SessionLocal() as db:
        row = db.get(CloudSandboxSession, session_id)
        if row is None: return
        try:
            instance_id, remote_url = await asyncio.to_thread(cloud_sandbox_service.provision, row.id, row.user_id, row.expires_at.isoformat())
            row.provider_instance_id = instance_id; row.remote_url = remote_url; row.status = "ready"
        except Exception as exc:
            row.status = "failed"; row.error = str(exc)[:1000]
            wallet_for(db, row.user_id).credits += 1
        db.commit()


@router.post("/sessions")
async def create_session(auth: CurrentSession, db: DbSession = Depends(get_db)) -> dict:
    existing = db.execute(select(CloudSandboxSession).where(
        CloudSandboxSession.user_id == auth.user.id,
        CloudSandboxSession.status.in_(("provisioning", "ready")),
    )).scalar_one_or_none()
    if existing: return session_dict(existing)
    wallet = wallet_for(db, auth.user.id)
    if wallet.credits < 1: raise HTTPException(402, "Bạn cần mua một lượt Sandbox")
    wallet.credits -= 1
    row = CloudSandboxSession(user_id=auth.user.id, expires_at=utcnow() + timedelta(minutes=settings.sandbox_session_minutes))
    db.add(row); db.commit(); db.refresh(row)
    asyncio.create_task(provision_task(row.id))
    return session_dict(row)


@router.get("/sessions/{session_id}")
def get_session(session_id: str, auth: CurrentSession, db: DbSession = Depends(get_db)) -> dict:
    row = db.get(CloudSandboxSession, session_id)
    if row is None or row.user_id != auth.user.id: raise HTTPException(404, "Không tìm thấy phiên")
    return session_dict(row)


@router.delete("/sessions/{session_id}")
async def stop_session(session_id: str, auth: CurrentSession, db: DbSession = Depends(get_db)) -> dict:
    row = db.get(CloudSandboxSession, session_id)
    if row is None or row.user_id != auth.user.id: raise HTTPException(404, "Không tìm thấy phiên")
    if row.provider_instance_id: await asyncio.to_thread(cloud_sandbox_service.terminate, row.provider_instance_id)
    row.status = "terminated"; row.terminated_at = utcnow(); db.commit()
    return {"ok": True}
