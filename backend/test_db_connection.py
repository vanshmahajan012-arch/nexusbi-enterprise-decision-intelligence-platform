import asyncio

from backend.app.db.postgres import test_database_connection


async def main() -> None:
    connected = await test_database_connection()
    print("Supabase PostgreSQL connection:", connected)


if __name__ == "__main__":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
