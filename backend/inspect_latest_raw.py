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
                    raw_id,
                    entity_topic,
                    source_record_id,
                    source_timestamp,
                    ingested_at,
                    validation_status,
                    payload_hash,
                    raw_payload
                FROM raw.ingestion_events
                ORDER BY ingested_at DESC
                LIMIT 1
            """)

            row = await cursor.fetchone()

        print("Latest raw ingestion:")
        print("raw_id:", row[0])
        print("entity_topic:", row[1])
        print("source_record_id:", row[2])
        print("source_timestamp:", row[3])
        print("ingested_at:", row[4])
        print("validation_status:", row[5])
        print("payload_hash:", row[6])
        print("raw_payload:", row[7])

    finally:
        await connection.close()


if __name__ == "__main__":
    asyncio.set_event_loop_policy(
        asyncio.WindowsSelectorEventLoopPolicy()
    )
    asyncio.run(main())
