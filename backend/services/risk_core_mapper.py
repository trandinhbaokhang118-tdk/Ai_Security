"""Engine-independent mapping helpers for the additive Risk Core v2 API contract."""
from __future__ import annotations

from collections.abc import Mapping
from dataclasses import asdict, is_dataclass
from typing import Any

from shared.schemas import RiskCoreTrace


def _plain(value: Any) -> Any:
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, Mapping):
        return {str(key): _plain(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_plain(item) for item in value]
    if is_dataclass(value):
        return _plain(asdict(value))
    if hasattr(value, "model_dump"):
        return _plain(value.model_dump(mode="json"))
    if hasattr(value, "value"):
        return _plain(value.value)
    if hasattr(value, "__dict__"):
        return _plain({key: item for key, item in vars(value).items() if not key.startswith("_")})
    return str(value)


def risk_core_trace_from_mapping(payload: Mapping[str, Any]) -> RiskCoreTrace:
    """Validate a public v2 payload without importing the Risk Core implementation."""
    data = _plain(payload)
    # Stable aliases let UI consume a single shape while retaining early-v2 fields.
    data.setdefault("risk_score", data.get("final_score"))
    data.setdefault("confidence_score", data.get("confidence"))
    data.setdefault("criteria", [])
    return RiskCoreTrace.model_validate(data)


def risk_core_trace_from_result(result: Any) -> RiskCoreTrace:
    """Convert a dataclass/Pydantic/object result after the public engine contract lands."""
    plain = _plain(result)
    if not isinstance(plain, Mapping):
        raise TypeError("Risk Core result must serialize to a mapping")
    return risk_core_trace_from_mapping(plain)
