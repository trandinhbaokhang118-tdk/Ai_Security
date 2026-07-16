"""Immutable, fail-fast CoreGuide v2 scoring configuration."""
from __future__ import annotations

from dataclasses import dataclass
from math import isclose

# Criteria 1..49 total exactly 80; criterion 50 is intentionally informational.
# The registry is explicit and stable even while individual detectors evolve.
_INTERNAL_WEIGHTS = (
    1.5, 1.0, 1.0, 1.0, 3.0, 2.0, 3.0, 1.0, 1.0, 2.0,
    3.0, 2.0, 2.0, 1.0, 1.0, 3.0, 1.5, 2.5, 3.0, 1.0,
    1.0, 1.5, 1.5, 0.5, 0.5, 1.0, 2.0, 3.0, 3.0, 3.0,
    2.5, 3.0, 1.0, 2.0, 2.5, 1.0, 1.0, 1.0, 1.0, 1.5,
    1.0, 1.0, 1.5, 1.5, 0.5, 1.5, 0.5, 1.5, 1.0,
)


@dataclass(frozen=True)
class CriterionConfig:
    criterion_id: int
    name: str
    max_weight: float
    coverage_weight: float


@dataclass(frozen=True)
class SourceConfig:
    source_id: str
    family: str
    raw_weight: float
    coverage_weight: float


@dataclass(frozen=True)
class RiskConfig:
    criteria: tuple[CriterionConfig, ...]
    sources: tuple[SourceConfig, ...]
    family_caps: dict[str, float]
    internal_cap: float = 80.0
    external_cap: float = 20.0
    rules_version: str = "coreguide-v2"
    weights_version: str = "64-criteria-v1"

    def validate(self) -> None:
        ids = [c.criterion_id for c in self.criteria]
        if ids != list(range(1, 51)) or len(set(ids)) != 50:
            raise ValueError("criteria must contain unique, ordered ids 1..50")
        for c in self.criteria:
            if not (0 <= c.max_weight <= self.internal_cap) or c.coverage_weight < 0:
                raise ValueError(f"invalid criterion weights: {c.criterion_id}")
        if self.criteria[49].max_weight != 0:
            raise ValueError("criterion 50 must have zero risk weight")
        if not isclose(sum(c.max_weight for c in self.criteria[:49]), self.internal_cap, abs_tol=1e-9):
            raise ValueError("criteria 1..49 must total exactly 80")
        source_ids = [s.source_id for s in self.sources]
        if len(self.sources) != 14 or len(set(source_ids)) != 14:
            raise ValueError("exactly 14 unique external sources (51..64) required")
        if not isclose(sum(s.raw_weight for s in self.sources), 25.0, abs_tol=1e-9):
            raise ValueError("external raw weights must total exactly 25")
        if any(s.family not in self.family_caps or s.raw_weight < 0 for s in self.sources):
            raise ValueError("source family/weight invalid")
        if not isclose(sum(self.family_caps.values()), self.external_cap, abs_tol=1e-9):
            raise ValueError("family caps must total exactly 20")


_DEFAULT_FAMILIES = ("reputation",) * 4 + ("threat_intel",) * 4 + ("sandbox",) * 3 + ("community",) * 3
_DEFAULT_RAW = (2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1)


def default_config() -> RiskConfig:
    criteria = tuple(
        CriterionConfig(i, f"criterion_{i:02d}", float(_INTERNAL_WEIGHTS[i - 1] if i <= 49 else 0), 1.0)
        for i in range(1, 51)
    )
    sources = tuple(
        SourceConfig(f"source_{i}", _DEFAULT_FAMILIES[i - 51], float(_DEFAULT_RAW[i - 51]), 1.0)
        for i in range(51, 65)
    )
    cfg = RiskConfig(criteria, sources, {"reputation": 6.0, "threat_intel": 6.0, "sandbox": 5.0, "community": 3.0})
    cfg.validate()
    return cfg
