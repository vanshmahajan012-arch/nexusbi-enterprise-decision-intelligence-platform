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
                    COUNT(*) AS metric_count
                FROM semantic.metrics_catalog
            """)

            metric_count = await cursor.fetchone()

            await cursor.execute("""
                SELECT metric_key, display_name, domain, target_grain
                FROM semantic.metrics_catalog
                ORDER BY metric_key
            """)

            metrics = await cursor.fetchall()

        print(f"Metric count: {metric_count[0]}")

        for metric_key, display_name, domain, target_grain in metrics:
            print(
                f"{metric_key} | {display_name} | "
                f"{domain} | {target_grain}"
            )

    finally:
        await connection.close()


if __name__ == "__main__":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
