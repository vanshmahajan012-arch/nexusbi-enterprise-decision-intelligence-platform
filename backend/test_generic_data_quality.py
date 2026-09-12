from backend.app.ingestion.generic_data_quality import (
    calculate_data_quality,
)


def main() -> None:
    records = [
        {
            "customer_id": "C001",
            "region": "North",
            "revenue": "12500.50",
            "quantity": 4,
        },
        {
            "customer_id": "C002",
            "region": "South",
            "revenue": "8400.00",
            "quantity": 2,
        },
        {
            "customer_id": "C003",
            "region": "North",
            "revenue": None,
            "quantity": 6,
        },
        {
            "customer_id": "C004",
            "region": "West",
            "revenue": "15900.75",
            "quantity": 3,
        },
        {
            "customer_id": "C004",
            "region": "West",
            "revenue": "15900.75",
            "quantity": 3,
        },
        {
            "customer_id": "C005",
            "region": "South",
            "revenue": "not_available",
            "quantity": 1,
        },
    ]

    report = calculate_data_quality(records)

    print("NXUS Data Quality Report")
    print("========================")
    print(f"Rows            : {report.row_count}")
    print(f"Columns         : {report.column_count}")
    print(f"Duplicate Rows  : {report.duplicate_rows}")
    print(f"Missing Values  : {report.missing_values}")
    print(f"Quality Score   : {report.quality_score}")
    print()

    print("Issues")
    print("------")

    if not report.issues:
        print("No issues detected.")
    else:
        for issue in report.issues:
            print(
                f"[{issue.severity}] "
                f"{issue.issue_type} | "
                f"column={issue.column} | "
                f"rows={issue.affected_rows}"
            )
            print(f"  {issue.message}")


if __name__ == "__main__":
    main()