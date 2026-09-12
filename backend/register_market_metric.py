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
                INSERT INTO semantic.metrics_catalog (
                    metric_key,
                    display_name,
                    domain,
                    business_definition,
                    sql_formula,
                    target_grain,
                    allowed_dimensions,
                    owner_team,
                    target_sla_freshness_seconds,
                    unit_format
                )
                VALUES (
                    %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s
                )
                ON CONFLICT (metric_key)
                DO UPDATE SET
                    display_name = EXCLUDED.display_name,
                    business_definition = EXCLUDED.business_definition,
                    sql_formula = EXCLUDED.sql_formula,
                    target_grain = EXCLUDED.target_grain,
                    allowed_dimensions = EXCLUDED.allowed_dimensions,
                    owner_team = EXCLUDED.owner_team,
                    target_sla_freshness_seconds = EXCLUDED.target_sla_freshness_seconds,
                    unit_format = EXCLUDED.unit_format,
                    updated_at = clock_timestamp()
                RETURNING metric_id, metric_key, display_name;
                """,
                (
                    "aapl_latest_price",
                    "AAPL Latest Price",
                    "MARKET",
                    "Latest validated AAPL observation price from the governed market data warehouse.",
                    "SELECT close_price FROM warehouse.fct_market_ohlcv WHERE symbol = 'AAPL' ORDER BY source_timestamp DESC LIMIT 1",
                    "REALTIME",
                    ["symbol", "exchange", "interval"],
                    "Market Intelligence Core",
                    120,
                    "CURRENCY_USD",
                ),
            )

            row = await cursor.fetchone()
            await connection.commit()

        print("Semantic metric registered:")
        print("metric_id:", row[0])
        print("metric_key:", row[1])
        print("display_name:", row[2])

    finally:
        await connection.close()


if __name__ == "__main__":
    asyncio.set_event_loop_policy(
        asyncio.WindowsSelectorEventLoopPolicy()
    )
    asyncio.run(main())
