import asyncio
from decimal import Decimal

from psycopg import AsyncConnection

from backend.app.core.settings import settings


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
            await cursor.execute(
                """
                SELECT
                    r.raw_id,
                    r.source_id,
                    r.source_record_id,
                    r.source_timestamp,
                    r.ingested_at,
                    r.raw_payload
                FROM raw.ingestion_events r
                WHERE r.validation_status = 'VALID'
                  AND r.entity_topic = 'market.ohlcv.AAPL'
                ORDER BY r.ingested_at DESC
                LIMIT 1
                """
            )

            row = await cursor.fetchone()

            if not row:
                raise RuntimeError("No VALID AAPL raw event found")

            raw_id, source_id, source_record_id, source_timestamp, ingested_at, payload = row

            await cursor.execute(
                """
                INSERT INTO warehouse.fct_market_ohlcv (
                    raw_id,
                    source_id,
                    symbol,
                    exchange,
                    interval,
                    source_timestamp,
                    ingested_at,
                    open_price,
                    high_price,
                    low_price,
                    close_price,
                    volume,
                    currency,
                    source_record_id
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
                ON CONFLICT (source_id, source_record_id)
                DO NOTHING
                RETURNING market_event_id
                """,
                (
                    raw_id,
                    source_id,
                    payload["symbol"],
                    payload.get("exchange"),
                    payload["interval"],
                    source_timestamp,
                    ingested_at,
                    Decimal(str(payload["open"])),
                    Decimal(str(payload["high"])),
                    Decimal(str(payload["low"])),
                    Decimal(str(payload["close"])),
                    Decimal(str(payload["volume"])),
                    payload.get("currency"),
                    source_record_id,
                ),
            )

            inserted = await cursor.fetchone()
            await connection.commit()

        if inserted:
            print("Market warehouse load successful")
            print("market_event_id:", inserted[0])
        else:
            print("Market record already exists; no duplicate inserted")

    finally:
        await connection.close()


if __name__ == "__main__":
    asyncio.set_event_loop_policy(
        asyncio.WindowsSelectorEventLoopPolicy()
    )
    asyncio.run(main())
