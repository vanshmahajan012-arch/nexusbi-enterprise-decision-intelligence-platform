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
                INSERT INTO system.data_sources
                    (source_name, source_type, auth_type, connection_metadata)
                VALUES
                    (%s, %s, %s, %s::jsonb)
                ON CONFLICT (source_name)
                DO UPDATE SET
                    updated_at = clock_timestamp()
                RETURNING source_id, source_name, source_type;
                """,
                (
                    "Twelve Data",
                    "MARKET_DATA_API",
                    "API_KEY",
                    '{"vendor":"Twelve Data","mode":"near-realtime"}',
                ),
            )

            row = await cursor.fetchone()
            await connection.commit()

        print("Source registered:")
        print("source_id:", row[0])
        print("source_name:", row[1])
        print("source_type:", row[2])

    finally:
        await connection.close()


if __name__ == "__main__":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
