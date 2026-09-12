from backend.app.db.postgres import fetch_one
from backend.app.ingestion.file_ingestion import load_file
from backend.app.ingestion.ingestion_run import (
    get_or_create_connector,
    get_or_create_data_source,
    start_ingestion_run,
    update_ingestion_run,
)
from backend.app.ingestion.raw_persistence import (
    persist_raw_records,
)


DATASET_PATH = "backend/test_sales.csv"


async def main() -> None:
    print("NXUS RAW DATA PERSISTENCE TEST")
    print("==============================")

    # ---------------------------------------------------------
    # 1. Load business dataset
    # ---------------------------------------------------------

    records = load_file(DATASET_PATH)

    print("Records loaded :", len(records))

    # ---------------------------------------------------------
    # 2. Get/create source
    # ---------------------------------------------------------

    source_id = await get_or_create_data_source(
        source_name="NXUS Test Business Files",
        source_type="FILE",
        auth_type="LOCAL_FILE",
        connection_metadata={
            "supported_extensions": [
                ".csv",
                ".xlsx",
                ".xls",
            ]
        },
    )

    # ---------------------------------------------------------
    # 3. Get/create connector
    # ---------------------------------------------------------

    connector_id = await get_or_create_connector(
        source_id=source_id,
        connector_name="Generic Business File Connector",
        sync_mode="BATCH_SNAPSHOT",
        config_payload={
            "dataset_type": "business",
            "mode": "manual_upload",
        },
    )

    # ---------------------------------------------------------
    # 4. Start ingestion run
    # ---------------------------------------------------------

    run_id = await start_ingestion_run(
        connector_id=connector_id,
        source_id=source_id,
        run_type="MANUAL_TRIGGER",
    )

    print("Run ID         :", run_id)

    # ---------------------------------------------------------
    # 5. Persist all raw business records
    # ---------------------------------------------------------

    persisted = await persist_raw_records(
        run_id=run_id,
        source_id=source_id,
        entity_topic="business.sales",
        records=records,
        timestamp_field="order_date",
        record_id_field="order_id",
        schema_version="1.0",
    )

    print("Raw persisted  :", persisted)

    # ---------------------------------------------------------
    # 6. Complete ingestion run
    # ---------------------------------------------------------

    await update_ingestion_run(
        run_id=run_id,
        status="COMPLETED",
        records_received=len(records),
        records_accepted=persisted,
        records_quarantined=0,
        records_rejected=0,
        bytes_processed=500,
    )

    # ---------------------------------------------------------
    # 7. Verify database
    # ---------------------------------------------------------

    verification = await fetch_one(
        """
        SELECT
            COUNT(*) AS record_count,
            MIN(source_record_id) AS first_record,
            MAX(source_record_id) AS last_record
        FROM raw.ingestion_events
        WHERE run_id = %s
        """,
        (run_id,),
    )

    print()
    print("DATABASE VERIFICATION")
    print("=====================")
    print("Record count :", verification[0])
    print("First record :", verification[1])
    print("Last record  :", verification[2])

    print()
    print(
        "NXUS raw persistence test complete."
    )


if __name__ == "__main__":
    import asyncio

    asyncio.run(main())