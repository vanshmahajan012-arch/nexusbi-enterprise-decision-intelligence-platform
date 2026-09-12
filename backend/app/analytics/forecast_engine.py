from __future__ import annotations

from dataclasses import dataclass
from statistics import mean
from typing import Any


@dataclass
class ForecastResult:
    metric: str
    historical_points: int
    last_actual: float
    forecast_p50: float
    forecast_p10: float
    forecast_p90: float
    trend_per_period: float
    confidence: float
    model: str
    explanation: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "metric": self.metric,
            "historical_points": self.historical_points,
            "last_actual": round(
                self.last_actual,
                2,
            ),
            "forecast_p50": round(
                self.forecast_p50,
                2,
            ),
            "forecast_p10": round(
                self.forecast_p10,
                2,
            ),
            "forecast_p90": round(
                self.forecast_p90,
                2,
            ),
            "trend_per_period": round(
                self.trend_per_period,
                2,
            ),
            "confidence": round(
                self.confidence,
                2,
            ),
            "model": self.model,
            "explanation": self.explanation,
        }


def _linear_trend(
    values: list[float],
) -> float:
    if len(values) < 2:
        return 0.0

    x_mean = mean(
        range(len(values))
    )

    y_mean = mean(values)

    numerator = sum(
        (
            x - x_mean
        ) * (
            y - y_mean
        )
        for x, y in enumerate(values)
    )

    denominator = sum(
        (
            x - x_mean
        ) ** 2
        for x in range(len(values))
    )

    if denominator == 0:
        return 0.0

    return numerator / denominator


def _historical_dispersion(
    values: list[float],
) -> float:
    if len(values) < 2:
        return 0.0

    average = mean(values)

    return mean(
        abs(
            value - average
        )
        for value in values
    )


def forecast_next_period(
    *,
    metric: str,
    historical_values: list[float],
    confidence_base: float = 0.70,
) -> ForecastResult:
    if not historical_values:
        return ForecastResult(
            metric=metric,
            historical_points=0,
            last_actual=0.0,
            forecast_p50=0.0,
            forecast_p10=0.0,
            forecast_p90=0.0,
            trend_per_period=0.0,
            confidence=0.0,
            model="LINEAR_TREND_BASELINE",
            explanation=(
                "No historical observations are available "
                "for forecasting."
            ),
        )

    last_actual = float(
        historical_values[-1]
    )

    trend = _linear_trend(
        historical_values
    )

    dispersion = _historical_dispersion(
        historical_values
    )

    raw_forecast = (
        last_actual + trend
    )

    # Avoid negative forecasts for business
    # quantities such as revenue/orders/units.
    forecast_p50 = max(
        0.0,
        raw_forecast,
    )

    uncertainty = max(
        dispersion,
        abs(trend) * 0.5,
        0.0,
    )

    forecast_p10 = max(
        0.0,
        forecast_p50 - uncertainty,
    )

    forecast_p90 = (
        forecast_p50 + uncertainty
    )

    history_factor = min(
        len(historical_values) / 12.0,
        1.0,
    )

    stability_factor = 1.0

    if forecast_p50 > 0:
        relative_uncertainty = (
            uncertainty / forecast_p50
        )

        stability_factor = max(
            0.0,
            1.0 - min(
                relative_uncertainty,
                1.0,
            ),
        )

    confidence = (
        confidence_base
        * history_factor
        * (
            0.70
            + 0.30 * stability_factor
        )
        * 100
    )

    confidence = max(
        20.0,
        min(
            confidence,
            95.0,
        ),
    )

    if trend > 0:
        direction = "increasing"
    elif trend < 0:
        direction = "declining"
    else:
        direction = "stable"

    explanation = (
        f"{metric} is forecast to be "
        f"{forecast_p50:,.2f} next period, "
        f"with an expected range of "
        f"{forecast_p10:,.2f} to "
        f"{forecast_p90:,.2f}. "
        f"The observed trend is {direction}, "
        f"with an estimated change of "
        f"{trend:,.2f} per period."
    )

    return ForecastResult(
        metric=metric,
        historical_points=len(
            historical_values
        ),
        last_actual=last_actual,
        forecast_p50=forecast_p50,
        forecast_p10=forecast_p10,
        forecast_p90=forecast_p90,
        trend_per_period=trend,
        confidence=confidence,
        model="LINEAR_TREND_BASELINE",
        explanation=explanation,
    )


def forecast_multiple_metrics(
    observations: dict[str, list[float]],
) -> list[ForecastResult]:
    results: list[ForecastResult] = []

    for metric, values in observations.items():
        results.append(
            forecast_next_period(
                metric=metric,
                historical_values=values,
            )
        )

    return results