"""WebSocket chat endpoint (design.md GAP-2.6 RAG-like pattern).

Flow: user question (+context) -> Layer 1 assessment -> Layer 2 LLM explanation
streamed token-by-token -> final message with assessment attached.
"""

from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session as DbSession

from backend.db import get_db
from backend.dependencies import get_explanation_service, get_inference_service
from backend.middleware import sanitize_text
from backend.routers.auth import build_actor_plan_info, resolve_actor
from backend.services.quota_service import (
    refund_ai_credits,
    reserve_ai_credits,
    reserve_scan_quota,
)
from shared.adapter_schemas import AdapterRunStatus, AdapterTask

router = APIRouter(tags=["chat"])


@router.websocket("/v1/chat")
async def chat_ws(ws: WebSocket, db: DbSession = Depends(get_db)):
    await ws.accept()
    svc = get_inference_service()
    expl = get_explanation_service()
    turn_count = 0
    cached_context_key = ""
    cached_assessment = None
    try:
        while True:
            raw = await ws.receive_text()
            payload = json.loads(raw)
            access_token = sanitize_text(payload.get("access_token", ""))
            credentials = (
                HTTPAuthorizationCredentials(
                    scheme="Bearer", credentials=access_token
                )
                if access_token
                else None
            )
            actor = resolve_actor(credentials, db, ws)  # WebSocket exposes client like Request.
            plan = build_actor_plan_info(db, actor)
            if turn_count > plan.chatFollowupLimit:
                await ws.send_text(
                    json.dumps(
                        {
                            "type": "error",
                            "error": "Bạn đã dùng hết số câu hỏi tiếp nối của cuộc trò chuyện này.",
                        }
                    )
                )
                continue

            question = sanitize_text(payload.get("question", ""))
            context = payload.get("context") or {}
            content = sanitize_text(context.get("content", "")) if context else ""
            modality = context.get("modality", "text") if context else "text"
            operator_context = sanitize_text(context.get("operator_context", ""))
            history = payload.get("history") or []
            if isinstance(history, list):
                history_context = "\n".join(
                    f"{str(item.get('role', 'user'))}: {sanitize_text(str(item.get('text', '')))}"
                    for item in history[-4:]
                    if isinstance(item, dict)
                )
                operator_context = sanitize_text(
                    f"{operator_context}\nLịch sử hội thoại:\n{history_context}"
                )

            assessment = None
            if content:
                context_key = f"{modality}\n{content}\n{operator_context}"
                if context_key == cached_context_key and cached_assessment is not None:
                    assessment = cached_assessment
                else:
                    reserve_scan_quota(db, actor, ws)
                    auto_context = (
                        plan.autoWebContext
                        if modality == "url"
                        else plan.autoMessageContext
                    )
                    context_task = (
                        AdapterTask.WEB_CONTEXT
                        if modality == "url"
                        else AdapterTask.MESSAGE_CONTEXT
                    )
                    context_mode = "shadow" if auto_context else "off"
                    reserved_evaluation = (
                        context_mode == "shadow" and svc.context_ai_ready(context_task)
                    )
                    if reserved_evaluation:
                        reserve_ai_credits(
                            db, actor, ws, kind="evaluation"
                        )
                    try:
                        if modality == "url":
                            assessment = svc.assess_url(
                                content,
                                operator_context,
                                context_ai_mode=context_mode,
                            )
                        else:
                            assessment = svc.assess_text(
                                content,
                                modality,
                                {"operator_context": operator_context},
                                context_ai_mode=context_mode,
                            )
                    except Exception:
                        if reserved_evaluation:
                            refund_ai_credits(
                                db, actor, ws, kind="evaluation"
                            )
                        raise
                    if reserved_evaluation and (
                        assessment.contextual_analysis is None
                        or assessment.contextual_analysis.status
                        != AdapterRunStatus.COMPLETED
                    ):
                        refund_ai_credits(
                            db, actor, ws, kind="evaluation"
                        )
                    cached_context_key = context_key
                    cached_assessment = assessment

            evidence = assessment.evidence if assessment else []
            excerpt = content or question
            assessment_context = (
                assessment.model_dump(mode="json") if assessment else None
            )
            reserved_explanation = expl.llm_ready
            if reserved_explanation:
                reserve_ai_credits(db, actor, ws, kind="explanation")
            try:
                async for token in expl.generate(
                    evidence,
                    excerpt,
                    question,
                    operator_context=operator_context,
                    assessment_context=assessment_context,
                ):
                    await ws.send_text(json.dumps({"type": "delta", "delta": token}))
            except Exception:
                if reserved_explanation:
                    refund_ai_credits(db, actor, ws, kind="explanation")
                raise
            if reserved_explanation and not expl.available:
                refund_ai_credits(db, actor, ws, kind="explanation")

            final = {
                "type": "final",
                "message_id": assessment.request_id if assessment else "",
                "modality": modality,
            }
            if assessment:
                final["assessment"] = assessment.model_dump(mode="json")
            await ws.send_text(json.dumps(final))
            turn_count += 1
    except WebSocketDisconnect:
        return
    except HTTPException as exc:
        await ws.send_text(json.dumps({"type": "error", "error": str(exc.detail)}))
    except Exception as exc:  # pragma: no cover
        await ws.send_text(json.dumps({"type": "error", "error": str(exc)}))
