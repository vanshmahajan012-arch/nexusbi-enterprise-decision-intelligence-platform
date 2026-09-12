from __future__ import annotations

from datetime import date, datetime
from typing import Any
from uuid import UUID, uuid4

from psycopg import Connection

from backend.app.core.settings import settings
from backend.app.warehouse.business_mapper import NormalizedOrder


def _connection_kwargs() -> dict[str, Any]:
    return {
        "host": settings.supabase_db_host,
        "port": settings.supabase_db_port,
        "dbname": settings.supabase_db_name,
        "user": settings.supabase_db_user,
        "password": settings.supabase_db_password,
        "sslmode": "require",
    }


def _ensure_date(
    cursor,
    value: datetime,
) -> int:
    full_date: date = value.date()

    cursor.execute(
        """
        SELECT date_id
        FROM warehouse.dim_date
        WHERE full_date = %s
        LIMIT 1
        """,
        (full_date,),
    )

    row = cursor.fetchone()

    if row:
        return int(row[0])

    date_id = int(full_date.strftime("%Y%m%d"))

    cursor.execute(
        """
        INSERT INTO warehouse.dim_date (
            date_id,
            full_date,
            day_of_week,
            day_name,
            day_of_month,
            day_of_year,
            week_of_year,
            month_number,
            month_name,
            quarter,
            year,
            is_weekend
        )
        VALUES (
            %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s
        )
        ON CONFLICT (date_id) DO NOTHING
        RETURNING date_id
        """,
        (
            date_id,
            full_date,
            full_date.isoweekday(),
            full_date.strftime("%A"),
            full_date.day,
            full_date.timetuple().tm_yday,
            full_date.isocalendar().week,
            full_date.month,
            full_date.strftime("%B"),
            ((full_date.month - 1) // 3) + 1,
            full_date.year,
            full_date.weekday() >= 5,
        ),
    )

    row = cursor.fetchone()

    if row:
        return int(row[0])

    cursor.execute(
        """
        SELECT date_id
        FROM warehouse.dim_date
        WHERE full_date = %s
        LIMIT 1
        """,
        (full_date,),
    )

    row = cursor.fetchone()

    if not row:
        raise RuntimeError(
            f"Failed to create date dimension: {full_date}"
        )

    return int(row[0])


def _ensure_location(
    cursor,
    region: str,
) -> UUID:
    region_code = (
        str(region).strip().upper().replace(" ", "_")
        if region
        else "UNKNOWN"
    )

    cursor.execute(
        """
        SELECT location_id
        FROM warehouse.dim_location
        WHERE region_code = %s
        LIMIT 1
        """,
        (region_code,),
    )

    row = cursor.fetchone()

    if row:
        return UUID(str(row[0]))

    location_id = uuid4()

    cursor.execute(
        """
        INSERT INTO warehouse.dim_location (
            location_id,
            region_code,
            country_iso,
            timezone
        )
        VALUES (%s, %s, %s, %s)
        RETURNING location_id
        """,
        (
            location_id,
            region_code,
            "UNK",
            "UTC",
        ),
    )

    row = cursor.fetchone()

    if not row:
        raise RuntimeError(
            f"Failed to create location: {region_code}"
        )

    return UUID(str(row[0]))


def _ensure_platform(
    cursor,
    platform_code: str,
) -> UUID:
    code = (
        str(platform_code).strip().upper()
        if platform_code
        else "UNKNOWN"
    )

    cursor.execute(
        """
        SELECT platform_id
        FROM warehouse.dim_platform
        WHERE platform_code = %s
        LIMIT 1
        """,
        (code,),
    )

    row = cursor.fetchone()

    if row:
        return UUID(str(row[0]))

    platform_id = uuid4()

    cursor.execute(
        """
        INSERT INTO warehouse.dim_platform (
            platform_id,
            platform_code,
            device_category
        )
        VALUES (%s, %s, %s)
        RETURNING platform_id
        """,
        (
            platform_id,
            code,
            "UNKNOWN",
        ),
    )

    row = cursor.fetchone()

    if not row:
        raise RuntimeError(
            f"Failed to create platform: {code}"
        )

    return UUID(str(row[0]))


def _ensure_customer(
    cursor,
    order: NormalizedOrder,
) -> UUID:
    cursor.execute(
        """
        SELECT customer_id
        FROM warehouse.dim_customer
        WHERE source_customer_key = %s
        LIMIT 1
        """,
        (order.source_customer_key,),
    )

    row = cursor.fetchone()

    if row:
        return UUID(str(row[0]))

    customer_id = uuid4()

    cursor.execute(
        """
        INSERT INTO warehouse.dim_customer (
            customer_id,
            source_customer_key,
            company_name,
            customer_tier,
            account_status
        )
        VALUES (
            %s, %s, %s, %s, %s
        )
        RETURNING customer_id
        """,
        (
            customer_id,
            order.source_customer_key,
            order.source_customer_key,
            "UNKNOWN",
            "ACTIVE",
        ),
    )

    row = cursor.fetchone()

    if not row:
        raise RuntimeError(
            f"Failed to create customer: "
            f"{order.source_customer_key}"
        )

    return UUID(str(row[0]))


def _ensure_product(
    cursor,
    order: NormalizedOrder,
) -> UUID:
    sku = (
        order.sku
        or order.product_name.upper()
        .replace(" ", "_")
        .replace("/", "_")
    )

    cursor.execute(
        """
        SELECT product_id
        FROM warehouse.dim_product
        WHERE sku = %s
        LIMIT 1
        """,
        (sku,),
    )

    row = cursor.fetchone()

    if row:
        return UUID(str(row[0]))

    product_id = uuid4()

    cursor.execute(
        """
        INSERT INTO warehouse.dim_product (
            product_id,
            sku,
            product_name,
            category,
            pricing_tier,
            unit_cost_usd,
            list_price_usd
        )
        VALUES (
            %s, %s, %s, %s, %s, %s, %s
        )
        RETURNING product_id
        """,
        (
            product_id,
            sku,
            order.product_name,
            order.category,
            order.pricing_tier,
            order.unit_cost,
            order.unit_price,
        ),
    )

    row = cursor.fetchone()

    if not row:
        raise RuntimeError(
            f"Failed to create product: "
            f"{order.product_name}"
        )

    return UUID(str(row[0]))


def load_orders_sync(
    orders: list[NormalizedOrder],
) -> int:
    if not orders:
        return 0

    with Connection.connect(
        **_connection_kwargs()
    ) as connection:

        with connection.cursor() as cursor:
            loaded = 0

            try:
                for order in orders:
                    date_id = _ensure_date(
                        cursor,
                        order.order_timestamp,
                    )

                    customer_id = _ensure_customer(
                        cursor,
                        order,
                    )

                    location_id = _ensure_location(
                        cursor,
                        order.region,
                    )

                    platform_id = _ensure_platform(
                        cursor,
                        order.platform_code,
                    )

                    order_id = uuid4()

                    revenue = float(order.revenue)
                    quantity = int(order.quantity)

                    unit_cost = float(
                        order.unit_cost
                    )

                    cost_of_goods = (
                        unit_cost * quantity
                    )

                    cursor.execute(
                        """
                        INSERT INTO warehouse.fct_orders (
                            order_id,
                            date_id,
                            customer_id,
                            location_id,
                            platform_id,
                            order_code,
                            order_status,
                            currency,
                            gross_order_value_usd,
                            discount_amount_usd,
                            net_order_value_usd,
                            cost_of_goods_usd,
                            order_timestamp
                        )
                        VALUES (
                            %s, %s, %s, %s, %s,
                            %s, %s, %s, %s, %s,
                            %s, %s, %s
                        )
                        ON CONFLICT (order_code)
                        DO UPDATE SET
                            order_status =
                                EXCLUDED.order_status,
                            gross_order_value_usd =
                                EXCLUDED.gross_order_value_usd,
                            discount_amount_usd =
                                EXCLUDED.discount_amount_usd,
                            net_order_value_usd =
                                EXCLUDED.net_order_value_usd,
                            cost_of_goods_usd =
                                EXCLUDED.cost_of_goods_usd,
                            order_timestamp =
                                EXCLUDED.order_timestamp
                        RETURNING order_id
                        """,
                        (
                            order_id,
                            date_id,
                            customer_id,
                            location_id,
                            platform_id,
                            order.order_code,
                            order.order_status,
                            order.currency,
                            revenue,
                            0.0,
                            revenue,
                            cost_of_goods,
                            order.order_timestamp,
                        ),
                    )

                    row = cursor.fetchone()

                    if not row:
                        raise RuntimeError(
                            f"Failed to load order "
                            f"{order.order_code}"
                        )

                    persisted_order_id = UUID(
                        str(row[0])
                    )

                    product_id = _ensure_product(
                        cursor,
                        order,
                    )

                    unit_price = (
                        float(order.unit_price)
                        if order.unit_price > 0
                        else (
                            revenue / quantity
                            if quantity > 0
                            else 0.0
                        )
                    )

                    total_line_amount = (
                        unit_price * quantity
                    )

                    cursor.execute(
                        """
                        DELETE FROM warehouse.fct_order_items
                        WHERE order_id = %s
                        """,
                        (persisted_order_id,),
                    )

                    cursor.execute(
                        """
                        INSERT INTO warehouse.fct_order_items (
                            order_item_id,
                            order_id,
                            product_id,
                            quantity,
                            unit_price_usd,
                            unit_cost_usd,
                            total_line_amount_usd
                        )
                        VALUES (
                            %s, %s, %s, %s,
                            %s, %s, %s
                        )
                        """,
                        (
                            uuid4(),
                            persisted_order_id,
                            product_id,
                            quantity,
                            unit_price,
                            unit_cost,
                            total_line_amount,
                        ),
                    )

                    loaded += 1

                connection.commit()

                return loaded

            except Exception:
                connection.rollback()
                raise