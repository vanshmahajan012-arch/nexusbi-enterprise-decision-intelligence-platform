import asyncio

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
            await cursor.execute("""
                SELECT
                    market_event_id,
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
                    currency
                FROM warehouse.fct_market_ohlcv
                ORDER BY source_timestamp DESC
                LIMIT 1
            """)

            row = await cursor.fetchone()

        print("Latest market warehouse record:")
        print("market_event_id:", row[0])
        print("symbol:", row[1])
        print("exchange:", row[2])
        print("interval:", row[3])
        print("source_timestamp:", row[4])
        print("ingested_at:", row[5])
        print("open:", row[6])
        print("high:", row[7])
        print("low:", row[8])
        print("close:", row[9])
        print("volume:", row[10])
        print("currency:", row[11])

    finally:
        await connection.close()


if __name__ == "__main__":
    asyncio.set_event_loop_policy(
        asyncio.WindowsSelectorEventLoopPolicy()
    )
    asyncio.run(main())
