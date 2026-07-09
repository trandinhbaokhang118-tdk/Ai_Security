"""Demo/Showcase System API Routes.

This module provides API endpoints for the AI Security Armor demo system,
including URL analysis, chatbot protection demonstration, attack simulation,
and real-time metrics tracking.

Design Reference: design.md §2.1.1 API Routes
"""

from __future__ import annotations

import asyncio
import time
import uuid
from datetime import datetime
from urllib.parse import urlparse

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, WebSocket, WebSocketDisconnect

from backend.demo.metrics import metrics_aggregator
from backend.demo.models import (
    AIDetection,
    ChatMessageRequest,
    ChatMessageResponse,
    MetricsResponse,
    SimulateAttackRequest,
    SimulateAttackResponse,
    TraditionalDetection,
    URLAnalysisRequest,
    URLAnalysisResponse,
)
from backend.demo.sandbox import sandbox_runner
from backend.demo.simulator import attack_simulator
from backend.demo.websocket import connection_manager
from backend.services.inference_service import InferenceService

# Router setup with prefix and tags
router = APIRouter(prefix="/v1/demo", tags=["demo"])

# Global inference service instance
inference_service = InferenceService()


# ============================================================================
# Scenario 1: URL Analysis
# ============================================================================

@router.post("/url/analyze")
async def analyze_url(request: URLAnalysisRequest) -> URLAnalysisResponse:
    """Analyze a URL for malicious behavior.
    
    Accepts a URL and optional deep_analysis flag. When deep_analysis is True,
    the URL is executed in a sandboxed environment to detect malicious behaviors.
    """
    start_time = time.time()
    
    # Validate URL
    _validate_url(request.url)
    
    # Get inference engine
    engine = inference_service.engine
    
    # Analyze URL using InferenceEngine
    result = await engine.predict_url(request.url)
    
    # Map risk_score to threat_level
    threat_level = _map_risk_to_threat_level(result.risk_score)
    
    # Build response
    response = URLAnalysisResponse(
        url=request.url,
        risk_score=result.risk_score,
        threat_level=threat_level,
        analysis_time_ms=int((time.time() - start_time) * 1000),
        traditional_detection=TraditionalDetection(
            detected=False,  # Traditional methods miss these attacks
            methods=[],
        ),
        ai_detection=AIDetection(
            detected=result.risk_score >= 0.5,
            confidence=result.risk_score,
            model_version="url_lgbm_v1",
        ),
        evidence=result.evidence,
        sandbox_report=None,
    )
    
    # If deep analysis requested, run sandbox
    if request.deep_analysis:
        sandbox_report = await sandbox_runner.analyze_url(request.url)
        response.sandbox_report = sandbox_report
    
    return response


def _validate_url(url: str) -> None:
    """Validate URL and reject localhost, private IPs, file:// schemes."""
    parsed = urlparse(url)
    
    # Reject file:// scheme
    if parsed.scheme == "file":
        raise HTTPException(status_code=400, detail="file:// URLs are not allowed")
    
    # Reject localhost
    hostname = parsed.hostname or ""
    if hostname in ["localhost", "127.0.0.1", "::1"]:
        raise HTTPException(status_code=400, detail="localhost URLs are not allowed")
    
    # Reject private IP ranges (basic check)
    if hostname.startswith("192.168.") or hostname.startswith("10.") or hostname.startswith("172."):
        raise HTTPException(status_code=400, detail="Private IP URLs are not allowed")


def _map_risk_to_threat_level(risk_score: float) -> str:
    """Map risk score [0-1] to threat level category."""
    if risk_score < 0.2:
        return "safe"
    elif risk_score < 0.4:
        return "low"
    elif risk_score < 0.6:
        return "medium"
    elif risk_score < 0.8:
        return "high"
    else:
        return "critical"


# ============================================================================
# Scenario 2: Chatbot Protection
# ============================================================================

@router.post("/chat/message")
async def chat_message(request: ChatMessageRequest) -> ChatMessageResponse:
    """Process a chatbot message with optional protection.
    
    Demonstrates prompt injection protection by analyzing messages before
    passing them to the chatbot. When protection is disabled, attacks succeed.
    """
    start_time = time.time()
    
    injection_detected = False
    risk_score = 0.0
    blocked = False
    response_text = ""
    
    # If protection enabled, analyze for prompt injection
    if request.protection_enabled:
        engine = inference_service.engine
        result = await engine.predict_prompt(request.message)
        
        risk_score = result.risk_score
        injection_detected = risk_score >= 0.5
        
        if injection_detected:
            blocked = True
            response_text = "⚠️ BLOCKED: Prompt injection detected. Your message was not processed for security reasons."
            
            # Record blocked attack
            await metrics_aggregator.record_attack(
                session_id=request.session_id,
                protection_enabled=True,
                blocked=True,
                processing_time_ms=(time.time() - start_time) * 1000,
            )
        else:
            # Safe message - generate chatbot response
            response_text = await _generate_chatbot_response(request.message)
            
            # Record successful processing
            await metrics_aggregator.record_attack(
                session_id=request.session_id,
                protection_enabled=True,
                blocked=False,
                processing_time_ms=(time.time() - start_time) * 1000,
            )
    else:
        # Protection disabled - allow everything through (for demo contrast)
        response_text = await _generate_chatbot_response(request.message)
        
        # Still analyze to show risk score
        engine = inference_service.engine
        result = await engine.predict_prompt(request.message)
        risk_score = result.risk_score
        injection_detected = risk_score >= 0.5
        
        # Record as successful attack (not blocked)
        await metrics_aggregator.record_attack(
            session_id=request.session_id,
            protection_enabled=False,
            blocked=False,
            processing_time_ms=(time.time() - start_time) * 1000,
        )
    
    analysis_time_ms = int((time.time() - start_time) * 1000)
    
    return ChatMessageResponse(
        response=response_text,
        blocked=blocked,
        injection_detected=injection_detected,
        risk_score=risk_score,
        analysis_time_ms=analysis_time_ms,
    )


async def _generate_chatbot_response(message: str) -> str:
    """Generate a chatbot response (mock implementation for demo)."""
    # Simple mock responses for demo
    if "hello" in message.lower() or "hi" in message.lower():
        return "Hello! I'm AI Security Armor's demo chatbot. How can I help you today?"
    elif "help" in message.lower():
        return "I can answer questions about AI security, phishing detection, and more. What would you like to know?"
    elif "?" in message:
        return f"That's an interesting question about '{message[:50]}'. In a full implementation, I would provide a detailed answer using an LLM."
    else:
        return f"I received your message: '{message[:50]}...'. In a production system, this would be processed by a full language model."


# ============================================================================
# Attack Simulation
# ============================================================================

@router.post("/simulate/attack")
async def simulate_attack(
    request: SimulateAttackRequest,
    background_tasks: BackgroundTasks,
) -> SimulateAttackResponse:
    """Simulate a batch of attacks for demonstration purposes.
    
    Generates and processes multiple realistic attacks to demonstrate detection
    capabilities. Attacks are processed asynchronously with real-time updates
    via WebSocket.
    """
    simulation_id = str(uuid.uuid4())
    started_at = datetime.now()
    
    # Start async attack processing in background
    background_tasks.add_task(
        _process_attack_simulation,
        simulation_id=simulation_id,
        request=request,
    )
    
    return SimulateAttackResponse(
        simulation_id=simulation_id,
        total_attacks=request.count,
        started_at=started_at,
    )


async def _process_attack_simulation(
    simulation_id: str,
    request: SimulateAttackRequest,
) -> None:
    """Process attack simulation in background task."""
    engine = inference_service.engine
    
    # Generate attacks based on type
    if request.attack_type == "url":
        attacks = attack_simulator.generate_url_attacks(
            count=request.count,
            sophistication=request.scenario,
        )
        attack_type = "url"
    elif request.attack_type == "prompt":
        attacks = attack_simulator.generate_prompt_attacks(
            count=request.count,
            sophistication=request.scenario,
        )
        attack_type = "prompt"
    else:  # mixed
        url_count = request.count // 2
        prompt_count = request.count - url_count
        urls = attack_simulator.generate_url_attacks(url_count, request.scenario)
        prompts = attack_simulator.generate_prompt_attacks(prompt_count, request.scenario)
        attacks = [(url, "url") for url in urls] + [(prompt, "prompt") for prompt in prompts]
        attack_type = "mixed"
    
    # Process each attack
    for i, attack in enumerate(attacks):
        start_time = time.time()
        
        # Determine attack content and type
        if attack_type == "mixed":
            content, current_type = attack
        else:
            content = attack
            current_type = attack_type
        
        # Analyze based on type
        if current_type == "url":
            result = await engine.predict_url(content)
        else:  # prompt
            result = await engine.predict_prompt(content)
        
        risk_score = result.risk_score
        
        # Determine if blocked (based on protection_enabled)
        blocked = request.protection_enabled and risk_score >= 0.5
        
        # Record in metrics
        # Note: Using simulation_id as session_id for this simulation
        await metrics_aggregator.record_attack(
            session_id=simulation_id,
            protection_enabled=request.protection_enabled,
            blocked=blocked,
            processing_time_ms=(time.time() - start_time) * 1000,
        )
        
        # Broadcast attack event via WebSocket
        await connection_manager.broadcast_attack_event(
            session_id=simulation_id,
            attack_data={
                "index": i + 1,
                "total": request.count,
                "attack_type": current_type,
                "content": content[:100],  # Truncate for display
                "risk_score": risk_score,
                "blocked": blocked,
                "protection_enabled": request.protection_enabled,
            },
        )
        
        # Small delay to allow UI to update (10+ attacks/second = ~100ms delay)
        await asyncio.sleep(0.05)
    
    # Broadcast final metrics update
    try:
        metrics = await metrics_aggregator.get_metrics(simulation_id)
        await connection_manager.broadcast_metrics_update(
            session_id=simulation_id,
            metrics_data=metrics.model_dump(),
        )
    except KeyError:
        pass  # Session might have been cleaned up


# ============================================================================
# Metrics
# ============================================================================

@router.get("/metrics")
async def get_metrics(
    session_id: str = Query(..., description="Session identifier"),
) -> MetricsResponse:
    """Retrieve demo session metrics.
    
    Returns aggregated metrics for protected and unprotected states, including
    attack counts, block rates, and improvement percentage.
    """
    try:
        metrics = await metrics_aggregator.get_metrics(session_id)
        return metrics
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")


# ============================================================================
# WebSocket for Real-Time Updates
# ============================================================================

@router.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time demo updates.
    
    Provides real-time streaming of attack events and metrics updates to
    connected clients. Supports multiple concurrent connections per session.
    """
    await connection_manager.connect(websocket, session_id)
    
    try:
        # Keep connection alive and handle incoming messages
        while True:
            # Wait for messages (keepalive or commands)
            data = await websocket.receive_text()
            
            # Echo back for keepalive
            if data == "ping":
                await websocket.send_text("pong")
    
    except WebSocketDisconnect:
        # Clean up connection on disconnect
        await connection_manager.disconnect(websocket, session_id)
