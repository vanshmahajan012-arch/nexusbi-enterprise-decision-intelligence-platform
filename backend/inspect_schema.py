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
                SELECT table_schema, table_name
                FROM information_schema.tables
                WHERE table_schema IN (
                    'raw',
                    'staging',
                    'warehouse',
                    'semantic',
                    'ai',
                    'knowledge',
                    'decision',
                    'audit',
                    'system'
                )
                ORDER BY table_schema, table_name
            """)

            rows = await cursor.fetchall()

        for schema, table in rows:
            print(f"{schema}.{table}")

    finally:
        await connection.close()


if __name__ == "__main__":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
