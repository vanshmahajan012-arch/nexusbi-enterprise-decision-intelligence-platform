from __future__ import annotations

import asyncio
from typing import Any

from psycopg import Connection

from backend.app.core.settings import settings


def _connection_kwargs() -> dict[str, Any]:
    if not all(
        [
            settings.supabase_db_host,
            settings.supabase_db_port,
            settings.supabase_db_name,
            settings.supabase_db_user,
            settings.supabase_db_password,
        ]
    ):
        raise RuntimeError(
            "Supabase database configuration is incomplete"
        )

    return {
        "host": settings.supabase_db_host,
        "port": settings.supabase_db_port,
        "dbname": settings.supabase_db_name,
        "user": settings.supabase_db_user,
        "password": settings.supabase_db_password,
        "sslmode": "require",
    }


def _fetch_one_sync(
    query: str,
    params: tuple[Any, ...] = (),
) -> tuple[Any, ...] | None:
    with Connection.connect(
        **_connection_kwargs()
    ) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                query,
                params,
            )
            return cursor.fetchone()


async def fetch_one(
    query: str,
    params: tuple[Any, ...] = (),
) -> tuple[Any, ...] | None:
    return await asyncio.to_thread(
        _fetch_one_sync,
        query,
        params,
    )


def _fetch_all_sync(
    query: str,
    params: tuple[Any, ...] = (),
) -> list[tuple[Any, ...]]:
    with Connection.connect(
        **_connection_kwargs()
    ) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                query,
                params,
            )
            return cursor.fetchall()


async def fetch_all(
    query: str,
    params: tuple[Any, ...] = (),
) -> list[tuple[Any, ...]]:
    return await asyncio.to_thread(
        _fetch_all_sync,
        query,
        params,
    )


# ---------------------------------------------------------
# Fetch rows + column metadata
# Used by NL → SQL execution.
# ---------------------------------------------------------

def _fetch_all_with_columns_sync(
    query: str,
    params: tuple[Any, ...] = (),
) -> dict[str, Any]:
    with Connection.connect(
        **_connection_kwargs()
    ) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                query,
                params,
            )

            rows = cursor.fetchall()

            columns = [
                description.name
                for description in (
                    cursor.description or []
                )
            ]

    return {
        "columns": columns,
        "rows": rows,
    }


async def fetch_all_with_columns(
    query: str,
    params: tuple[Any, ...] = (),
) -> dict[str, Any]:
    return await asyncio.to_thread(
        _fetch_all_with_columns_sync,
        query,
        params,
    )


def _execute_sync(
    query: str,
    params: tuple[Any, ...] = (),
) -> None:
    with Connection.connect(
        **_connection_kwargs()
    ) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                query,
                params
            )

        connection.commit()


async def execute(
    query: str,
    params: tuple[Any, ...] = (),
) -> None:
    await asyncio.to_thread(
        _execute_sync,
        query,
        params,
    )


def _execute_returning_sync(
    query: str,
    params: tuple[Any, ...] = (),
) -> tuple[Any, ...] | None:
    with Connection.connect(
        **_connection_kwargs()
    ) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                query,
                params,
            )

            row = cursor.fetchone()

        connection.commit()

        return row


async def execute_returning(
    query: str,
    params: tuple[Any, ...] = (),
) -> tuple[Any, ...] | None:
    return await asyncio.to_thread(
        _execute_returning_sync,
        query,
        params,
    )


def _test_database_connection_sync() -> bool:
    with Connection.connect(
        **_connection_kwargs()
    ) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT 1"
            )

            row = cursor.fetchone()

    return row == (1,)


async def test_database_connection() -> bool:
    return await asyncio.to_thread(
        _test_database_connection_sync
    )