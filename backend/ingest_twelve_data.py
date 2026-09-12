import asyncio
import json
from datetime import datetime

from psycopg import AsyncConnection

from backend.app.connectors.twelve_data import TwelveDataConnector
from backend.app.core.settings import settings
from backend.app.ingestion.twelve_data_ingestion import build_raw_event


async def main() -> None:
    connection = await AsyncConnection.connect(
        host=settings.supabase_db_host,
        port=settings.supabase_db_port,
        dbname=settings.supabase_db_name,
        user=settings.supabase_db_user,
        password=settings.supabase_db_password,
        sslmode="require",
    )

    connector = TwelveDataConnector()

    try:
        async with connection.cursor() as cursor:
            await cursor.execute(
                """
                SELECT source_id
                FROM system.data_sources
                WHERE source_name = %s
                """,
                ("Twelve Data",),
            )
            source_row = await cursor.fetchone()

            if not source_row:
                raise RuntimeError("Twelve Data source not found")

            source_id = source_row[0]

            await cursor.execute(
                """
                SELECT connector_id
                FROM system.connectors
                WHERE connector_name = %s
                """,
                ("twelve-data-market-connector",),
            )
            connector_row = await cursor.fetchone()

            if not connector_row:
                raise RuntimeError("Twelve Data connector not found")

            connector_id = connector_row[0]

            await cursor.execute(
                """
                INSERT INTO system.ingestion_runs
                    (connector_id, source_id, run_type, status)
                VALUES
                    (%s, %s, %s, %s)
                RETURNING run_id
                """,
                (
                    connector_id,
                    source_id,
                    "MANUAL_TRIGGER",
                    "RUNNING",
                ),
            )
            run_id = (await cursor.fetchone())[0]

        response = await connector.test_connection()

        if response.get("status") == "error":
            raise RuntimeError(
                response.get("message", "Twelve Data returned an API error")
            )

        values = response.get("values", [])
        if not values:
            raise RuntimeError("Twelve Data returned no observations")

        meta = response.get("meta", {})
        symbol = meta.get("symbol", "UNKNOWN")
        observation = values[0]

        source_timestamp = datetime.strptime(
            observation["datetime"],
            "%Y-%m-%d %H:%M:%S",
        )

        payload = {
            "symbol": symbol,
            "interval": meta.get("interval"),
            "currency": meta.get("currency"),
            "exchange_timezone": meta.get("exchange_timezone"),
            "exchange": meta.get("exchange"),
            "mic_code": meta.get("mic_code"),
            "type": meta.get("type"),
            **observation,
        }

        raw_event = build_raw_event(
            source_id=str(source_id),
            run_id=str(run_id),
            symbol=symbol,
            source_timestamp=source_timestamp,
            payload=payload,
        )

        async with connection.cursor() as cursor:
            await cursor.execute(
                """
                INSERT INTO raw.ingestion_events
                    (
                        run_id,
                        source_id,
                        entity_topic,
                        source_record_id,
                        source_timestamp,
                        ingested_at,
                        schema_version,
                        payload_hash,
                        raw_payload,
                        validation_status,
                        quarantine_reason
                    )
                VALUES
                    (
                        %s,
                        %s,
                        %s,
                        %s,
                        %s,
                        %s,
                        %s,
                        %s,
                        %s::jsonb,
                        %s,
                        %s
                    )
                RETURNING raw_id
                """,
                (
                    run_id,
                    source_id,
                    raw_event["entity_topic"],
                    raw_event["source_record_id"],
                    raw_event["source_timestamp"],
                    raw_event["ingested_at"],
                    raw_event["schema_version"],
                    raw_event["payload_hash"],
                    json.dumps(raw_event["raw_payload"]),
                    raw_event["validation_status"],
                    raw_event["quarantine_reason"],
                ),
            )

            raw_id = (await cursor.fetchone())[0]

            await cursor.execute(
                """
                UPDATE system.ingestion_runs
                SET
                    status = %s,
                    ended_at = clock_timestamp(),
                    records_received = 1,
                    records_accepted = 1
                WHERE run_id = %s
                """,
                ("COMPLETED", run_id),
            )

            await connection.commit()

        print("Real ingestion successful")
        print("run_id:", run_id)
        print("raw_id:", raw_id)
        print("symbol:", symbol)
        print("source_timestamp:", raw_event["source_timestamp"])
        print("validation_status:", raw_event["validation_status"])

    except Exception:
        async with connection.cursor() as cursor:
            await cursor.execute(
                """
                UPDATE system.ingestion_runs
                SET
                    status = %s,
                    ended_at = clock_timestamp(),
                    error_summary = %s
                WHERE run_id = %s
                """,
                (
                    "FAILED",
                    "Twelve Data ingestion failed",
                    run_id if "run_id" in locals() else None,
                ),
            )
            await connection.commit()
        raise

    finally:
        await connector.close()
        await connection.close()


if __name__ == "__main__":
    asyncio.set_event_loop_policy(
        asyncio.WindowsSelectorEventLoopPolicy()
    )
    asyncio.run(main())
