from __future__ import annotations

from backend.app.db.postgres import fetch_all


async def get_revenue_by_region() -> list[dict]:
    rows = await fetch_all(
        """
        SELECT
            l.region_code,
            COALESCE(
                SUM(o.net_order_value_usd),
                0
            ) AS revenue,
            COUNT(o.order_id) AS order_count
        FROM warehouse.fct_orders o
        JOIN warehouse.dim_location l
          ON l.location_id = o.location_id
        GROUP BY l.region_code
        ORDER BY revenue DESC
        """
    )

    return [
        {
            "region": row[0],
            "revenue": float(row[1] or 0),
            "order_count": int(row[2] or 0),
        }
        for row in rows
    ]


async def get_revenue_by_product() -> list[dict]:
    rows = await fetch_all(
        """
        SELECT
            p.product_name,
            p.category,
            COALESCE(
                SUM(oi.total_line_amount_usd),
                0
            ) AS revenue,
            COALESCE(
                SUM(oi.quantity),
                0
            ) AS units_sold
        FROM warehouse.fct_order_items oi
        JOIN warehouse.fct_orders o
          ON o.order_id = oi.order_id
        JOIN warehouse.dim_product p
          ON p.product_id = oi.product_id
        GROUP BY
            p.product_name,
            p.category
        ORDER BY revenue DESC
        """
    )

    return [
        {
            "product": row[0],
            "category": row[1],
            "revenue": float(row[2] or 0),
            "units_sold": int(row[3] or 0),
        }
        for row in rows
    ]


async def get_revenue_trend() -> list[dict]:
    rows = await fetch_all(
        """
        SELECT
            d.full_date,
            COALESCE(
                SUM(o.net_order_value_usd),
                0
            ) AS revenue,
            COUNT(o.order_id) AS order_count
        FROM warehouse.fct_orders o
        JOIN warehouse.dim_date d
          ON d.date_id = o.date_id
        GROUP BY d.full_date
        ORDER BY d.full_date ASC
        """
    )

    return [
        {
            "date": row[0].isoformat()
            if row[0] is not None
            else None,
            "revenue": float(row[1] or 0),
            "order_count": int(row[2] or 0),
        }
        for row in rows
    ]


async def get_region_product_performance() -> list[dict]:
    rows = await fetch_all(
        """
        SELECT
            l.region_code,
            p.product_name,
            COALESCE(
                SUM(oi.total_line_amount_usd),
                0
            ) AS revenue,
            COALESCE(
                SUM(oi.quantity),
                0
            ) AS units_sold
        FROM warehouse.fct_order_items oi
        JOIN warehouse.fct_orders o
          ON o.order_id = oi.order_id
        JOIN warehouse.dim_location l
          ON l.location_id = o.location_id
        JOIN warehouse.dim_product p
          ON p.product_id = oi.product_id
        GROUP BY
            l.region_code,
            p.product_name
        ORDER BY revenue DESC
        """
    )

    return [
        {
            "region": row[0],
            "product": row[1],
            "revenue": float(row[2] or 0),
            "units_sold": int(row[3] or 0),
        }
        for row in rows
    ]