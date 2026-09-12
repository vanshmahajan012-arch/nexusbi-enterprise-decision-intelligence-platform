from __future__ import annotations

from backend.app.db.postgres import fetch_one


async def get_overall_kpi_row() -> tuple:
    row = await fetch_one(
        """
        SELECT
            COALESCE(
                SUM(net_order_value_usd),
                0
            ) AS total_revenue,

            COUNT(*) AS total_orders

        FROM warehouse.fct_orders
        """
    )

    if not row:
        return (0.0, 0, 0)

    return (
        float(row[0] or 0),
        int(row[1] or 0),
        0,
    )


async def get_total_units() -> int:
    row = await fetch_one(
        """
        SELECT
            COALESCE(
                SUM(quantity),
                0
            )
        FROM warehouse.fct_order_items
        """
    )

    if not row:
        return 0

    return int(row[0] or 0)


async def get_business_kpis() -> list:
    from backend.app.analytics.kpi_engine import (
        calculate_kpis,
    )

    revenue, orders, _ = (
        await get_overall_kpi_row()
    )

    units = await get_total_units()

    return calculate_kpis(
        total_revenue=revenue,
        total_orders=orders,
        total_units=units,
    )