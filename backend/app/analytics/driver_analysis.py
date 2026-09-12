from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class DriverInsight:
    driver_type: str
    driver: str
    current_value: float
    previous_value: float
    absolute_change: float
    percentage_change: float | None
    contribution_share_pct: float
    direction: str
    significance: str
    explanation: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "driver_type": self.driver_type,
            "driver": self.driver,
            "current_value": round(
                self.current_value,
                2,
            ),
            "previous_value": round(
                self.previous_value,
                2,
            ),
            "absolute_change": round(
                self.absolute_change,
                2,
            ),
            "percentage_change": (
                round(
                    self.percentage_change,
                    2,
                )
                if self.percentage_change is not None
                else None
            ),
            "contribution_share_pct": round(
                self.contribution_share_pct,
                2,
            ),
            "direction": self.direction,
            "significance": self.significance,
            "explanation": self.explanation,
        }


def _percentage_change(
    current: float,
    previous: float,
) -> float | None:
    # 0 -> positive value is a new/emerging driver,
    # not a meaningful percentage-growth calculation.
    if previous == 0:
        return None

    return (
        (current - previous)
        / abs(previous)
    ) * 100


def _classify_driver(
    *,
    current: float,
    previous: float,
    percentage_change: float | None,
) -> str:
    if previous == 0 and current > 0:
        return "NEW_DRIVER"

    if current == 0 and previous > 0:
        return "DECLINING_DRIVER"

    if percentage_change is None:
        return "STABLE_DRIVER"

    magnitude = abs(percentage_change)

    if magnitude < 5:
        return "STABLE_DRIVER"

    if percentage_change > 0:
        return "GROWING_DRIVER"

    return "DECLINING_DRIVER"


def _direction(
    change: float,
) -> str:
    if change > 0:
        return "UP"

    if change < 0:
        return "DOWN"

    return "FLAT"


def _significance(
    *,
    driver_type: str,
    percentage_change: float | None,
) -> str:
    # New / fully lost drivers should be assessed using
    # absolute contribution, not an artificial 100% rate.
    if driver_type in {
        "NEW_DRIVER",
        "DECLINING_DRIVER",
    }:
        return "MAJOR"

    if percentage_change is None:
        return "STABLE"

    magnitude = abs(percentage_change)

    if magnitude >= 20:
        return "MAJOR"

    if magnitude >= 10:
        return "MODERATE"

    if magnitude >= 5:
        return "MINOR"

    return "STABLE"


def _build_driver(
    *,
    driver_type: str,
    driver: str,
    current_value: float,
    previous_value: float,
    current_total: float,
    previous_total: float,
) -> DriverInsight:
    change = (
        current_value
        - previous_value
    )

    percentage_change = _percentage_change(
        current_value,
        previous_value,
    )

    contribution_base = max(
        abs(current_total),
        abs(previous_total),
        0.000001,
    )

    contribution_share_pct = (
        abs(change)
        / contribution_base
    ) * 100

    direction = _direction(change)

    classification = _classify_driver(
        current=current_value,
        previous=previous_value,
        percentage_change=percentage_change,
    )

    significance = _significance(
        driver_type=classification,
        percentage_change=percentage_change,
    )

    driver_change_text = (
        f"{abs(percentage_change):.1f}%"
        if percentage_change is not None
        else "from zero baseline"
    )

    if classification == "NEW_DRIVER":
        explanation = (
            f"{driver} is a new driver in the current "
            f"period with {current_value:,.2f} in value. "
            f"It contributed {contribution_share_pct:.1f}% "
            "of the total period movement."
        )

    elif classification == "DECLINING_DRIVER" and current_value == 0:
        explanation = (
            f"{driver} dropped from "
            f"{previous_value:,.2f} to zero. "
            f"It accounted for {contribution_share_pct:.1f}% "
            "of the total period movement."
        )

    elif classification == "GROWING_DRIVER":
        explanation = (
            f"{driver} increased by "
            f"{driver_change_text} and contributed "
            f"{contribution_share_pct:.1f}% "
            "of the total period movement."
        )

    elif classification == "DECLINING_DRIVER":
        explanation = (
            f"{driver} declined by "
            f"{driver_change_text} and accounted for "
            f"{contribution_share_pct:.1f}% "
            "of the total period movement."
        )

    else:
        explanation = (
            f"{driver} remained relatively stable "
            "across the compared periods."
        )

    return DriverInsight(
        driver_type=classification,
        driver=driver,
        current_value=current_value,
        previous_value=previous_value,
        absolute_change=change,
        percentage_change=percentage_change,
        contribution_share_pct=contribution_share_pct,
        direction=direction,
        significance=significance,
        explanation=explanation,
    )


def analyze_dimension_drivers(
    *,
    current_rows: list[dict[str, Any]],
    previous_rows: list[dict[str, Any]],
    dimension_key: str,
    value_key: str,
    driver_type: str,
) -> list[DriverInsight]:
    current_map: dict[str, float] = {}
    previous_map: dict[str, float] = {}

    for row in current_rows:
        key = str(
            row.get(
                dimension_key,
                "UNKNOWN",
            )
        )

        current_map[key] = (
            current_map.get(key, 0.0)
            + float(
                row.get(
                    value_key,
                    0,
                )
                or 0
            )
        )

    for row in previous_rows:
        key = str(
            row.get(
                dimension_key,
                "UNKNOWN",
            )
        )

        previous_map[key] = (
            previous_map.get(key, 0.0)
            + float(
                row.get(
                    value_key,
                    0,
                )
                or 0
            )
        )

    all_drivers = (
        set(current_map)
        | set(previous_map)
    )

    current_total = sum(
        current_map.values()
    )

    previous_total = sum(
        previous_map.values()
    )

    results: list[DriverInsight] = []

    for driver in all_drivers:
        current_value = current_map.get(
            driver,
            0.0,
        )

        previous_value = previous_map.get(
            driver,
            0.0,
        )

        results.append(
            _build_driver(
                driver_type=driver_type,
                driver=driver,
                current_value=current_value,
                previous_value=previous_value,
                current_total=current_total,
                previous_total=previous_total,
            )
        )

    results.sort(
        key=lambda item: abs(
            item.absolute_change
        ),
        reverse=True,
    )

    return results


def rank_top_drivers(
    drivers: list[DriverInsight],
    limit: int = 5,
) -> list[DriverInsight]:
    return sorted(
        drivers,
        key=lambda item: abs(
            item.absolute_change
        ),
        reverse=True,
    )[:limit]


def generate_driver_summary(
    drivers: list[DriverInsight],
) -> str:
    if not drivers:
        return (
            "No significant business drivers "
            "were identified."
        )

    top = rank_top_drivers(
        drivers,
        limit=3,
    )

    summaries: list[str] = []

    for driver in top:
        summaries.append(
            driver.explanation
        )

    return " ".join(summaries)