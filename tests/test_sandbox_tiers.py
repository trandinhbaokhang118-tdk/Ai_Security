from __future__ import annotations

from backend.routers.sandbox_cloud import TIER_CAPABILITIES, TIER_RANK


def test_tier_capabilities_are_ordered_and_safe() -> None:
    assert TIER_RANK == {"free": 0, "pro": 1, "max": 2}
    assert TIER_CAPABILITIES["free"] == {
        "web": True, "exe": False, "gpu": False, "minutes": 10, "provider": "local"
    }
    assert TIER_CAPABILITIES["pro"]["exe"] is True
    assert TIER_CAPABILITIES["pro"]["gpu"] is False
    assert TIER_CAPABILITIES["max"]["exe"] is True
    assert TIER_CAPABILITIES["max"]["gpu"] is True


def test_account_plan_can_only_open_equal_or_lower_sandbox_tier() -> None:
    assert TIER_RANK["free"] < TIER_RANK["pro"] < TIER_RANK["max"]
    assert TIER_RANK["free"] < TIER_RANK["max"]
