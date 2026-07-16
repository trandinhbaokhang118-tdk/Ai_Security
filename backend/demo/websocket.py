"""WebSocket connection management for real-time demo updates.

This module provides the ConnectionManager class for managing WebSocket
connections and broadcasting attack events and metrics updates.
"""

import asyncio
import json

from fastapi import WebSocket


class ConnectionManager:
    """Manages WebSocket connections for real-time demo updates.

    This class tracks active connections per session and provides methods
    to broadcast attack events and metrics updates to connected clients.

    Attributes:
        active_connections: Dict mapping session_id to list of WebSocket connections
        _lock: Asyncio lock for thread-safe connection management
    """

    def __init__(self):
        """Initialize the connection manager with empty connections."""
        self.active_connections: dict[str, list[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, session_id: str) -> None:
        """Accept a new WebSocket connection and add it to the session.

        Args:
            websocket: The WebSocket connection to accept
            session_id: Session identifier for grouping connections
        """
        await websocket.accept()

        async with self._lock:
            if session_id not in self.active_connections:
                self.active_connections[session_id] = []
            self.active_connections[session_id].append(websocket)

    async def disconnect(self, websocket: WebSocket, session_id: str) -> None:
        """Remove a WebSocket connection from the session.

        Args:
            websocket: The WebSocket connection to remove
            session_id: Session identifier
        """
        async with self._lock:
            if session_id in self.active_connections:
                self.active_connections[session_id].remove(websocket)

                # Clean up empty sessions
                if not self.active_connections[session_id]:
                    del self.active_connections[session_id]

    async def broadcast_attack_event(
        self,
        session_id: str,
        attack_data: dict,
    ) -> None:
        """Broadcast an attack event to all connections in a session.

        Args:
            session_id: Session identifier
            attack_data: Attack event data to broadcast
        """
        message = {
            "type": "attack_event",
            "data": attack_data,
        }
        await self._broadcast_to_session(session_id, message)

    async def broadcast_metrics_update(
        self,
        session_id: str,
        metrics_data: dict,
    ) -> None:
        """Broadcast a metrics update to all connections in a session.

        Args:
            session_id: Session identifier
            metrics_data: Metrics data to broadcast
        """
        message = {
            "type": "metrics_update",
            "data": metrics_data,
        }
        await self._broadcast_to_session(session_id, message)

    async def _broadcast_to_session(
        self,
        session_id: str,
        message: dict,
    ) -> None:
        """Broadcast a message to all connections in a session.

        Args:
            session_id: Session identifier
            message: Message to broadcast (will be JSON-encoded)
        """
        async with self._lock:
            if session_id not in self.active_connections:
                return

            # Get copy of connections list to avoid modification during iteration
            connections = self.active_connections[session_id].copy()

        # Broadcast to all connections (outside lock to avoid blocking)
        message_json = json.dumps(message)

        # Track failed connections for cleanup
        failed_connections = []

        for websocket in connections:
            try:
                await websocket.send_text(message_json)
            except Exception:
                # Connection failed - mark for removal
                failed_connections.append(websocket)

        # Clean up failed connections
        if failed_connections:
            async with self._lock:
                if session_id in self.active_connections:
                    for websocket in failed_connections:
                        if websocket in self.active_connections[session_id]:
                            self.active_connections[session_id].remove(websocket)

                    # Clean up empty sessions
                    if not self.active_connections[session_id]:
                        del self.active_connections[session_id]


# Global instance for use across the demo module
connection_manager = ConnectionManager()
