"""Narrow-scope mitigation helpers."""

from __future__ import annotations


def new_domain_mitigation(
    *, legitimacy: float, hard_red_flag: bool, maximum: float = 0.75
) -> float:
    if hard_red_flag:
        return 0.0
    return min(maximum, max(0.0, legitimacy))


def mitigate_subsignal(score: float, factor: float) -> float:
    return max(0.0, score * (1.0 - min(0.75, max(0.0, factor))))
