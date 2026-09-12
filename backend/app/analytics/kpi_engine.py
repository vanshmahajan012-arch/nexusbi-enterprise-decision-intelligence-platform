from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class KpiResult:
    key: str
    name: str
    value: float
    unit: str
    description: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "key": self.key,
            "name": self.name,
            "value": self.value,
            "unit": self.unit,
            "description": self.description,
        }


def _safe_divide(
    numerator: float,
    denominator: float,
) -> float:
    if denominator == 0:
        return 0.0

    return numerator / denominator


def calculate_kpis(
    *,
    total_revenue: float,
    total_orders: int,
    total_units: int,
) -> list[KpiResult]:
    average_order_value = _safe_divide(
        total_revenue,
        float(total_orders),
    )

    return [
        KpiResult(
            key="total_revenue",
            name="Total Revenue",
            value=round(total_revenue, 2),
            unit="CURRENCY",
            description=(
                "Total net order value generated "
                "by the business."
            ),
        ),
        KpiResult(
            key="total_orders",
            name="Total Orders",
            value=float(total_orders),
            unit="COUNT",
            description=(
                "Total number of orders recorded "
                "in the selected dataset."
            ),
        ),
        KpiResult(
            key="total_units",
            name="Units Sold",
            value=float(total_units),
            unit="COUNT",
            description=(
                "Total quantity of products sold "
                "across all orders."
            ),
        ),
        KpiResult(
            key="average_order_value",
            name="Average Order Value",
            value=round(
                average_order_value,
                2,
            ),
            unit="CURRENCY",
            description=(
                "Average revenue generated per order."
            ),
        ),
    ]


def summarize_kpis(
    rows: list[tuple[Any, ...]],
) -> list[KpiResult]:
    """
    Expected row format:

        (
            total_revenue,
            total_orders,
            total_units,
        )
    """

    if not rows:
        return calculate_kpis(
            total_revenue=0.0,
            total_orders=0,
            total_units=0,
        )

    total_revenue = float(
        rows[0][0] or 0
    )

    total_orders = int(
        rows[0][1] or 0
    )

    total_units = int(
        rows[0][2] or 0
    )

    return calculate_kpis(
        total_revenue=total_revenue,
        total_orders=total_orders,
        total_units=total_units,
    )