from __future__ import annotations

from typing import Any

from backend.app.db.postgres import fetch_all


async def get_daily_revenue_series() -> list[dict[str, Any]]:
    rows = await fetch_all(
        """
        SELECT
            d.full_date,
            COALESCE(
                SUM(o.net_order_value_usd),
                0
            ) AS revenue
        FROM warehouse.fct_orders o
        JOIN warehouse.dim_date d
          ON d.date_id = o.date_id
        GROUP BY d.full_date
        ORDER BY d.full_date ASC
        """
    )

    return [
        {
            "date": (
                row[0].isoformat()
                if row[0] is not None
                else None
            ),
            "value": float(row[1] or 0),
        }
        for row in rows
    ]


async def get_daily_order_series() -> list[dict[str, Any]]:
    rows = await fetch_all(
        """
        SELECT
            d.full_date,
            COUNT(o.order_id) AS orders
        FROM warehouse.fct_orders o
        JOIN warehouse.dim_date d
          ON d.date_id = o.date_id
        GROUP BY d.full_date
        ORDER BY d.full_date ASC
        """
    )

    return [
        {
            "date": (
                row[0].isoformat()
                if row[0] is not None
                else None
            ),
            "value": float(row[1] or 0),
        }
        for row in rows
    ]


async def get_daily_units_series() -> list[dict[str, Any]]:
    rows = await fetch_all(
        """
        SELECT
            d.full_date,
            COALESCE(
                SUM(oi.quantity),
                0
            ) AS units
        FROM warehouse.fct_order_items oi
        JOIN warehouse.fct_orders o
          ON o.order_id = oi.order_id
        JOIN warehouse.dim_date d
          ON d.date_id = o.date_id
        GROUP BY d.full_date
        ORDER BY d.full_date ASC
        """
    )

    return [
        {
            "date": (
                row[0].isoformat()
                if row[0] is not None
                else None
            ),
            "value": float(row[1] or 0),
        }
        for row in rows
    ]


async def get_daily_aov_series() -> list[dict[str, Any]]:
    rows = await fetch_all(
        """
        SELECT
            d.full_date,
            COALESCE(
                SUM(o.net_order_value_usd),
                0
            ) AS revenue,
            COUNT(o.order_id) AS orders
        FROM warehouse.fct_orders o
        JOIN warehouse.dim_date d
          ON d.date_id = o.date_id
        GROUP BY d.full_date
        ORDER BY d.full_date ASC
        """
    )

    result: list[dict[str, Any]] = []

    for row in rows:
        revenue = float(row[1] or 0)
        orders = int(row[2] or 0)

        aov = (
            revenue / orders
            if orders > 0
            else 0.0
        )

        result.append(
            {
                "date": (
                    row[0].isoformat()
                    if row[0] is not None
                    else None
                ),
                "value": aov,
            }
        )

    return result


async def get_daily_forecast_series() -> dict[str, Any]:
    revenue = await get_daily_revenue_series()
    orders = await get_daily_order_series()
    units = await get_daily_units_series()
    aov = await get_daily_aov_series()

    return {
        "revenue": revenue,
        "orders": orders,
        "units": units,
        "aov": aov,
    }