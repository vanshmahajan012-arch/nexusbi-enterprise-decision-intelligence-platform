from __future__ import annotations

import time
from decimal import Decimal
from typing import Any

from backend.app.db.postgres import (
    fetch_all_with_columns,
)


def _serialize_value(
    value: Any,
) -> Any:
    if isinstance(value, Decimal):
        return float(value)

    if hasattr(value, "isoformat"):
        try:
            return value.isoformat()
        except Exception:
            pass

    return value


async def execute_read_only_sql(
    sql: str,
) -> dict[str, Any]:
    started = time.perf_counter()

    result = await fetch_all_with_columns(
        sql
    )

    rows = result["rows"]
    columns = result["columns"]

    elapsed_ms = (
        time.perf_counter()
        - started
    ) * 1000

    result_rows = [
        [
            _serialize_value(value)
            for value in row
        ]
        for row in rows
    ]

    return {
        "columns": columns,
        "rows": result_rows,
        "row_count": len(result_rows),
        "execution_ms": round(
            elapsed_ms,
            2,
        ),
    }