from __future__ import annotations

from datetime import date

from backend.app.db.postgres import fetch_all


async def get_dimension_revenue(
    *,
    start_date: date,
    end_date: date,
    dimension: str,
) -> list[dict]:
    if dimension == "region":
        rows = await fetch_all(
            """
            SELECT
                l.region_code,
                COALESCE(
                    SUM(o.net_order_value_usd),
                    0
                ) AS revenue
            FROM warehouse.fct_orders o
            JOIN warehouse.dim_location l
              ON l.location_id = o.location_id
            JOIN warehouse.dim_date d
              ON d.date_id = o.date_id
            WHERE d.full_date
                  BETWEEN %s AND %s
            GROUP BY l.region_code
            ORDER BY revenue DESC
            """,
            (
                start_date,
                end_date,
            ),
        )

        return [
            {
                "region": row[0],
                "revenue": float(row[1] or 0),
            }
            for row in rows
        ]

    if dimension == "product":
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
            JOIN warehouse.dim_date d
              ON d.date_id = o.date_id
            WHERE d.full_date
                  BETWEEN %s AND %s
            GROUP BY p.product_name
            ORDER BY revenue DESC
            """,
            (
                start_date,
                end_date,
            ),
        )

        return [
            {
                "product": row[0],
                "revenue": float(row[1] or 0),
            }
            for row in rows
        ]

    raise ValueError(
        f"Unsupported dimension: {dimension}"
    )


async def get_region_revenue_comparison(
    *,
    current_start: date,
    current_end: date,
    previous_start: date,
    previous_end: date,
) -> dict:
    current = await get_dimension_revenue(
        start_date=current_start,
        end_date=current_end,
        dimension="region",
    )

    previous = await get_dimension_revenue(
        start_date=previous_start,
        end_date=previous_end,
        dimension="region",
    )

    return {
        "current": current,
        "previous": previous,
    }


async def get_product_revenue_comparison(
    *,
    current_start: date,
    current_end: date,
    previous_start: date,
    previous_end: date,
) -> dict:
    current = await get_dimension_revenue(
        start_date=current_start,
        end_date=current_end,
        dimension="product",
    )

    previous = await get_dimension_revenue(
        start_date=previous_start,
        end_date=previous_end,
        dimension="product",
    )

    return {
        "current": current,
        "previous": previous,
    }