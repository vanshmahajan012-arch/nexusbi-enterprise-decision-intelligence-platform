from __future__ import annotations

from datetime import date
from typing import Any

from backend.app.db.postgres import fetch_all


async def get_recent_metric_context(
    *,
    start_date: date,
    end_date: date,
) -> list[dict[str, Any]]:
    rows = await fetch_all(
        """
        SELECT
            d.full_date,
            COALESCE(
                SUM(o.net_order_value_usd),
                0
            ) AS revenue,
            COUNT(DISTINCT o.order_id) AS orders,
            COALESCE(
                SUM(oi.quantity),
                0
            ) AS units
        FROM warehouse.fct_orders o
        JOIN warehouse.fct_order_items oi
          ON oi.order_id = o.order_id
        JOIN warehouse.dim_date d
          ON d.date_id = o.date_id
        WHERE d.full_date
              BETWEEN %s AND %s
        GROUP BY d.full_date
        ORDER BY d.full_date ASC
        """,
        (
            start_date,
            end_date,
        ),
    )

    return [
        {
            "date": (
                row[0].isoformat()
                if row[0] is not None
                else None
            ),
            "revenue": float(row[1] or 0),
            "orders": int(row[2] or 0),
            "units": int(row[3] or 0),
        }
        for row in rows
    ]


async def get_revenue_drivers(
    *,
    start_date: date,
    end_date: date,
) -> dict[str, list[dict[str, Any]]]:
    region_rows = await fetch_all(
        """
        SELECT
            l.region_code,
            COALESCE(
                SUM(o.net_order_value_usd),
                0
            ) AS revenue,
            COUNT(DISTINCT o.order_id) AS orders,
            COALESCE(
                SUM(oi.quantity),
                0
            ) AS units
        FROM warehouse.fct_orders o
        JOIN warehouse.fct_order_items oi
          ON oi.order_id = o.order_id
        JOIN warehouse.dim_location l
          ON l.location_id = o.location_id
        WHERE o.order_timestamp::date
              BETWEEN %s AND %s
        GROUP BY l.region_code
        ORDER BY revenue DESC
        """,
        (
            start_date,
            end_date,
        ),
    )

    product_rows = await fetch_all(
        """
        SELECT
            p.product_name,
            COALESCE(
                SUM(oi.total_line_amount_usd),
                0
            ) AS revenue,
            COALESCE(
                SUM(oi.quantity),
                0
            ) AS units
        FROM warehouse.fct_order_items oi
        JOIN warehouse.fct_orders o
          ON o.order_id = oi.order_id
        JOIN warehouse.dim_product p
          ON p.product_id = oi.product_id
        WHERE o.order_timestamp::date
              BETWEEN %s AND %s
        GROUP BY p.product_name
        ORDER BY revenue DESC
        """,
        (
            start_date,
            end_date,
        ),
    )

    regions = [
        {
            "region": row[0],
            "revenue": float(row[1] or 0),
            "orders": int(row[2] or 0),
            "units": int(row[3] or 0),
        }
        for row in region_rows
    ]

    products = [
        {
            "product": row[0],
            "revenue": float(row[1] or 0),
            "units": int(row[2] or 0),
        }
        for row in product_rows
    ]

    return {
        "regions": regions,
        "products": products,
    }


async def get_top_revenue_contributors(
    *,
    start_date: date,
    end_date: date,
    limit: int = 5,
) -> list[dict[str, Any]]:
    rows = await fetch_all(
        """
        SELECT
            p.product_name,
            COALESCE(
                SUM(oi.total_line_amount_usd),
                0
            ) AS revenue
        FROM warehouse.fct_order_items oi
        JOIN warehouse.fct_orders o
          ON o.order_id = oi.order_id
        JOIN warehouse.dim_product p
          ON p.product_id = oi.product_id
        WHERE o.order_timestamp::date
              BETWEEN %s AND %s
        GROUP BY p.product_name
        ORDER BY revenue DESC
        LIMIT %s
        """,
        (
            start_date,
            end_date,
            limit,
        ),
    )

    return [
        {
            "product": row[0],
            "revenue": float(row[1] or 0),
        }
        for row in rows
    ]
    