from __future__ import annotations

from typing import Any

from backend.app.scenarios.scenario_decision_service import (
    _scenario_confidence,
)
from backend.app.scenarios.scenario_policy import (
    scenario_action,
    scenario_priority,
    scenario_risk,
)
from backend.app.scenarios.scenario_service import (
    get_scenario_baseline,
)
from backend.app.scenarios.scenario_engine import (
    simulate_driver_scenario,
)


DEFAULT_SCENARIO_CHANGES = [
    -20.0,
    -10.0,
    0.0,
    10.0,
    20.0,
]


def _normalize_driver(
    driver: dict[str, Any],
) -> dict[str, Any]:
    return {
        "driver_type": driver.get(
            "driver_type",
            "UNKNOWN",
        ),
        "driver": driver.get(
            "driver",
            "UNKNOWN",
        ),
        "current_value": float(
            driver.get(
                "current_value",
                0,
            )
            or 0
        ),
        "previous_value": float(
            driver.get(
                "previous_value",
                0,
            )
            or 0
        ),
        "absolute_change": float(
            driver.get(
                "absolute_change",
                0,
            )
            or 0
        ),
        "percentage_change": driver.get(
            "percentage_change"
        ),
        "contribution_share_pct": float(
            driver.get(
                "contribution_share_pct",
                0,
            )
            or 0
        ),
        "direction": driver.get(
            "direction",
            "FLAT",
        ),
        "significance": driver.get(
            "significance",
            "STABLE",
        ),
    }


def _build_local_scenario(
    *,
    target: str,
    current_revenue: float,
    driver_value: float,
    change_pct: float,
) -> dict[str, Any]:
    scenario = simulate_driver_scenario(
        target=target,
        current_total=current_revenue,
        driver_value=driver_value,
        change_pct=change_pct,
    )

    scenario_data = scenario.to_dict()

    impact_pct = float(
        scenario_data.get(
            "impact_pct",
            0,
        )
        or 0
    )

    direction = str(
        scenario_data.get(
            "direction",
            "FLAT",
        )
    ).upper()

    downside = direction == "DOWN"

    priority = scenario_priority(
        impact_pct,
        downside=downside,
    )

    risk_level = scenario_risk(
        priority
    )

    decision_title, _ = scenario_action(
        target=target,
        direction=direction,
        priority=priority,
    )

    confidence = _scenario_confidence(
        impact_pct=impact_pct,
    )

    return {
        "change_pct": float(
            change_pct
        ),
        "scenario_value": float(
            scenario_data.get(
                "scenario_value",
                0,
            )
            or 0
        ),
        "absolute_impact": float(
            scenario_data.get(
                "absolute_impact",
                0,
            )
            or 0
        ),
        "impact_pct": impact_pct,
        "direction": direction,
        "risk_level": risk_level,
        "priority": priority,
        "decision": decision_title,
        "confidence": confidence,
    }


async def get_scenario_overview(
    *,
    changes: list[float] | None = None,
    driver_limit: int = 5,
) -> dict[str, Any]:
    # Fetch database-backed baseline exactly once.
    baseline = await get_scenario_baseline()

    current_revenue = float(
        baseline.get(
            "current_revenue",
            0,
        )
        or 0
    )

    raw_drivers = baseline.get(
        "top_drivers",
        [],
    )

    normalized_drivers = [
        _normalize_driver(driver)
        for driver in raw_drivers[
            :driver_limit
        ]
    ]

    scenario_changes = (
        list(changes)
        if changes is not None
        else list(
            DEFAULT_SCENARIO_CHANGES
        )
    )

    scenario_matrix: list[
        dict[str, Any]
    ] = []

    for driver in normalized_drivers:
        target = str(
            driver["driver"]
        )

        driver_value = float(
            driver.get(
                "current_value",
                0,
            )
            or 0
        )

        driver_scenarios = [
            _build_local_scenario(
                target=target,
                current_revenue=current_revenue,
                driver_value=driver_value,
                change_pct=change_pct,
            )
            for change_pct in scenario_changes
        ]

        scenario_matrix.append(
            {
                "driver": target,
                "driver_type": driver[
                    "driver_type"
                ],
                "baseline_value": driver_value,
                "scenarios": driver_scenarios,
            }
        )

    return {
        "status": "READY",
        "baseline": {
            "revenue": current_revenue,
            "periods": baseline.get(
                "periods"
            ),
        },
        "available_drivers": normalized_drivers,
        "scenario_changes": scenario_changes,
        "scenario_matrix": scenario_matrix,
    }