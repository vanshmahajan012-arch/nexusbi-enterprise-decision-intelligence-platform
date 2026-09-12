from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class BusinessInsight:
    insight_type: str
    title: str
    message: str
    severity: str
    metric: str | None = None
    value: float | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "insight_type": self.insight_type,
            "title": self.title,
            "message": self.message,
            "severity": self.severity,
            "metric": self.metric,
            "value": self.value,
        }


def analyze_revenue_by_region(
    rows: list[dict[str, Any]],
) -> list[BusinessInsight]:
    if not rows:
        return []

    insights: list[BusinessInsight] = []

    ranked = sorted(
        rows,
        key=lambda row: float(
            row.get("revenue", 0) or 0
        ),
        reverse=True,
    )

    leader = ranked[0]

    leader_revenue = float(
        leader.get("revenue", 0) or 0
    )

    leader_region = str(
        leader.get("region", "UNKNOWN")
    )

    insights.append(
        BusinessInsight(
            insight_type="REGION_DRIVER",
            title="Top Revenue Region",
            message=(
                f"{leader_region} is the highest-revenue "
                f"region with {leader_revenue:,.2f} "
                "in recorded revenue."
            ),
            severity="INFO",
            metric="revenue",
            value=leader_revenue,
        )
    )

    if len(ranked) > 1:
        second = ranked[1]

        second_revenue = float(
            second.get("revenue", 0) or 0
        )

        second_region = str(
            second.get("region", "UNKNOWN")
        )

        if leader_revenue > 0:
            lead_pct = (
                (leader_revenue - second_revenue)
                / leader_revenue
            ) * 100
        else:
            lead_pct = 0.0

        if lead_pct >= 25:
            severity = "MAJOR"
        elif lead_pct >= 10:
            severity = "MINOR"
        else:
            severity = "INFO"

        insights.append(
            BusinessInsight(
                insight_type="REGION_CONCENTRATION",
                title="Regional Revenue Concentration",
                message=(
                    f"{leader_region} leads {second_region} "
                    f"by {lead_pct:.1f}% based on revenue."
                ),
                severity=severity,
                metric="revenue_gap_pct",
                value=lead_pct,
            )
        )

    return insights


def analyze_revenue_by_product(
    rows: list[dict[str, Any]],
) -> list[BusinessInsight]:
    if not rows:
        return []

    insights: list[BusinessInsight] = []

    ranked = sorted(
        rows,
        key=lambda row: float(
            row.get("revenue", 0) or 0
        ),
        reverse=True,
    )

    leader = ranked[0]

    leader_product = str(
        leader.get("product", "UNKNOWN")
    )

    leader_revenue = float(
        leader.get("revenue", 0) or 0
    )

    total_revenue = sum(
        float(row.get("revenue", 0) or 0)
        for row in rows
    )

    contribution_pct = (
        (leader_revenue / total_revenue) * 100
        if total_revenue > 0
        else 0.0
    )

    insights.append(
        BusinessInsight(
            insight_type="PRODUCT_DRIVER",
            title="Top Revenue Product",
            message=(
                f"{leader_product} is the leading revenue "
                f"product with {leader_revenue:,.2f} "
                f"({contribution_pct:.1f}% of analyzed revenue)."
            ),
            severity="INFO",
            metric="revenue",
            value=leader_revenue,
        )
    )

    if contribution_pct >= 70:
        severity = "MAJOR"
    elif contribution_pct >= 50:
        severity = "MINOR"
    else:
        severity = "INFO"

    insights.append(
        BusinessInsight(
            insight_type="PRODUCT_CONCENTRATION",
            title="Product Revenue Concentration",
            message=(
                f"{leader_product} contributes "
                f"{contribution_pct:.1f}% of the analyzed "
                "revenue."
            ),
            severity=severity,
            metric="revenue_contribution_pct",
            value=contribution_pct,
        )
    )

    return insights


def analyze_revenue_trend(
    rows: list[dict[str, Any]],
) -> list[BusinessInsight]:
    if len(rows) < 2:
        return []

    ordered = sorted(
        rows,
        key=lambda row: str(
            row.get("date", "")
        ),
    )

    first_revenue = float(
        ordered[0].get("revenue", 0) or 0
    )

    latest_revenue = float(
        ordered[-1].get("revenue", 0) or 0
    )

    if first_revenue != 0:
        change_pct = (
            (latest_revenue - first_revenue)
            / abs(first_revenue)
        ) * 100
    else:
        change_pct = 0.0

    if change_pct >= 10:
        direction = "increased materially"
        severity = "POSITIVE"
    elif change_pct <= -10:
        direction = "declined materially"
        severity = "MAJOR"
    elif change_pct > 0:
        direction = "increased"
        severity = "INFO"
    elif change_pct < 0:
        direction = "declined"
        severity = "MINOR"
    else:
        direction = "remained stable"
        severity = "INFO"

    first_date = ordered[0].get("date")
    latest_date = ordered[-1].get("date")

    insights = [
        BusinessInsight(
            insight_type="REVENUE_TREND",
            title="Revenue Trend",
            message=(
                f"Revenue {direction} by "
                f"{abs(change_pct):.1f}% between "
                f"{first_date} and {latest_date}."
            ),
            severity=severity,
            metric="revenue_change_pct",
            value=change_pct,
        )
    ]

    return insights


def generate_business_analysis(
    *,
    revenue_by_region: list[dict[str, Any]],
    revenue_by_product: list[dict[str, Any]],
    revenue_trend: list[dict[str, Any]],
) -> list[BusinessInsight]:
    insights: list[BusinessInsight] = []

    insights.extend(
        analyze_revenue_by_region(
            revenue_by_region
        )
    )

    insights.extend(
        analyze_revenue_by_product(
            revenue_by_product
        )
    )

    insights.extend(
        analyze_revenue_trend(
            revenue_trend
        )
    )

    return insights