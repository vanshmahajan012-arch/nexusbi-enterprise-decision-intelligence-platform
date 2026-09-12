from __future__ import annotations

from datetime import date

from backend.app.db.postgres import fetch_one


async def get_dataset_period_bounds() -> tuple[date, date] | None:
    row = await fetch_one(
        """
        SELECT
            MIN(d.full_date),
            MAX(d.full_date)
        FROM warehouse.fct_orders o
        JOIN warehouse.dim_date d
          ON d.date_id = o.date_id
        """
    )

    if not row or row[0] is None or row[1] is None:
        return None

    return row[0], row[1]


async def get_period_metrics(
    start_date: date,
    end_date: date,
) -> dict[str, float]:
    row = await fetch_one(
        """
        SELECT
            COALESCE(
                SUM(o.net_order_value_usd),
                0
            ) AS revenue,

            COUNT(o.order_id) AS orders,

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
        """,
        (
            start_date,
            end_date,
        ),
    )

    if not row:
        return {
            "revenue": 0.0,
            "orders": 0.0,
            "units": 0.0,
            "aov": 0.0,
        }

    revenue = float(row[0] or 0)
    orders = float(row[1] or 0)
    units = float(row[2] or 0)

    aov = (
        revenue / orders
        if orders > 0
        else 0.0
    )

    return {
        "revenue": revenue,
        "orders": orders,
        "units": units,
        "aov": aov,
    }


async def get_current_vs_previous_metrics() -> dict:
    bounds = await get_dataset_period_bounds()

    if bounds is None:
        return {
            "current": {
                "revenue": 0.0,
                "orders": 0.0,
                "units": 0.0,
                "aov": 0.0,
            },
            "previous": {
                "revenue": 0.0,
                "orders": 0.0,
                "units": 0.0,
                "aov": 0.0,
            },
            "periods": {
                "current_start": None,
                "current_end": None,
                "previous_start": None,
                "previous_end": None,
            },
        }

    min_date, max_date = bounds

    total_days = (
        max_date - min_date
    ).days + 1

    # Split the available dataset window into
    # previous period and current period.
    current_days = max(
        1,
        total_days // 2,
    )

    current_start = max_date.fromordinal(
        max_date.toordinal()
        - current_days
        + 1
    )

    previous_end = current_start.fromordinal(
        current_start.toordinal() - 1
    )

    previous_start = previous_end.fromordinal(
        previous_end.toordinal()
        - current_days
        + 1
    )

    current = await get_period_metrics(
        current_start,
        max_date,
    )

    previous = await get_period_metrics(
        previous_start,
        previous_end,
    )

    periods = {
        "current_start": current_start.isoformat(),
        "current_end": max_date.isoformat(),
        "previous_start": previous_start.isoformat(),
        "previous_end": previous_end.isoformat(),
    }

    return {
        "current": current,
        "previous": previous,
        "periods": periods,
    }