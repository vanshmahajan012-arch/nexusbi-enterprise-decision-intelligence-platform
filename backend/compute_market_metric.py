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
            await cursor.execute(
                """
                SELECT metric_id
                FROM semantic.metrics_catalog
                WHERE metric_key = %s
                """,
                ("aapl_latest_price",),
            )

            metric_row = await cursor.fetchone()

            if not metric_row:
                raise RuntimeError("AAPL Latest Price metric not found")

            metric_id = metric_row[0]

            await cursor.execute(
                """
                SELECT
                    close_price,
                    source_timestamp,
                    ingested_at
                FROM warehouse.fct_market_ohlcv
                WHERE symbol = %s
                ORDER BY source_timestamp DESC
                LIMIT 1
                """,
                ("AAPL",),
            )

            market_row = await cursor.fetchone()

            if not market_row:
                raise RuntimeError("No AAPL warehouse observation found")

            close_price, source_timestamp, ingested_at = market_row

            await cursor.execute(
                """
                INSERT INTO semantic.metric_observations (
                    metric_id,
                    grain,
                    dimension_filters,
                    metric_value,
                    period_start,
                    period_end,
                    calculated_at
                )
                VALUES (
                    %s,
                    %s,
                    %s::jsonb,
                    %s,
                    %s,
                    %s,
                    clock_timestamp()
                )
                RETURNING observation_id, metric_value;
                """,
                (
                    metric_id,
                    "REALTIME",
                    '{"symbol":"AAPL","exchange":"NASDAQ","interval":"1min"}',
                    close_price,
                    source_timestamp,
                    source_timestamp,
                ),
            )

            observation_id, metric_value = await cursor.fetchone()
            await connection.commit()

        print("Semantic market observation created:")
        print("observation_id:", observation_id)
        print("metric_value:", metric_value)
        print("source_timestamp:", source_timestamp)
        print("ingested_at:", ingested_at)

    finally:
        await connection.close()


if __name__ == "__main__":
    asyncio.set_event_loop_policy(
        asyncio.WindowsSelectorEventLoopPolicy()
    )
    asyncio.run(main())
