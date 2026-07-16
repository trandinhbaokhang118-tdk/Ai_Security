"""WebSocket chat endpoint (design.md GAP-2.6 RAG-like pattern).

Flow: user question (+context) -> Layer 1 assessment -> Layer 2 LLM explanation
streamed token-by-token -> final message with assessment attached.
"""

from __future__ import annotations

import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from backend.dependencies import get_explanation_service, get_inference_service
from backend.middleware import sanitize_text

router = APIRouter(tags=["chat"])


@router.websocket("/v1/chat")
async def chat_ws(ws: WebSocket):
    await ws.accept()
    svc = get_inference_service()
    expl = get_explanation_service()
    try:
        while True:
            raw = await ws.receive_text()
            payload = json.loads(raw)
            question = sanitize_text(payload.get("question", ""))
            context = payload.get("context") or {}
            content = sanitize_text(context.get("content", "")) if context else ""
            modality = context.get("modality", "text") if context else "text"

            assessment = None
            if content:
                if modality == "url":
                    assessment = svc.assess_url(content)
                else:
                    assessment = svc.assess_text(content, modality)

            evidence = assessment.evidence if assessment else []
            excerpt = content or question
            async for token in expl.generate(evidence, excerpt, question):
                await ws.send_text(json.dumps({"type": "delta", "delta": token}))

            final = {
                "type": "final",
                "message_id": assessment.request_id if assessment else "",
                "modality": modality,
            }
            if assessment:
                final["assessment"] = assessment.model_dump(mode="json")
            await ws.send_text(json.dumps(final))
    except WebSocketDisconnect:
        return
    except Exception as exc:  # pragma: no cover
        await ws.send_text(json.dumps({"type": "error", "error": str(exc)}))
