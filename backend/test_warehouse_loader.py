import asyncio

from backend.app.db.postgres import fetch_one
from backend.app.ingestion.file_ingestion import load_file
from backend.app.warehouse.business_mapper import (
    map_sales_records,
)
from backend.app.warehouse.warehouse_batch_loader import (
    load_orders_sync,
)


DATASET_PATH = "backend/test_sales.csv"


async def main() -> None:
    print("NXUS WAREHOUSE BATCH LOAD TEST")
    print("==============================")

    # ---------------------------------------------------------
    # 1. Load source dataset
    # ---------------------------------------------------------

    records = load_file(DATASET_PATH)

    print("Source records :", len(records))

    # ---------------------------------------------------------
    # 2. Normalize business records
    # ---------------------------------------------------------

    orders = map_sales_records(records)

    print("Mapped orders  :", len(orders))

    # ---------------------------------------------------------
    # 3. Load warehouse using one DB transaction
    # ---------------------------------------------------------

    loaded = load_orders_sync(
        orders=orders,
    )

    print("Orders loaded  :", loaded)

    # ---------------------------------------------------------
    # 4. Verify warehouse
    # ---------------------------------------------------------

    order_count = await fetch_one(
        """
        SELECT COUNT(*)
        FROM warehouse.fct_orders
        WHERE order_code LIKE %s
        """,
        ("ORD%",),
    )

    item_count = await fetch_one(
        """
        SELECT COUNT(*)
        FROM warehouse.fct_order_items oi
        JOIN warehouse.fct_orders o
          ON o.order_id = oi.order_id
        WHERE o.order_code LIKE %s
        """,
        ("ORD%",),
    )

    customer_count = await fetch_one(
        """
        SELECT COUNT(*)
        FROM warehouse.dim_customer
        WHERE source_customer_key LIKE %s
        """,
        ("C%",),
    )

    product_count = await fetch_one(
        """
        SELECT COUNT(*)
        FROM warehouse.dim_product
        WHERE sku IN (%s, %s, %s, %s)
        """,
        (
            "LAPTOP",
            "MONITOR",
            "KEYBOARD",
            "MOUSE",
        ),
    )

    print()
    print("WAREHOUSE VERIFICATION")
    print("======================")
    print("Orders   :", order_count[0])
    print("Items    :", item_count[0])
    print("Customers:", customer_count[0])
    print("Products :", product_count[0])

    # ---------------------------------------------------------
    # 5. Sample analytical row
    # ---------------------------------------------------------

    sample = await fetch_one(
        """
        SELECT
            order_code,
            order_status,
            currency,
            net_order_value_usd,
            gross_margin_usd,
            order_timestamp
        FROM warehouse.fct_orders
        WHERE order_code = %s
        LIMIT 1
        """,
        ("ORD001",),
    )

    print()
    print("SAMPLE ORDER")
    print("============")

    if sample:
        print("Order Code      :", sample[0])
        print("Status          :", sample[1])
        print("Currency        :", sample[2])
        print("Net Value       :", sample[3])
        print("Gross Margin    :", sample[4])
        print("Order Timestamp :", sample[5])
    else:
        print("ORD001 not found.")

    print()
    print("NXUS warehouse batch load test complete.")


if __name__ == "__main__":
    asyncio.run(main())