from backend.app.ingestion.ingestion_run import (
    get_or_create_connector,
    get_or_create_data_source,
    start_ingestion_run,
    update_ingestion_run,
)


async def main() -> None:
    print("NXUS INGESTION RUN TEST")
    print("=======================")

    # ---------------------------------------------------------
    # 1. Register generic company-file data source
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

    print("Source ID     :", source_id)

    # ---------------------------------------------------------
    # 2. Register batch connector
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

    print("Connector ID  :", connector_id)

    # ---------------------------------------------------------
    # 3. Start ingestion run
    # ---------------------------------------------------------

    run_id = await start_ingestion_run(
        connector_id=connector_id,
        source_id=source_id,
        run_type="MANUAL_TRIGGER",
    )

    print("Run ID        :", run_id)

    # ---------------------------------------------------------
    # 4. Simulate successful processing
    # ---------------------------------------------------------

    await update_ingestion_run(
        run_id=run_id,
        status="COMPLETED",
        records_received=10,
        records_accepted=9,
        records_rejected=0,
        records_quarantined=1,
        bytes_processed=500,
    )

    print("Run Status    : COMPLETED")
    print("Records       : 10 received / 9 accepted / 1 quarantined")
    print("Bytes         : 500")
    print()
    print("NXUS ingestion lifecycle test complete.")


if __name__ == "__main__":
    import asyncio

    asyncio.run(main())
    