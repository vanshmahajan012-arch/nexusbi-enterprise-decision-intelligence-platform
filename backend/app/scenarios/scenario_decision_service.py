from __future__ import annotations

from typing import Any

from backend.app.decisions.decision_engine import (
    DecisionRecommendation,
)
from backend.app.scenarios.scenario_policy import (
    scenario_action,
    scenario_priority,
    scenario_risk,
)
from backend.app.scenarios.scenario_service import (
    simulate_driver_change,
)


def _scenario_confidence(
    *,
    impact_pct: float,
) -> float:
    """
    Confidence for a deterministic what-if calculation.

    This is not forecast confidence. It reflects how clearly
    the modeled scenario changes the selected driver and the
    resulting revenue impact.
    """

    magnitude = abs(impact_pct)

    if magnitude >= 25:
        return 90.0

    if magnitude >= 15:
        return 86.0

    if magnitude >= 5:
        return 82.0

    return 78.0


async def evaluate_scenario_decision(
    *,
    target: str,
    change_pct: float,
) -> dict[str, Any]:
    scenario = await simulate_driver_change(
        target=target,
        change_pct=change_pct,
    )

    scenario_data = scenario["scenario"]
    baseline_data = scenario["baseline"]

    impact_pct = float(
        scenario_data.get(
            "impact_pct",
            0,
        )
        or 0
    )

    absolute_impact = float(
        scenario_data.get(
            "absolute_impact",
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

    baseline_revenue = float(
        baseline_data.get(
            "revenue",
            0,
        )
        or 0
    )

    scenario_revenue = (
        baseline_revenue
        + absolute_impact
    )

    downside = (
        direction == "DOWN"
    )

    priority = scenario_priority(
        impact_pct,
        downside=downside,
    )

    risk_level = scenario_risk(
        priority
    )

    title, rationale = scenario_action(
        target=target,
        direction=direction,
        priority=priority,
    )

    confidence = _scenario_confidence(
        impact_pct=impact_pct,
    )

    expected_impact = (
        "This is a deterministic what-if scenario, "
        "not a forecast. The modeled result assumes "
        "other business drivers remain unchanged."
    )

    decision = DecisionRecommendation(
        decision_type="SCENARIO_DECISION",
        title=title,
        priority=priority,
        rationale=rationale,
        evidence=[
            f"Target: {target}",
            (
                f"Scenario change: "
                f"{change_pct:+.2f}%"
            ),
            (
                f"Baseline revenue: "
                f"{baseline_revenue:,.2f}"
            ),
            (
                f"Scenario revenue: "
                f"{scenario_revenue:,.2f}"
            ),
            (
                f"Absolute revenue impact: "
                f"{absolute_impact:+,.2f}"
            ),
            (
                f"Revenue impact: "
                f"{impact_pct:+.2f}%"
            ),
        ],
        expected_impact=expected_impact,
        risk_level=risk_level,
        confidence=confidence,
        related_metrics=[
            "revenue",
        ],
        event_group=(
            f"SCENARIO:{target.upper()}"
        ),
    )

    return {
        "status": "EVALUATED",
        "target": target,
        "change_pct": change_pct,
        "scenario": scenario,
        "decision": decision.to_dict(),
    }