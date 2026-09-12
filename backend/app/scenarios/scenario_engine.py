from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class ScenarioResult:
    scenario_type: str
    target: str
    baseline_value: float
    change_pct: float
    scenario_value: float
    absolute_impact: float
    impact_pct: float
    direction: str
    risk_level: str
    explanation: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "scenario_type": self.scenario_type,
            "target": self.target,
            "baseline_value": round(
                self.baseline_value,
                2,
            ),
            "change_pct": round(
                self.change_pct,
                2,
            ),
            "scenario_value": round(
                self.scenario_value,
                2,
            ),
            "absolute_impact": round(
                self.absolute_impact,
                2,
            ),
            "impact_pct": round(
                self.impact_pct,
                2,
            ),
            "direction": self.direction,
            "risk_level": self.risk_level,
            "explanation": self.explanation,
        }


def _risk_from_impact(
    impact_pct: float,
) -> str:
    magnitude = abs(impact_pct)

    if magnitude >= 20:
        return "HIGH"

    if magnitude >= 10:
        return "MEDIUM"

    return "LOW"


def simulate_revenue_scenario(
    *,
    target: str,
    baseline_revenue: float,
    target_revenue: float,
    change_pct: float,
) -> ScenarioResult:
    scenario_value = (
        target_revenue
        * (
            1
            + change_pct / 100
        )
    )

    absolute_impact = (
        scenario_value
        - baseline_revenue
    )

    if baseline_revenue == 0:
        impact_pct = (
            100.0
            if scenario_value != 0
            else 0.0
        )
    else:
        impact_pct = (
            absolute_impact
            / abs(baseline_revenue)
        ) * 100

    if absolute_impact > 0:
        direction = "UP"
    elif absolute_impact < 0:
        direction = "DOWN"
    else:
        direction = "FLAT"

    risk_level = _risk_from_impact(
        impact_pct
    )

    explanation = (
        f"A {change_pct:.1f}% scenario adjustment "
        f"to {target} changes its revenue from "
        f"{target_revenue:,.2f} to "
        f"{scenario_value:,.2f}. "
        f"The resulting total revenue impact is "
        f"{absolute_impact:,.2f} "
        f"({impact_pct:+.1f}%)."
    )

    return ScenarioResult(
        scenario_type="REVENUE_CHANGE",
        target=target,
        baseline_value=baseline_revenue,
        change_pct=change_pct,
        scenario_value=scenario_value,
        absolute_impact=absolute_impact,
        impact_pct=impact_pct,
        direction=direction,
        risk_level=risk_level,
        explanation=explanation,
    )


def simulate_driver_scenario(
    *,
    target: str,
    current_total: float,
    driver_value: float,
    change_pct: float,
) -> ScenarioResult:
    scenario_driver_value = (
        driver_value
        * (
            1
            + change_pct / 100
        )
    )

    absolute_impact = (
        scenario_driver_value
        - driver_value
    )

    scenario_total = (
        current_total
        + absolute_impact
    )

    if current_total == 0:
        impact_pct = (
            100.0
            if scenario_total != 0
            else 0.0
        )
    else:
        impact_pct = (
            absolute_impact
            / abs(current_total)
        ) * 100

    if absolute_impact > 0:
        direction = "UP"
    elif absolute_impact < 0:
        direction = "DOWN"
    else:
        direction = "FLAT"

    risk_level = _risk_from_impact(
        impact_pct
    )

    explanation = (
        f"A {change_pct:.1f}% change in "
        f"{target} changes its contribution from "
        f"{driver_value:,.2f} to "
        f"{scenario_driver_value:,.2f}, "
        f"producing an estimated total revenue "
        f"impact of {absolute_impact:,.2f} "
        f"({impact_pct:+.1f}%)."
    )

    return ScenarioResult(
        scenario_type="DRIVER_CHANGE",
        target=target,
        baseline_value=driver_value,
        change_pct=change_pct,
        scenario_value=scenario_driver_value,
        absolute_impact=absolute_impact,
        impact_pct=impact_pct,
        direction=direction,
        risk_level=risk_level,
        explanation=explanation,
    )


def compare_scenarios(
    scenarios: list[ScenarioResult],
) -> list[ScenarioResult]:
    return sorted(
        scenarios,
        key=lambda scenario: abs(
            scenario.absolute_impact
        ),
        reverse=True,
    )