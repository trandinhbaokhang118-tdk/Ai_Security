"""Metrics aggregation for demo/showcase system.

This module provides the MetricsAggregator class for tracking attack statistics
and calculating protection effectiveness metrics in real-time.
"""

import asyncio
from dataclasses import dataclass, field
from typing import Dict

from backend.demo.models import AttackMetrics, MetricsResponse


@dataclass
class SessionMetrics:
    """Tracks attack metrics for a single demo session with both protected and unprotected states."""

    unprotected: AttackMetrics = field(default_factory=AttackMetrics)
    protected: AttackMetrics = field(default_factory=AttackMetrics)


class MetricsAggregator:
    """Aggregates and calculates attack metrics for demo sessions.
    
    This class provides thread-safe operations for recording attacks and
    calculating real-time metrics including block rates, success rates,
    and protection improvement percentages.
    
    Attributes:
        _sessions: In-memory storage of session metrics indexed by session_id
        _lock: Asyncio lock for thread-safe operations
    """

    def __init__(self):
        """Initialize the metrics aggregator with empty session storage."""
        self._sessions: Dict[str, SessionMetrics] = {}
        self._lock = asyncio.Lock()

    async def record_attack(
        self,
        session_id: str,
        protection_enabled: bool,
        blocked: bool,
        processing_time_ms: float,
    ) -> None:
        """Record an attack attempt and update metrics.
        
        Args:
            session_id: Unique identifier for the demo session
            protection_enabled: Whether AI protection was enabled for this attack
            blocked: Whether the attack was successfully blocked
            processing_time_ms: Time taken to process the attack in milliseconds
        """
        async with self._lock:
            # Ensure session exists
            if session_id not in self._sessions:
                self._sessions[session_id] = SessionMetrics()

            session = self._sessions[session_id]
            
            # Select the appropriate metrics object based on protection state
            metrics = session.protected if protection_enabled else session.unprotected

            # Update attack counts
            metrics.attack_count += 1
            
            if blocked:
                metrics.blocked_count += 1
            else:
                metrics.success_count += 1

            # Update average processing time
            # Formula: new_avg = (old_avg * (n-1) + new_value) / n
            total_time = metrics.avg_time_ms * (metrics.attack_count - 1) + processing_time_ms
            metrics.avg_time_ms = total_time / metrics.attack_count

            # Recalculate rates
            self._calculate_rates(metrics)

    def _calculate_rates(self, metrics: AttackMetrics) -> None:
        """Calculate block_rate and success_rate based on attack counts.
        
        Args:
            metrics: The AttackMetrics object to update with calculated rates
        """
        if metrics.attack_count > 0:
            metrics.block_rate = (metrics.blocked_count / metrics.attack_count) * 100.0
            metrics.success_rate = (metrics.success_count / metrics.attack_count) * 100.0
        else:
            metrics.block_rate = 0.0
            metrics.success_rate = 0.0

    async def get_metrics(self, session_id: str) -> MetricsResponse:
        """Retrieve metrics for a specific session.
        
        Args:
            session_id: Unique identifier for the demo session
            
        Returns:
            MetricsResponse containing protected and unprotected metrics plus improvement percentage
            
        Raises:
            KeyError: If the session_id does not exist
        """
        async with self._lock:
            if session_id not in self._sessions:
                raise KeyError(f"Session {session_id} not found")

            session = self._sessions[session_id]
            
            # Calculate improvement percentage
            improvement = self._calculate_improvement(
                session.unprotected.success_rate,
                session.protected.success_rate
            )

            return MetricsResponse(
                session_id=session_id,
                protection_off=session.unprotected,
                protection_on=session.protected,
                improvement_percentage=improvement,
            )

    def _calculate_improvement(
        self,
        unprotected_success_rate: float,
        protected_success_rate: float,
    ) -> float:
        """Calculate improvement percentage when protection is enabled.
        
        Formula: ((unprotected_success_rate - protected_success_rate) / unprotected_success_rate) * 100
        
        Args:
            unprotected_success_rate: Success rate without protection (0-100)
            protected_success_rate: Success rate with protection (0-100)
            
        Returns:
            Improvement percentage (positive means protection is working)
        """
        # Avoid division by zero
        if unprotected_success_rate == 0:
            return 0.0
        
        improvement = (
            (unprotected_success_rate - protected_success_rate) 
            / unprotected_success_rate
        ) * 100.0
        
        return improvement

    async def reset_session(self, session_id: str) -> None:
        """Reset metrics for a specific session.
        
        Args:
            session_id: Unique identifier for the demo session to reset
        """
        async with self._lock:
            if session_id in self._sessions:
                self._sessions[session_id] = SessionMetrics()

    async def delete_session(self, session_id: str) -> None:
        """Delete a session and all its metrics.
        
        Args:
            session_id: Unique identifier for the demo session to delete
        """
        async with self._lock:
            if session_id in self._sessions:
                del self._sessions[session_id]

    async def list_sessions(self) -> list[str]:
        """List all active session IDs.
        
        Returns:
            List of session IDs that have recorded metrics
        """
        async with self._lock:
            return list(self._sessions.keys())


# Global instance for use across the demo module
metrics_aggregator = MetricsAggregator()
