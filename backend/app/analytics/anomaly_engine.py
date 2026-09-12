from __future__ import annotations

from dataclasses import dataclass
from statistics import mean, pstdev
from typing import Any


@dataclass
class AnomalyResult:
    metric: str
    current_value: float
    expected_value: float
    deviation_pct: float
    z_score: float
    severity: str
    is_anomaly: bool
    detection_reason: str
    explanation: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "metric": self.metric,
            "current_value": round(
                self.current_value,
                2,
            ),
            "expected_value": round(
                self.expected_value,
                2,
            ),
            "deviation_pct": round(
                self.deviation_pct,
                2,
            ),
            "z_score": round(
                self.z_score,
                3,
            ),
            "severity": self.severity,
            "is_anomaly": self.is_anomaly,
            "detection_reason": self.detection_reason,
            "explanation": self.explanation,
        }


def _calculate_z_score(
    current_value: float,
    historical_values: list[float],
) -> float:
    if len(historical_values) < 2:
        return 0.0

    historical_mean = mean(
        historical_values
    )

    standard_deviation = pstdev(
        historical_values
    )

    if standard_deviation == 0:
        return 0.0

    return (
        current_value - historical_mean
    ) / standard_deviation


def _calculate_deviation_pct(
    current_value: float,
    expected_value: float,
) -> float:
    if expected_value == 0:
        if current_value == 0:
            return 0.0

        return 100.0

    return (
        (current_value - expected_value)
        / abs(expected_value)
    ) * 100


def _statistical_severity(
    z_score: float,
) -> str:
    magnitude = abs(z_score)

    if magnitude >= 3.0:
        return "CRITICAL"

    if magnitude >= 2.0:
        return "MAJOR"

    if magnitude >= 1.5:
        return "MINOR"

    return "NORMAL"


def _business_severity(
    deviation_pct: float,
) -> str:
    magnitude = abs(deviation_pct)

    if magnitude >= 50:
        return "CRITICAL"

    if magnitude >= 30:
        return "MAJOR"

    if magnitude >= 15:
        return "MINOR"

    return "NORMAL"


def _severity_rank(
    severity: str,
) -> int:
    ranks = {
        "NORMAL": 0,
        "MINOR": 1,
        "MAJOR": 2,
        "CRITICAL": 3,
    }

    return ranks.get(
        severity,
        0,
    )


def _resolve_severity(
    *,
    z_score: float,
    deviation_pct: float,
) -> tuple[str, str]:
    statistical = _statistical_severity(
        z_score
    )

    business = _business_severity(
        deviation_pct
    )

    severity = (
        statistical
        if _severity_rank(statistical)
        >= _severity_rank(business)
        else business
    )

    reasons: list[str] = []

    if statistical != "NORMAL":
        reasons.append(
            f"statistical deviation "
            f"(z={z_score:.2f})"
        )

    if business != "NORMAL":
        reasons.append(
            f"business materiality "
            f"({abs(deviation_pct):.1f}% deviation)"
        )

    if not reasons:
        reasons.append(
            "within statistical and business thresholds"
        )

    return severity, "; ".join(reasons)


def detect_anomaly(
    *,
    metric: str,
    current_value: float,
    historical_values: list[float],
    z_threshold: float = 2.0,
    business_deviation_threshold_pct: float = 30.0,
) -> AnomalyResult:
    if historical_values:
        expected_value = mean(
            historical_values
        )
    else:
        expected_value = current_value

    z_score = _calculate_z_score(
        current_value=current_value,
        historical_values=historical_values,
    )

    deviation_pct = _calculate_deviation_pct(
        current_value=current_value,
        expected_value=expected_value,
    )

    statistical_anomaly = (
        abs(z_score) >= z_threshold
    )

    business_anomaly = (
        abs(deviation_pct)
        >= business_deviation_threshold_pct
    )

    is_anomaly = (
        statistical_anomaly
        or business_anomaly
    )

    if is_anomaly:
        severity, detection_reason = (
            _resolve_severity(
                z_score=z_score,
                deviation_pct=deviation_pct,
            )
        )
    else:
        severity = "NORMAL"
        detection_reason = (
            "within statistical and business thresholds"
        )

    if is_anomaly:
        direction = (
            "above"
            if current_value > expected_value
            else "below"
        )

        explanation = (
            f"{metric} is "
            f"{abs(deviation_pct):.1f}% "
            f"{direction} its expected value "
            f"with a z-score of {z_score:.2f}. "
            f"Detection basis: {detection_reason}."
        )
    else:
        explanation = (
            f"{metric} is within the expected "
            "statistical and business range."
        )

    return AnomalyResult(
        metric=metric,
        current_value=current_value,
        expected_value=expected_value,
        deviation_pct=deviation_pct,
        z_score=z_score,
        severity=severity,
        is_anomaly=is_anomaly,
        detection_reason=detection_reason,
        explanation=explanation,
    )


def detect_multiple_anomalies(
    observations: dict[str, dict[str, Any]],
    z_threshold: float = 2.0,
    business_deviation_threshold_pct: float = 30.0,
) -> list[AnomalyResult]:
    results: list[AnomalyResult] = []

    for metric, payload in observations.items():
        current_value = float(
            payload.get(
                "current_value",
                0,
            )
        )

        historical_values = [
            float(value)
            for value in payload.get(
                "historical_values",
                [],
            )
        ]

        results.append(
            detect_anomaly(
                metric=metric,
                current_value=current_value,
                historical_values=historical_values,
                z_threshold=z_threshold,
                business_deviation_threshold_pct=(
                    business_deviation_threshold_pct
                ),
            )
        )

    return results