from __future__ import annotations

import re


FORBIDDEN_KEYWORDS = {
    "INSERT",
    "UPDATE",
    "DELETE",
    "DROP",
    "ALTER",
    "TRUNCATE",
    "CREATE",
    "GRANT",
    "REVOKE",
    "MERGE",
    "CALL",
    "EXEC",
    "EXECUTE",
    "COPY",
    "VACUUM",
    "ANALYZE",
    "COMMENT",
}


ALLOWED_TABLES = {
    "warehouse.dim_customer",
    "warehouse.dim_date",
    "warehouse.dim_location",
    "warehouse.dim_platform",
    "warehouse.dim_product",
    "warehouse.fct_order_items",
    "warehouse.fct_orders",
    "warehouse.fct_telemetry_events",
    "warehouse.fct_market_ohlcv",
    "warehouse.live_market_quotes",
    "warehouse.live_market_ticks",
}


def normalize_sql(sql: str) -> str:
    sql = sql.strip()

    if sql.startswith("```"):
        sql = re.sub(
            r"^```(?:sql)?\s*",
            "",
            sql,
            flags=re.IGNORECASE,
        )

        sql = re.sub(
            r"\s*```$",
            "",
            sql,
        )

    return sql.strip()


def validate_sql(
    sql: str,
) -> str:
    sql = normalize_sql(sql)

    if not sql:
        raise ValueError(
            "Generated SQL is empty."
        )

    # Only SELECT / WITH queries.
    if not re.match(
        r"^\s*(SELECT|WITH)\b",
        sql,
        flags=re.IGNORECASE,
    ):
        raise ValueError(
            "Only SELECT queries are allowed."
        )

    # No multiple statements.
    if ";" in sql.rstrip(";"):
        raise ValueError(
            "Multiple SQL statements are not allowed."
        )

    # Ignore SQL string literals while checking dangerous keywords.
    sql_without_literals = re.sub(
        r"'(?:''|[^'])*'",
        "''",
        sql,
        flags=re.DOTALL,
    )

    for keyword in FORBIDDEN_KEYWORDS:
        if re.search(
            rf"\b{re.escape(keyword)}\b",
            sql_without_literals,
            flags=re.IGNORECASE,
        ):
            raise ValueError(
                f"Forbidden SQL operation: {keyword}"
            )

    # Validate all FROM/JOIN table references.
    references = re.findall(
        r"\b(?:FROM|JOIN)\s+"
        r"([A-Za-z_][\w]*\."
        r"[A-Za-z_][\w]*)",
        sql,
        flags=re.IGNORECASE,
    )

    if not references:
        raise ValueError(
            "No approved warehouse table reference was found."
        )

    allowed_lower = {
        table.lower()
        for table in ALLOWED_TABLES
    }

    for table in references:
        if table.lower() not in allowed_lower:
            raise ValueError(
                f"Table is not allowed: {table}"
            )

    # Keep result sets bounded.
    if not re.search(
        r"\bLIMIT\s+\d+\b",
        sql,
        flags=re.IGNORECASE,
    ):
        sql += "\nLIMIT 100"

    return sql.rstrip(";").strip()