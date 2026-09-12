import asyncio
import json

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
                SELECT source_id
                FROM system.data_sources
                WHERE source_name = %s
                """,
                ("Twelve Data",),
            )
            row = await cursor.fetchone()

            if not row:
                raise RuntimeError("Twelve Data source is not registered")

            source_id = row[0]

            await cursor.execute(
                """
                INSERT INTO system.connectors
                    (
                        source_id,
                        connector_name,
                        version,
                        schedule_cron,
                        sync_mode,
                        config_payload,
                        health_status
                    )
                VALUES
                    (
                        %s,
                        %s,
                        %s,
                        %s,
                        %s,
                        %s::jsonb,
                        %s
                    )
                ON CONFLICT DO NOTHING
                RETURNING connector_id, connector_name, sync_mode, health_status;
                """,
                (
                    source_id,
                    "twelve-data-market-connector",
                    "1.0.0",
                    "* * * * *",
                    "STREAM",
                    json.dumps(
                        {
                            "provider": "Twelve Data",
                            "market": "US",
                            "symbol_mode": "configured-symbols",
                            "interval": "1min",
                        }
                    ),
                    "HEALTHY",
                ),
            )

            connector = await cursor.fetchone()
            await connection.commit()

        print("Connector registered:")
        if connector:
            print("connector_id:", connector[0])
            print("connector_name:", connector[1])
            print("sync_mode:", connector[2])
            print("health_status:", connector[3])
        else:
            print("Connector already exists.")

    finally:
        await connection.close()


if __name__ == "__main__":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
