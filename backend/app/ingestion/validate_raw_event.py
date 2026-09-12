import asyncio
import json

from psycopg import AsyncConnection

from backend.app.core.settings import settings
from backend.app.ingestion.data_quality import validate_ohlcv_payload


async def main() -> None:
    connection = await AsyncConnection.connect(
        host=settings.supabase_db_host,
        port=settings.supabase_db_port,
        dbname=settings.supabase_db_name,
        user=settings.supabase_db_user,
        password=settings.supabase_db_password,
        sslmode="require",
    )

    try:
        async with connection.cursor() as cursor:
            await cursor.execute("""
                SELECT raw_id, raw_payload
                FROM raw.ingestion_events
                WHERE validation_status = 'PENDING'
                ORDER BY ingested_at ASC
                LIMIT 1
            """)

            row = await cursor.fetchone()

            if not row:
                print("No pending raw events found.")
                return

            raw_id, raw_payload = row

            valid, errors = validate_ohlcv_payload(
                json.loads(raw_payload) if isinstance(raw_payload, str) else raw_payload
            )

            if valid:
                await cursor.execute(
                    """
                    UPDATE raw.ingestion_events
                    SET
                        validation_status = 'VALID',
                        quarantine_reason = NULL
                    WHERE raw_id = %s
                    """,
                    (raw_id,),
                )
            else:
                await cursor.execute(
                    """
                    UPDATE raw.ingestion_events
                    SET
                        validation_status = 'QUARANTINED',
                        quarantine_reason = %s
                    WHERE raw_id = %s
                    """,
                    ("; ".join(errors), raw_id),
                )

            await cursor.execute(
                """
                UPDATE system.ingestion_runs
                SET
                    records_accepted = CASE
                        WHEN %s THEN records_accepted + 1
                        ELSE records_accepted
                    END,
                    records_quarantined = CASE
                        WHEN %s THEN records_quarantined + 1
                        ELSE records_quarantined
                    END
                WHERE run_id = (
                    SELECT run_id
                    FROM raw.ingestion_events
                    WHERE raw_id = %s
                )
                """,
                (valid, not valid, raw_id),
            )

            await connection.commit()

        print("Raw event validation complete")
        print("raw_id:", raw_id)
        print("status:", "VALID" if valid else "QUARANTINED")

        if errors:
            print("errors:", errors)

    finally:
        await connection.close()


if __name__ == "__main__":
    asyncio.set_event_loop_policy(
        asyncio.WindowsSelectorEventLoopPolicy()
    )
    asyncio.run(main())
