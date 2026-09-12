from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class VarianceResult:
    metric: str
    current_value: float
    previous_value: float
    absolute_change: float
    percentage_change: float
    direction: str
    significance: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "metric": self.metric,
            "current_value": self.current_value,
            "previous_value": self.previous_value,
            "absolute_change": self.absolute_change,
            "percentage_change": self.percentage_change,
            "direction": self.direction,
            "significance": self.significance,
        }


def calculate_variance(
    *,
    metric: str,
    current_value: float,
    previous_value: float,
) -> VarianceResult:
    absolute_change = (
        current_value - previous_value
    )

    if previous_value == 0:
        percentage_change = (
            100.0
            if current_value > 0
            else 0.0
        )
    else:
        percentage_change = (
            absolute_change
            / abs(previous_value)
        ) * 100

    if absolute_change > 0:
        direction = "UP"
    elif absolute_change < 0:
        direction = "DOWN"
    else:
        direction = "FLAT"

    magnitude = abs(percentage_change)

    if magnitude >= 20:
        significance = "MAJOR"
    elif magnitude >= 10:
        significance = "MODERATE"
    elif magnitude >= 5:
        significance = "MINOR"
    else:
        significance = "STABLE"

    return VarianceResult(
        metric=metric,
        current_value=round(
            current_value,
            2,
        ),
        previous_value=round(
            previous_value,
            2,
        ),
        absolute_change=round(
            absolute_change,
            2,
        ),
        percentage_change=round(
            percentage_change,
            2,
        ),
        direction=direction,
        significance=significance,
    )


def calculate_period_variances(
    *,
    current: dict[str, float],
    previous: dict[str, float],
) -> list[VarianceResult]:
    results: list[VarianceResult] = []

    for metric, current_value in current.items():
        previous_value = previous.get(
            metric,
            0.0,
        )

        results.append(
            calculate_variance(
                metric=metric,
                current_value=current_value,
                previous_value=previous_value,
            )
        )

    return results