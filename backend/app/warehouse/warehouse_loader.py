from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any
from uuid import UUID, uuid4

from backend.app.db.postgres import fetch_one
from backend.app.warehouse.business_mapper import NormalizedOrder


async def get_or_create_date(
    value: datetime,
) -> int:
    full_date: date = value.date()

    row = await fetch_one(
        """
        SELECT date_id
        FROM warehouse.dim_date
        WHERE full_date = %s
        LIMIT 1
        """,
        (full_date,),
    )

    if row:
        return int(row[0])

    date_id = int(
        full_date.strftime("%Y%m%d")
    )

    row = await fetch_one(
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
            %s,
            %s,
            %s,
            %s,
            %s,
            %s,
            %s,
            %s,
            %s,
            %s,
            %s,
            %s
        )
        ON CONFLICT (date_id)
        DO UPDATE SET full_date = EXCLUDED.full_date
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

    if not row:
        raise RuntimeError(
            "Failed to create date dimension record"
        )

    return int(row[0])


async def get_or_create_location(
    region: str,
) -> UUID:
    region_code = (
        str(region).strip().upper().replace(" ", "_")
        if region
        else "UNKNOWN"
    )

    row = await fetch_one(
        """
        SELECT location_id
        FROM warehouse.dim_location
        WHERE region_code = %s
        LIMIT 1
        """,
        (region_code,),
    )

    if row:
        return UUID(str(row[0]))

    location_id = uuid4()

    row = await fetch_one(
        """
        INSERT INTO warehouse.dim_location (
            location_id,
            region_code,
            country_iso,
            timezone
        )
        VALUES (
            %s,
            %s,
            %s,
            %s
        )
        RETURNING location_id
        """,
        (
            location_id,
            region_code,
            "UNK",
            "UTC",
        ),
    )

    if not row:
        raise RuntimeError(
            "Failed to create location dimension record"
        )

    return UUID(str(row[0]))


async def get_or_create_platform(
    platform_code: str,
) -> UUID:
    code = (
        str(platform_code).strip().upper()
        if platform_code
        else "UNKNOWN"
    )

    row = await fetch_one(
        """
        SELECT platform_id
        FROM warehouse.dim_platform
        WHERE platform_code = %s
        LIMIT 1
        """,
        (code,),
    )

    if row:
        return UUID(str(row[0]))

    platform_id = uuid4()

    row = await fetch_one(
        """
        INSERT INTO warehouse.dim_platform (
            platform_id,
            platform_code,
            device_category,
            operating_system
        )
        VALUES (
            %s,
            %s,
            %s,
            %s
        )
        RETURNING platform_id
        """,
        (
            platform_id,
            code,
            "UNKNOWN",
            None,
        ),
    )

    if not row:
        raise RuntimeError(
            "Failed to create platform dimension record"
        )

    return UUID(str(row[0]))


async def get_or_create_customer(
    order: NormalizedOrder,
) -> UUID:
    row = await fetch_one(
        """
        SELECT customer_id
        FROM warehouse.dim_customer
        WHERE source_customer_key = %s
        LIMIT 1
        """,
        (order.source_customer_key,),
    )

    if row:
        return UUID(str(row[0]))

    customer_id = uuid4()

    row = await fetch_one(
        """
        INSERT INTO warehouse.dim_customer (
            customer_id,
            source_customer_key,
            company_name,
            customer_tier,
            account_status
        )
        VALUES (
            %s,
            %s,
            %s,
            %s,
            %s
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

    if not row:
        raise RuntimeError(
            "Failed to create customer dimension record"
        )

    return UUID(str(row[0]))


async def get_or_create_product(
    order: NormalizedOrder,
) -> UUID:
    sku = (
        order.sku
        or order.product_name.upper()
          .replace(" ", "_")
          .replace("/", "_")
    )

    row = await fetch_one(
        """
        SELECT product_id
        FROM warehouse.dim_product
        WHERE sku = %s
        LIMIT 1
        """,
        (sku,),
    )

    if row:
        return UUID(str(row[0]))

    product_id = uuid4()

    row = await fetch_one(
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
            %s,
            %s,
            %s,
            %s,
            %s,
            %s,
            %s
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

    if not row:
        raise RuntimeError(
            "Failed to create product dimension record"
        )

    return UUID(str(row[0]))


async def insert_order(
    *,
    order: NormalizedOrder,
    raw_id: str | None = None,
) -> UUID:
    date_id = await get_or_create_date(
        order.order_timestamp
    )

    customer_id = await get_or_create_customer(
        order
    )

    location_id = await get_or_create_location(
        order.region
    )

    platform_id = await get_or_create_platform(
        order.platform_code
    )

    order_id = uuid4()

    gross_value = order.revenue
    discount = 0.0
    net_value = order.revenue
    cost_of_goods = (
        order.unit_cost * order.quantity
    )

    row = await fetch_one(
        """
        INSERT INTO warehouse.fct_orders (
            order_id,
            raw_id,
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
            %s,
            %s,
            %s,
            %s,
            %s,
            %s,
            %s,
            %s,
            %s,
            %s,
            %s,
            %s,
            %s,
            %s
        )
        ON CONFLICT (order_code)
        DO UPDATE SET
            order_status = EXCLUDED.order_status,
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
            UUID(str(raw_id))
            if raw_id
            else None,
            date_id,
            customer_id,
            location_id,
            platform_id,
            order.order_code,
            order.order_status,
            order.currency,
            gross_value,
            discount,
            net_value,
            cost_of_goods,
            order.order_timestamp,
        ),
    )

    if not row:
        raise RuntimeError(
            f"Failed to load order {order.order_code}"
        )

    return UUID(str(row[0]))


async def insert_order_item(
    *,
    order: NormalizedOrder,
    order_id: UUID,
) -> UUID:
    product_id = await get_or_create_product(
        order
    )

    order_item_id = uuid4()

    unit_price = (
        order.unit_price
        if order.unit_price > 0
        else (
            order.revenue / order.quantity
            if order.quantity > 0
            else 0.0
        )
    )

    total_line_amount = (
        unit_price * order.quantity
    )

    row = await fetch_one(
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
            %s,
            %s,
            %s,
            %s,
            %s,
            %s,
            %s
        )
        RETURNING order_item_id
        """,
        (
            order_item_id,
            order_id,
            product_id,
            order.quantity,
            unit_price,
            order.unit_cost,
            total_line_amount,
        ),
    )

    if not row:
        raise RuntimeError(
            f"Failed to load item for {order.order_code}"
        )

    return UUID(str(row[0]))


async def load_orders(
    *,
    orders: list[NormalizedOrder],
    raw_id_by_order_code: dict[str, str]
    | None = None,
) -> int:
    raw_map = raw_id_by_order_code or {}

    loaded = 0

    for order in orders:
        raw_id = raw_map.get(
            order.order_code
        )

        order_id = await insert_order(
            order=order,
            raw_id=raw_id,
        )

        await insert_order_item(
            order=order,
            order_id=order_id,
        )

        loaded += 1

    return loaded