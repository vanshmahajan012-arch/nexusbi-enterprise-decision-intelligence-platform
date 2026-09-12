from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class DecisionRecommendation:
    decision_type: str
    title: str
    priority: str
    rationale: str
    evidence: list[str]
    expected_impact: str
    risk_level: str
    confidence: float
    related_metrics: list[str] | None = None
    event_group: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "decision_type": self.decision_type,
            "title": self.title,
            "priority": self.priority,
            "rationale": self.rationale,
            "evidence": self.evidence,
            "expected_impact": self.expected_impact,
            "risk_level": self.risk_level,
            "confidence": round(
                self.confidence,
                2,
            ),
            "related_metrics": (
                self.related_metrics or []
            ),
            "event_group": self.event_group,
        }


def _priority_rank(
    priority: str,
) -> int:
    return {
        "CRITICAL": 4,
        "HIGH": 3,
        "MEDIUM": 2,
        "LOW": 1,
    }.get(
        priority,
        0,
    )


def _priority_from_impact(
    impact_score: float,
) -> str:
    magnitude = abs(impact_score)

    if magnitude >= 75:
        return "CRITICAL"

    if magnitude >= 50:
        return "HIGH"

    if magnitude >= 25:
        return "MEDIUM"

    return "LOW"


def _risk_from_priority(
    priority: str,
) -> str:
    if priority in {
        "CRITICAL",
        "HIGH",
    }:
        return "HIGH"

    if priority == "MEDIUM":
        return "MEDIUM"

    return "LOW"


def _confidence_from_evidence(
    *,
    evidence_count: int,
    base_confidence: float,
) -> float:
    evidence_factor = min(
        evidence_count / 4.0,
        1.0,
    )

    confidence = (
        base_confidence * 0.70
        + evidence_factor * 30.0
    )

    return min(
        max(confidence, 0.0),
        99.0,
    )


def build_decision(
    *,
    decision_type: str,
    title: str,
    impact_score: float,
    rationale: str,
    evidence: list[str],
    expected_impact: str,
    base_confidence: float,
    related_metrics: list[str] | None = None,
    event_group: str | None = None,
) -> DecisionRecommendation:
    priority = _priority_from_impact(
        impact_score
    )

    risk_level = _risk_from_priority(
        priority
    )

    confidence = _confidence_from_evidence(
        evidence_count=len(evidence),
        base_confidence=base_confidence,
    )

    return DecisionRecommendation(
        decision_type=decision_type,
        title=title,
        priority=priority,
        rationale=rationale,
        evidence=list(evidence),
        expected_impact=expected_impact,
        risk_level=risk_level,
        confidence=confidence,
        related_metrics=(
            list(related_metrics)
            if related_metrics
            else []
        ),
        event_group=event_group,
    )


def generate_decisions_from_drivers(
    drivers: list[dict[str, Any]],
    limit: int = 5,
) -> list[DecisionRecommendation]:
    decisions: list[DecisionRecommendation] = []

    for driver in drivers[:limit]:
        driver_type = str(
            driver.get(
                "driver_type",
                "UNKNOWN",
            )
        )

        driver_name = str(
            driver.get(
                "driver",
                "UNKNOWN",
            )
        )

        impact_score = float(
            driver.get(
                "contribution_share_pct",
                0,
            )
            or 0
        )

        absolute_change = float(
            driver.get(
                "absolute_change",
                0,
            )
            or 0
        )

        percentage_change = driver.get(
            "percentage_change"
        )

        if driver_type == "NEW_DRIVER":
            title = (
                f"Protect and validate {driver_name}"
            )

            rationale = (
                f"{driver_name} emerged as a new "
                "business driver in the current period."
            )

            expected_impact = (
                "Preserve the new contribution while "
                "validating whether it is sustainable."
            )

        elif driver_type == "GROWING_DRIVER":
            title = f"Scale {driver_name}"

            rationale = (
                f"{driver_name} is a growing driver "
                "with a material positive contribution."
            )

            expected_impact = (
                "Potentially sustain or expand the "
                "positive contribution."
            )

        elif driver_type == "DECLINING_DRIVER":
            title = (
                f"Investigate decline in {driver_name}"
            )

            rationale = (
                f"{driver_name} is a declining driver "
                "and may be reducing overall performance."
            )

            expected_impact = (
                "Identify recovery opportunities and "
                "reduce further downside risk."
            )

        else:
            title = f"Monitor {driver_name}"

            rationale = (
                f"{driver_name} is stable relative "
                "to the comparison period."
            )

            expected_impact = (
                "Maintain visibility and monitor for "
                "material change."
            )

        evidence = [
            f"Driver classification: {driver_type}",
            (
                f"Absolute change: "
                f"{absolute_change:,.2f}"
            ),
            (
                "Percentage change: "
                + (
                    f"{float(percentage_change):.2f}%"
                    if percentage_change is not None
                    else "not meaningful from zero baseline"
                )
            ),
            (
                f"Contribution share: "
                f"{impact_score:.2f}%"
            ),
        ]

        base_confidence = float(
            driver.get(
                "confidence",
                70.0,
            )
            or 70.0
        )

        decisions.append(
            build_decision(
                decision_type="DRIVER_ACTION",
                title=title,
                impact_score=impact_score,
                rationale=rationale,
                evidence=evidence,
                expected_impact=expected_impact,
                base_confidence=base_confidence,
                related_metrics=["revenue"],
                event_group=(
                    f"DRIVER:{driver_name.upper()}"
                ),
            )
        )

    return decisions


def generate_decisions_from_anomalies(
    anomalies: list[dict[str, Any]],
    limit: int = 5,
) -> list[DecisionRecommendation]:
    decisions: list[DecisionRecommendation] = []

    for anomaly in anomalies[:limit]:
        if not anomaly.get(
            "is_anomaly",
            False,
        ):
            continue

        metric = str(
            anomaly.get(
                "metric",
                "UNKNOWN",
            )
        ).lower()

        severity = str(
            anomaly.get(
                "severity",
                "MAJOR",
            )
        ).upper()

        deviation = float(
            anomaly.get(
                "deviation_pct",
                0,
            )
            or 0
        )

        z_score = float(
            anomaly.get(
                "z_score",
                0,
            )
            or 0
        )

        priority = {
            "CRITICAL": "CRITICAL",
            "MAJOR": "HIGH",
            "MINOR": "MEDIUM",
        }.get(
            severity,
            "MEDIUM",
        )

        # Revenue and AOV are treated as one correlated
        # business event to avoid duplicate executive alerts.
        if metric in {
            "revenue",
            "aov",
        }:
            title = (
                "Investigate revenue / AOV shift"
            )

            rationale = (
                "Revenue and Average Order Value are "
                "showing a related abnormal movement. "
                "Treat them as one underlying business event "
                "rather than separate alerts."
            )

            related_metrics = [
                "revenue",
                "aov",
            ]

            event_group = (
                "ANOMALY:REVENUE_AOV_SHIFT"
            )

        elif metric == "units":
            title = (
                "Investigate unit-volume decline"
            )

            rationale = (
                "Units sold are showing a material "
                "negative deviation from baseline."
            )

            related_metrics = [
                "units",
            ]

            event_group = (
                "ANOMALY:UNIT_VOLUME"
            )

        else:
            title = (
                f"Investigate {metric} anomaly"
            )

            rationale = (
                f"{metric} has been flagged as "
                f"a {severity.lower()} anomaly."
            )

            related_metrics = [
                metric,
            ]

            event_group = (
                f"ANOMALY:{metric.upper()}"
            )

        decisions.append(
            build_decision(
                decision_type="ANOMALY_RESPONSE",
                title=title,
                impact_score=min(
                    abs(deviation),
                    100.0,
                ),
                rationale=rationale,
                evidence=[
                    f"Severity: {severity}",
                    (
                        f"Deviation: "
                        f"{deviation:.2f}%"
                    ),
                    (
                        f"Z-score: "
                        f"{z_score:.3f}"
                    ),
                ],
                expected_impact=(
                    "Determine whether the signal "
                    "represents a temporary event, "
                    "structural change, or emerging risk."
                ),
                base_confidence=75.0,
                related_metrics=related_metrics,
                event_group=event_group,
            )
        )

    return decisions


def _merge_unique_strings(
    existing: list[str],
    incoming: list[str],
) -> list[str]:
    merged = list(existing)

    for value in incoming:
        if value not in merged:
            merged.append(value)

    return merged


def _merge_rationale(
    existing: str,
    incoming: str,
) -> str:
    existing_clean = existing.strip()
    incoming_clean = incoming.strip()

    if not incoming_clean:
        return existing_clean

    if not existing_clean:
        return incoming_clean

    if incoming_clean == existing_clean:
        return existing_clean

    # Prevent exact duplication.
    if incoming_clean in existing_clean:
        return existing_clean

    if existing_clean in incoming_clean:
        return incoming_clean

    return (
        f"{existing_clean} {incoming_clean}"
    )


def deduplicate_decisions(
    decisions: list[DecisionRecommendation],
) -> list[DecisionRecommendation]:
    """
    Merge decisions sharing the same event_group.

    Merge rules:
    - keep the strongest priority
    - recalculate risk from final priority
    - keep highest confidence
    - merge unique evidence
    - merge unique related metrics
    - avoid duplicate rationale text
    """

    grouped: dict[
        str,
        DecisionRecommendation,
    ] = {}

    for decision in decisions:
        event_group = (
            decision.event_group
            or decision.title
        )

        existing = grouped.get(
            event_group
        )

        if existing is None:
            grouped[event_group] = decision
            continue

        # Keep highest priority.
        if (
            _priority_rank(
                decision.priority
            )
            > _priority_rank(
                existing.priority
            )
        ):
            existing.priority = (
                decision.priority
            )

        # Risk follows final priority.
        existing.risk_level = (
            _risk_from_priority(
                existing.priority
            )
        )

        # Keep the strongest confidence.
        existing.confidence = max(
            existing.confidence,
            decision.confidence,
        )

        # Merge evidence without duplicates.
        existing.evidence = (
            _merge_unique_strings(
                existing.evidence,
                decision.evidence,
            )
        )

        # Merge metrics without duplicates.
        existing.related_metrics = (
            _merge_unique_strings(
                existing.related_metrics or [],
                decision.related_metrics or [],
            )
        )

        # Merge rationale without duplicating
        # identical text.
        existing.rationale = (
            _merge_rationale(
                existing.rationale,
                decision.rationale,
            )
        )

        # Keep a single expected impact statement
        # unless the incoming one adds new information.
        existing.expected_impact = (
            _merge_rationale(
                existing.expected_impact,
                decision.expected_impact,
            )
        )

    return list(
        grouped.values()
    )


def rank_decisions(
    decisions: list[DecisionRecommendation],
    limit: int = 5,
) -> list[DecisionRecommendation]:
    deduplicated = deduplicate_decisions(
        decisions
    )

    return sorted(
        deduplicated,
        key=lambda decision: (
            _priority_rank(
                decision.priority
            ),
            abs(
                decision.confidence
            ),
            len(
                decision.evidence
            ),
        ),
        reverse=True,
    )[:limit]


def generate_decision_summary(
    decisions: list[DecisionRecommendation],
) -> str:
    ranked = rank_decisions(
        decisions,
        limit=3,
    )

    if not ranked:
        return (
            "No actionable business decisions "
            "were generated from the available evidence."
        )

    parts: list[str] = []

    for decision in ranked:
        parts.append(
            (
                f"{decision.priority} priority: "
                f"{decision.title} "
                f"(confidence "
                f"{decision.confidence:.1f}%)."
            )
        )

    return " ".join(parts)