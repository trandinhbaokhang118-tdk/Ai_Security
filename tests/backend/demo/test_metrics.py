"""Unit tests for the MetricsAggregator class.

Tests cover attack recording, metrics calculation, rate computation,
improvement percentage calculation, and session management.
"""

import pytest

from backend.demo.metrics import MetricsAggregator, SessionMetrics
from backend.demo.models import AttackMetrics


@pytest.fixture
def aggregator():
    """Create a fresh MetricsAggregator instance for each test."""
    return MetricsAggregator()


@pytest.mark.asyncio
class TestMetricsAggregator:
    """Test suite for MetricsAggregator class."""

    async def test_record_attack_creates_new_session(self, aggregator):
        """Test that recording an attack creates a new session if it doesn't exist."""
        session_id = "test-session-1"
        
        await aggregator.record_attack(
            session_id=session_id,
            protection_enabled=False,
            blocked=False,
            processing_time_ms=100.0,
        )
        
        metrics = await aggregator.get_metrics(session_id)
        assert metrics.session_id == session_id
        assert metrics.protection_off.attack_count == 1

    async def test_record_attack_unprotected_success(self, aggregator):
        """Test recording a successful attack without protection."""
        session_id = "test-session-2"
        
        await aggregator.record_attack(
            session_id=session_id,
            protection_enabled=False,
            blocked=False,
            processing_time_ms=50.0,
        )
        
        metrics = await aggregator.get_metrics(session_id)
        assert metrics.protection_off.attack_count == 1
        assert metrics.protection_off.success_count == 1
        assert metrics.protection_off.blocked_count == 0
        assert metrics.protection_off.success_rate == 100.0
        assert metrics.protection_off.block_rate == 0.0

    async def test_record_attack_protected_blocked(self, aggregator):
        """Test recording a blocked attack with protection enabled."""
        session_id = "test-session-3"
        
        await aggregator.record_attack(
            session_id=session_id,
            protection_enabled=True,
            blocked=True,
            processing_time_ms=75.0,
        )
        
        metrics = await aggregator.get_metrics(session_id)
        assert metrics.protection_on.attack_count == 1
        assert metrics.protection_on.blocked_count == 1
        assert metrics.protection_on.success_count == 0
        assert metrics.protection_on.block_rate == 100.0
        assert metrics.protection_on.success_rate == 0.0

    async def test_record_multiple_attacks_calculates_rates(self, aggregator):
        """Test that rates are calculated correctly after multiple attacks."""
        session_id = "test-session-4"
        
        # Record 10 attacks without protection: 8 succeed, 2 blocked
        for i in range(10):
            blocked = i < 2  # First 2 are blocked
            await aggregator.record_attack(
                session_id=session_id,
                protection_enabled=False,
                blocked=blocked,
                processing_time_ms=100.0,
            )
        
        metrics = await aggregator.get_metrics(session_id)
        assert metrics.protection_off.attack_count == 10
        assert metrics.protection_off.success_count == 8
        assert metrics.protection_off.blocked_count == 2
        assert metrics.protection_off.success_rate == 80.0
        assert metrics.protection_off.block_rate == 20.0

    async def test_improvement_percentage_calculation(self, aggregator):
        """Test that improvement percentage is calculated correctly."""
        session_id = "test-session-5"
        
        # Without protection: 80% success rate (8 out of 10 succeed)
        for i in range(10):
            blocked = i < 2
            await aggregator.record_attack(
                session_id=session_id,
                protection_enabled=False,
                blocked=blocked,
                processing_time_ms=100.0,
            )
        
        # With protection: 20% success rate (2 out of 10 succeed)
        for i in range(10):
            blocked = i < 8
            await aggregator.record_attack(
                session_id=session_id,
                protection_enabled=True,
                blocked=blocked,
                processing_time_ms=100.0,
            )
        
        metrics = await aggregator.get_metrics(session_id)
        
        # Improvement = ((80 - 20) / 80) * 100 = 75%
        assert metrics.protection_off.success_rate == 80.0
        assert metrics.protection_on.success_rate == 20.0
        assert metrics.improvement_percentage == 75.0

    async def test_improvement_percentage_with_zero_unprotected(self, aggregator):
        """Test improvement percentage when unprotected success rate is 0."""
        session_id = "test-session-6"
        
        # Without protection: 0% success rate (all blocked)
        for i in range(5):
            await aggregator.record_attack(
                session_id=session_id,
                protection_enabled=False,
                blocked=True,
                processing_time_ms=100.0,
            )
        
        # With protection: 0% success rate (all blocked)
        for i in range(5):
            await aggregator.record_attack(
                session_id=session_id,
                protection_enabled=True,
                blocked=True,
                processing_time_ms=100.0,
            )
        
        metrics = await aggregator.get_metrics(session_id)
        assert metrics.improvement_percentage == 0.0

    async def test_average_processing_time_calculation(self, aggregator):
        """Test that average processing time is calculated correctly."""
        session_id = "test-session-7"
        
        # Record attacks with different processing times
        times = [100.0, 200.0, 150.0, 250.0]
        for time_ms in times:
            await aggregator.record_attack(
                session_id=session_id,
                protection_enabled=False,
                blocked=False,
                processing_time_ms=time_ms,
            )
        
        metrics = await aggregator.get_metrics(session_id)
        expected_avg = sum(times) / len(times)  # 175.0
        assert metrics.protection_off.avg_time_ms == expected_avg

    async def test_get_metrics_nonexistent_session_raises_error(self, aggregator):
        """Test that getting metrics for a nonexistent session raises KeyError."""
        with pytest.raises(KeyError, match="Session nonexistent not found"):
            await aggregator.get_metrics("nonexistent")

    async def test_reset_session(self, aggregator):
        """Test that resetting a session clears all metrics."""
        session_id = "test-session-8"
        
        # Record some attacks
        await aggregator.record_attack(
            session_id=session_id,
            protection_enabled=False,
            blocked=False,
            processing_time_ms=100.0,
        )
        
        # Verify data exists
        metrics = await aggregator.get_metrics(session_id)
        assert metrics.protection_off.attack_count == 1
        
        # Reset session
        await aggregator.reset_session(session_id)
        
        # Verify data is cleared
        metrics = await aggregator.get_metrics(session_id)
        assert metrics.protection_off.attack_count == 0
        assert metrics.protection_on.attack_count == 0

    async def test_delete_session(self, aggregator):
        """Test that deleting a session removes it completely."""
        session_id = "test-session-9"
        
        # Record some attacks
        await aggregator.record_attack(
            session_id=session_id,
            protection_enabled=False,
            blocked=False,
            processing_time_ms=100.0,
        )
        
        # Verify session exists
        metrics = await aggregator.get_metrics(session_id)
        assert metrics.session_id == session_id
        
        # Delete session
        await aggregator.delete_session(session_id)
        
        # Verify session no longer exists
        with pytest.raises(KeyError):
            await aggregator.get_metrics(session_id)

    async def test_list_sessions(self, aggregator):
        """Test that list_sessions returns all active session IDs."""
        session_ids = ["session-1", "session-2", "session-3"]
        
        # Create sessions
        for session_id in session_ids:
            await aggregator.record_attack(
                session_id=session_id,
                protection_enabled=False,
                blocked=False,
                processing_time_ms=100.0,
            )
        
        # List sessions
        active_sessions = await aggregator.list_sessions()
        assert set(active_sessions) == set(session_ids)

    async def test_separate_protection_states(self, aggregator):
        """Test that protected and unprotected metrics are tracked separately."""
        session_id = "test-session-10"
        
        # Record unprotected attacks
        for i in range(5):
            await aggregator.record_attack(
                session_id=session_id,
                protection_enabled=False,
                blocked=False,
                processing_time_ms=100.0,
            )
        
        # Record protected attacks
        for i in range(3):
            await aggregator.record_attack(
                session_id=session_id,
                protection_enabled=True,
                blocked=True,
                processing_time_ms=50.0,
            )
        
        metrics = await aggregator.get_metrics(session_id)
        
        # Verify separate tracking
        assert metrics.protection_off.attack_count == 5
        assert metrics.protection_off.success_count == 5
        assert metrics.protection_on.attack_count == 3
        assert metrics.protection_on.blocked_count == 3

    async def test_concurrent_attack_recording(self, aggregator):
        """Test thread-safe concurrent attack recording."""
        import asyncio
        
        session_id = "test-session-11"
        num_attacks = 100
        
        # Record attacks concurrently
        tasks = []
        for i in range(num_attacks):
            task = aggregator.record_attack(
                session_id=session_id,
                protection_enabled=i % 2 == 0,  # Alternate protection state
                blocked=i % 3 == 0,  # Block every 3rd attack
                processing_time_ms=100.0,
            )
            tasks.append(task)
        
        await asyncio.gather(*tasks)
        
        # Verify all attacks were recorded
        metrics = await aggregator.get_metrics(session_id)
        total = metrics.protection_off.attack_count + metrics.protection_on.attack_count
        assert total == num_attacks

    async def test_zero_attacks_has_zero_rates(self, aggregator):
        """Test that a session with no attacks has 0% rates."""
        session_id = "test-session-12"
        
        # Create session but record no attacks (just reset it)
        await aggregator.record_attack(
            session_id=session_id,
            protection_enabled=False,
            blocked=False,
            processing_time_ms=100.0,
        )
        await aggregator.reset_session(session_id)
        
        metrics = await aggregator.get_metrics(session_id)
        assert metrics.protection_off.attack_count == 0
        assert metrics.protection_off.block_rate == 0.0
        assert metrics.protection_off.success_rate == 0.0
