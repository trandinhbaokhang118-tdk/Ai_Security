"""Inbound integration webhooks with replay protection and no raw-message storage."""
from __future__ import annotations

import asyncio
import hashlib
import hmac
import re
from datetime import timedelta
from typing import Any

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import delete
from sqlalchemy.orm import Session as DbSession

from backend.config import settings
from backend.db import get_db
from backend.dependencies import get_inference_service
from backend.models import TelegramUpdateReceipt
from backend.security_utils import utcnow
from backend.services.inference_service import InferenceService

router = APIRouter(prefix="/v1/integrations", tags=["integrations"])
URL_PATTERN = re.compile(
    r"(?i)\b(?:https?://|www\.)[^\s<>\"']+|\b(?:[a-z0-9-]+\.)+[a-z]{2,63}(?:/[^\s<>\"']*)?"
)


def _chat_hash(chat_id: str) -> str:
    key = (settings.telegram_webhook_secret or "telegram-disabled").encode()
    return hmac.new(key, chat_id.encode(), hashlib.sha256).hexdigest()


def _extract_url(text: str) -> str:
    match = URL_PATTERN.search(text[:4096])
    if not match:
        return ""
    return match.group(0).rstrip(".,;:!?)]}")[:2048]


def _format_result(url: str, result: Any) -> str:
    score = float(result.final_score if result.final_score is not None else result.risk_score)
    decision = str(result.decision.value if hasattr(result.decision, "value") else result.decision)
    dangerous = decision in {"block", "hard_block", "soft_block", "require_review"} or score >= 0.5
    icon = "❌" if dangerous else "✅"
    label = "NGUY HIỂM / CẦN KIỂM TRA" if dangerous else "KHÔNG PHÁT HIỆN NGUY HIỂM"
    reasons = [str(item) for item in result.reasons[:4] if str(item).strip()]
    details = "\n".join(f"• {reason[:300]}" for reason in reasons)
    return (
        f"{icon} {label}\n"
        f"URL: {url}\n"
        f"Điểm rủi ro: {score * 100:.1f}%\n"
        f"Quyết định: {decision}\n"
        + (f"\nDấu hiệu:\n{details}" if details else "")
    )[:4096]


def _send_telegram_message(chat_id: str, text: str) -> None:
    endpoint = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
    response = httpx.post(
        endpoint,
        json={"chat_id": chat_id, "text": text, "disable_web_page_preview": True},
        timeout=settings.telegram_timeout_seconds,
    )
    response.raise_for_status()
    payload = response.json()
    if not isinstance(payload, dict) or payload.get("ok") is not True:
        raise RuntimeError("Telegram sendMessage returned an unsuccessful response")


@router.post("/telegram/webhook")
async def telegram_webhook(
    payload: dict[str, Any],
    x_telegram_bot_api_secret_token: str = Header(default=""),
    db: DbSession = Depends(get_db),
    service: InferenceService = Depends(get_inference_service),
):
    if not settings.telegram_bot_enabled or not settings.telegram_bot_token:
        raise HTTPException(status_code=503, detail="Telegram bot is disabled")
    if not settings.telegram_webhook_secret or not hmac.compare_digest(
        x_telegram_bot_api_secret_token,
        settings.telegram_webhook_secret,
    ):
        raise HTTPException(status_code=403, detail="Invalid Telegram webhook secret")

    update_id = str(payload.get("update_id") or "")[:32]
    message = payload.get("message")
    if not update_id or not isinstance(message, dict):
        return {"ok": True, "ignored": True}
    sender = message.get("from") if isinstance(message.get("from"), dict) else {}
    if sender.get("is_bot") is True:
        return {"ok": True, "ignored": True}
    chat = message.get("chat") if isinstance(message.get("chat"), dict) else {}
    chat_id = str(chat.get("id") or "")
    if not chat_id:
        return {"ok": True, "ignored": True}
    if settings.telegram_allowed_chat_ids and chat_id not in settings.telegram_allowed_chat_ids:
        raise HTTPException(status_code=403, detail="Telegram chat is not allowed")
    if db.get(TelegramUpdateReceipt, update_id) is not None:
        return {"ok": True, "duplicate": True}

    receipt = TelegramUpdateReceipt(update_id=update_id, chat_id_hash=_chat_hash(chat_id))
    db.add(receipt)
    db.commit()
    text = str(message.get("text") or message.get("caption") or "")
    url = _extract_url(text)
    try:
        if not url:
            reply = "Hãy gửi một URL http(s) để hệ thống kiểm tra."
        else:
            result = await asyncio.to_thread(service.assess_url, url)
            reply = _format_result(url, result)
        await asyncio.to_thread(_send_telegram_message, chat_id, reply)
        receipt = db.get(TelegramUpdateReceipt, update_id)
        receipt.status = "completed"
        receipt.completed_at = utcnow()
        db.execute(
            delete(TelegramUpdateReceipt).where(
                TelegramUpdateReceipt.received_at < utcnow() - timedelta(days=30)
            )
        )
        db.commit()
        return {"ok": True, "scanned": bool(url)}
    except Exception as exc:
        receipt = db.get(TelegramUpdateReceipt, update_id)
        if receipt is not None:
            db.delete(receipt)
            db.commit()
        raise HTTPException(status_code=502, detail=f"Telegram processing failed: {type(exc).__name__}") from exc
