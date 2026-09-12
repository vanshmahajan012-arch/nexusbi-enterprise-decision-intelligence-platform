from __future__ import annotations

from backend.app.analytics.anomaly_engine import (
    AnomalyResult,
    detect_anomaly,
)
from backend.app.analytics.anomaly_queries import (
    get_daily_business_series,
)


def _build_metric_observation(
    *,
    values: list[float],
    current_index: int,
) -> tuple[float, list[float]]:
    current_value = values[current_index]

    historical_values = values[:current_index]

    return current_value, historical_values


def _detect_series_anomaly(
    *,
    metric: str,
    values: list[float],
    z_threshold: float = 2.0,
) -> AnomalyResult | None:
    if len(values) < 3:
        return None

    current_index = len(values) - 1

    current_value, historical_values = (
        _build_metric_observation(
            values=values,
            current_index=current_index,
        )
    )

    if len(historical_values) < 2:
        return None

    return detect_anomaly(
        metric=metric,
        current_value=current_value,
        historical_values=historical_values,
        z_threshold=z_threshold,
    )


async def get_real_anomaly_analysis(
    z_threshold: float = 2.0,
) -> dict:
    series = await get_daily_business_series()

    metric_series = {
        "revenue": [
            float(point["revenue"])
            for point in series["revenue"]
        ],
        "orders": [
            float(point["orders"])
            for point in series["orders"]
        ],
        "units": [
            float(point["units"])
            for point in series["units"]
        ],
        "aov": [
            float(point["aov"])
            for point in series["aov"]
        ],
    }

    anomalies: list[AnomalyResult] = []

    for metric, values in metric_series.items():
        result = _detect_series_anomaly(
            metric=metric,
            values=values,
            z_threshold=z_threshold,
        )

        if result is not None:
            anomalies.append(result)

    detected = [
        anomaly
        for anomaly in anomalies
        if anomaly.is_anomaly
    ]

    critical = [
        anomaly
        for anomaly in detected
        if anomaly.severity == "CRITICAL"
    ]

    major = [
        anomaly
        for anomaly in detected
        if anomaly.severity == "MAJOR"
    ]

    return {
        "status": "ANALYZED",
        "metrics_analyzed": len(metric_series),
        "anomalies_evaluated": len(anomalies),
        "anomalies_detected": len(detected),
        "critical_count": len(critical),
        "major_count": len(major),
        "results": [
            anomaly.to_dict()
            for anomaly in anomalies
        ],
        "detected_anomalies": [
            anomaly.to_dict()
            for anomaly in detected
        ],
    }