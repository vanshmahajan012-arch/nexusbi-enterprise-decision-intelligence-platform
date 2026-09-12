from __future__ import annotations

from backend.app.analytics.variance_engine import (
    VarianceResult,
    calculate_period_variances,
)
from backend.app.analytics.variance_queries import (
    get_current_vs_previous_metrics,
)


async def get_business_variances() -> dict:
    comparison = (
        await get_current_vs_previous_metrics()
    )

    current = comparison["current"]
    previous = comparison["previous"]

    variances: list[VarianceResult] = (
        calculate_period_variances(
            current=current,
            previous=previous,
        )
    )

    return {
        "current": current,
        "previous": previous,
        "periods": comparison["periods"],
        "variances": [
            variance.to_dict()
            for variance in variances
        ],
    }