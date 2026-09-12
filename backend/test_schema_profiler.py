from backend.app.ingestion.schema_profiler import (
    profile_records,
)


def main() -> None:
    records = [
        {
            "customer_id": "C001",
            "order_date": "2026-08-01",
            "region": "North",
            "revenue": "12500.50",
            "quantity": 4,
        },
        {
            "customer_id": "C002",
            "order_date": "2026-08-02",
            "region": "South",
            "revenue": "8400.00",
            "quantity": 2,
        },
        {
            "customer_id": "C003",
            "order_date": "2026-08-03",
            "region": "North",
            "revenue": "15900.75",
            "quantity": 6,
        },
        {
            "customer_id": "C004",
            "order_date": "2026-08-04",
            "region": "West",
            "revenue": None,
            "quantity": 3,
        },
        {
            "customer_id": "C005",
            "order_date": "2026-08-05",
            "region": "South",
            "revenue": "7200.25",
            "quantity": 1,
        },
    ]

    result = profile_records(records)

    print("NXUS Schema Profile")
    print("===================")
    print(f"Rows    : {result['row_count']}")
    print(f"Columns : {result['column_count']}")
    print()

    for column in result["columns"]:
        print(f"Column           : {column['name']}")
        print(f"Inferred Type    : {column['inferred_type']}")
        print(f"Null %           : {column['null_percent']}")
        print(f"Unique %         : {column['unique_percent']}")
        print(f"Min              : {column['min_value']}")
        print(f"Max              : {column['max_value']}")
        print(f"Sample Values    : {column['sample_values']}")
        print("-" * 50)


if __name__ == "__main__":
    main()