from backend.app.ingestion.file_ingestion import load_file
from backend.app.warehouse.business_mapper import (
    map_sales_records,
)


DATASET_PATH = "backend/test_sales.csv"


def main() -> None:
    records = load_file(DATASET_PATH)

    normalized = map_sales_records(records)

    print("NXUS BUSINESS MAPPER TEST")
    print("=========================")
    print(f"Input records      : {len(records)}")
    print(f"Normalized records : {len(normalized)}")
    print()

    for order in normalized[:3]:
        print("ORDER")
        print("-----")
        print(f"Order Code       : {order.order_code}")
        print(f"Order Timestamp  : {order.order_timestamp}")
        print(f"Customer         : {order.source_customer_key}")
        print(f"Region           : {order.region}")
        print(f"Product          : {order.product_name}")
        print(f"Revenue          : {order.revenue}")
        print(f"Quantity         : {order.quantity}")
        print(f"Currency         : {order.currency}")
        print(f"Status           : {order.order_status}")
        print(f"Platform         : {order.platform_code}")
        print()


if __name__ == "__main__":
    main()