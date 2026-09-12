from pprint import pprint

from backend.app.ingestion.file_ingestion import (
    get_file_metadata,
    load_file,
)
from backend.app.ingestion.generic_data_quality import (
    calculate_data_quality,
)
from backend.app.ingestion.schema_profiler import (
    profile_records,
)


DATASET_PATH = "backend/test_sales.csv"


def main() -> None:
    print("NXUS BUSINESS DATA INGESTION PIPELINE")
    print("====================================")
    print()

    # ---------------------------------------------------------
    # 1. File metadata
    # ---------------------------------------------------------

    metadata = get_file_metadata(DATASET_PATH)

    print("FILE METADATA")
    print("-------------")
    pprint(metadata)
    print()

    # ---------------------------------------------------------
    # 2. Load dataset
    # ---------------------------------------------------------

    records = load_file(DATASET_PATH)

    print("INGESTION RESULT")
    print("----------------")
    print(f"Records loaded : {len(records)}")
    print()

    # ---------------------------------------------------------
    # 3. Schema profiling
    # ---------------------------------------------------------

    schema = profile_records(records)

    print("SCHEMA PROFILE")
    print("--------------")
    print(f"Rows    : {schema['row_count']}")
    print(f"Columns : {schema['column_count']}")
    print()

    for column in schema["columns"]:
        print(
            f"{column['name']:<15}"
            f"{column['inferred_type']:<12}"
            f"null={column['null_percent']:>6.2f}% "
            f"unique={column['unique_percent']:>6.2f}%"
        )

    print()

    # ---------------------------------------------------------
    # 4. Data quality
    # ---------------------------------------------------------

    quality = calculate_data_quality(records)

    print("DATA QUALITY")
    print("------------")
    print(
        f"Quality Score  : "
        f"{quality.quality_score}"
    )
    print(
        f"Duplicate Rows : "
        f"{quality.duplicate_rows}"
    )
    print(
        f"Missing Values : "
        f"{quality.missing_values}"
    )
    print()

    if quality.issues:
        print("QUALITY ISSUES")
        print("--------------")

        for issue in quality.issues:
            print(
                f"[{issue.severity}] "
                f"{issue.issue_type} | "
                f"column={issue.column} | "
                f"rows={issue.affected_rows}"
            )

            print(
                f"  {issue.message}"
            )
    else:
        print("No quality issues detected.")

    print()

    # ---------------------------------------------------------
    # 5. Preview
    # ---------------------------------------------------------

    print("FIRST 3 RECORDS")
    print("---------------")

    pprint(records[:3])


if __name__ == "__main__":
    main()