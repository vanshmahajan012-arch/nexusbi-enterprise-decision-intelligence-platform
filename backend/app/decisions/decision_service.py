from __future__ import annotations

from backend.app.decisions.decision_engine import (
    DecisionRecommendation,
    generate_decision_summary,
    generate_decisions_from_anomalies,
    generate_decisions_from_drivers,
    rank_decisions,
)
from backend.app.analytics.anomaly_service import (
    get_real_anomaly_analysis,
)
from backend.app.analytics.driver_service import (
    get_driver_analysis,
)


async def get_decision_intelligence() -> dict:
    driver_analysis = (
        await get_driver_analysis()
    )

    anomaly_analysis = (
        await get_real_anomaly_analysis()
    )

    driver_decisions = (
        generate_decisions_from_drivers(
            driver_analysis.get(
                "top_drivers",
                [],
            )
        )
    )

    anomaly_decisions = (
        generate_decisions_from_anomalies(
            anomaly_analysis.get(
                "detected_anomalies",
                [],
            )
        )
    )

    all_decisions: list[
        DecisionRecommendation
    ] = (
        driver_decisions
        + anomaly_decisions
    )

    ranked_decisions = rank_decisions(
        all_decisions,
        limit=10,
    )

    critical_count = sum(
        decision.priority == "CRITICAL"
        for decision in ranked_decisions
    )

    high_count = sum(
        decision.priority == "HIGH"
        for decision in ranked_decisions
    )

    return {
        "status": "ANALYZED",
        "decision_count": len(
            ranked_decisions
        ),
        "critical_count": critical_count,
        "high_priority_count": high_count,
        "decisions": [
            decision.to_dict()
            for decision in ranked_decisions
        ],
        "summary": generate_decision_summary(
            ranked_decisions
        ),
    }