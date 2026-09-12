from __future__ import annotations

from backend.app.analytics.driver_service import (
    get_driver_analysis,
)
from backend.app.analytics.variance_service import (
    get_business_variances,
)
from backend.app.scenarios.scenario_engine import (
    ScenarioResult,
    compare_scenarios,
    simulate_driver_scenario,
)


def _get_current_revenue(
    variance: dict,
) -> float:
    current = variance.get(
        "current",
        {},
    )

    return float(
        current.get(
            "revenue",
            0,
        )
        or 0
    )


async def get_scenario_baseline() -> dict:
    variance = await get_business_variances()
    drivers = await get_driver_analysis()

    current_revenue = _get_current_revenue(
        variance
    )

    top_drivers = drivers.get(
        "top_drivers",
        [],
    )

    return {
        "current_revenue": current_revenue,
        "top_drivers": top_drivers,
        "periods": variance.get(
            "periods"
        ),
    }


async def simulate_driver_change(
    *,
    target: str,
    change_pct: float,
) -> dict:
    baseline = await get_scenario_baseline()

    current_revenue = baseline[
        "current_revenue"
    ]

    matching_driver = next(
        (
            driver
            for driver in baseline["top_drivers"]
            if str(
                driver.get(
                    "driver",
                    "",
                )
            ).lower()
            == target.lower()
        ),
        None,
    )

    if matching_driver is None:
        raise ValueError(
            f"Driver '{target}' was not found "
            "in the current top-driver set."
        )

    driver_value = float(
        matching_driver.get(
            "current_value",
            0,
        )
        or 0
    )

    scenario = simulate_driver_scenario(
        target=target,
        current_total=current_revenue,
        driver_value=driver_value,
        change_pct=change_pct,
    )

    return {
        "status": "SIMULATED",
        "baseline": {
            "revenue": current_revenue,
            "driver": target,
            "driver_value": driver_value,
        },
        "scenario": scenario.to_dict(),
        "periods": baseline[
            "periods"
        ],
    }


async def compare_driver_scenarios(
    *,
    target: str,
    changes: list[float],
) -> dict:
    baseline = await get_scenario_baseline()

    current_revenue = baseline[
        "current_revenue"
    ]

    matching_driver = next(
        (
            driver
            for driver in baseline["top_drivers"]
            if str(
                driver.get(
                    "driver",
                    "",
                )
            ).lower()
            == target.lower()
        ),
        None,
    )

    if matching_driver is None:
        raise ValueError(
            f"Driver '{target}' was not found "
            "in the current top-driver set."
        )

    driver_value = float(
        matching_driver.get(
            "current_value",
            0,
        )
        or 0
    )

    scenarios: list[ScenarioResult] = []

    for change_pct in changes:
        scenarios.append(
            simulate_driver_scenario(
                target=target,
                current_total=current_revenue,
                driver_value=driver_value,
                change_pct=float(
                    change_pct
                ),
            )
        )

    ranked = compare_scenarios(
        scenarios
    )

    return {
        "status": "SIMULATED",
        "baseline": {
            "revenue": current_revenue,
            "driver": target,
            "driver_value": driver_value,
        },
        "scenarios": [
            scenario.to_dict()
            for scenario in ranked
        ],
        "periods": baseline[
            "periods"
        ],
    }