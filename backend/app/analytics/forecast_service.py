from __future__ import annotations

from backend.app.analytics.forecast_engine import (
    ForecastResult,
    forecast_next_period,
)
from backend.app.analytics.forecast_queries import (
    get_daily_forecast_series,
)


def _build_forecast(
    *,
    metric: str,
    series: list[dict],
) -> ForecastResult:
    values = [
        float(point.get("value", 0) or 0)
        for point in series
    ]

    return forecast_next_period(
        metric=metric,
        historical_values=values,
    )


async def get_business_forecasts() -> dict:
    series = await get_daily_forecast_series()

    forecasts: list[ForecastResult] = []

    for metric in (
        "revenue",
        "orders",
        "units",
        "aov",
    ):
        metric_series = series.get(
            metric,
            [],
        )

        forecasts.append(
            _build_forecast(
                metric=metric,
                series=metric_series,
            )
        )

    return {
        "status": "FORECASTED",
        "metrics_forecasted": len(
            forecasts
        ),
        "forecasts": [
            forecast.to_dict()
            for forecast in forecasts
        ],
    }