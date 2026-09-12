from __future__ import annotations

from backend.app.ai.provider_router import (
    AIRouter,
)


WAREHOUSE_SCHEMA = """
AVAILABLE NXUS WAREHOUSE SCHEMA

warehouse.dim_customer
- customer_id UUID
- source_customer_key VARCHAR
- company_name VARCHAR
- customer_tier VARCHAR
- industry VARCHAR
- account_status VARCHAR
- contract_renewal_date DATE
- assigned_csm VARCHAR
- created_at TIMESTAMPTZ
- updated_at TIMESTAMPTZ

warehouse.dim_date
- date_id INTEGER
- full_date DATE
- day_of_week SMALLINT
- day_name VARCHAR
- day_of_month SMALLINT
- day_of_year SMALLINT
- week_of_year SMALLINT
- month_number SMALLINT
- month_name VARCHAR
- quarter SMALLINT
- year INTEGER
- is_weekend BOOLEAN
- is_holiday BOOLEAN

warehouse.dim_location
- location_id UUID
- region_code VARCHAR
- country_iso VARCHAR
- city VARCHAR
- timezone VARCHAR
- created_at TIMESTAMPTZ

warehouse.dim_platform
- platform_id UUID
- platform_code VARCHAR
- device_category VARCHAR
- operating_system VARCHAR
- client_version VARCHAR
- created_at TIMESTAMPTZ

warehouse.dim_product
- product_id UUID
- sku VARCHAR
- product_name VARCHAR
- category VARCHAR
- pricing_tier VARCHAR
- unit_cost_usd NUMERIC
- list_price_usd NUMERIC
- is_active BOOLEAN
- created_at TIMESTAMPTZ
- updated_at TIMESTAMPTZ

warehouse.fct_order_items
- order_item_id UUID
- order_id UUID
- product_id UUID
- quantity INTEGER
- unit_price_usd NUMERIC
- unit_cost_usd NUMERIC
- total_line_amount_usd NUMERIC
- created_at TIMESTAMPTZ

warehouse.fct_orders
- order_id UUID
- raw_id UUID
- date_id INTEGER
- customer_id UUID
- location_id UUID
- platform_id UUID
- order_code VARCHAR
- order_status VARCHAR
- currency CHAR
- gross_order_value_usd NUMERIC
- discount_amount_usd NUMERIC
- net_order_value_usd NUMERIC
- cost_of_goods_usd NUMERIC
- gross_margin_usd NUMERIC
- order_timestamp TIMESTAMPTZ
- created_at TIMESTAMPTZ

warehouse.fct_telemetry_events
- event_id UUID
- raw_id UUID
- event_type VARCHAR
- service_name VARCHAR
- region_code VARCHAR
- status_code INTEGER
- latency_ms NUMERIC
- error_code VARCHAR
- event_payload JSONB
- event_timestamp TIMESTAMPTZ
- ingested_at TIMESTAMPTZ

warehouse.fct_market_ohlcv
- market_event_id UUID
- raw_id UUID
- source_id UUID
- symbol VARCHAR
- exchange VARCHAR
- interval VARCHAR
- source_timestamp TIMESTAMPTZ
- ingested_at TIMESTAMPTZ
- open_price NUMERIC
- high_price NUMERIC
- low_price NUMERIC
- close_price NUMERIC
- volume NUMERIC
- currency CHAR
- source_record_id VARCHAR
- created_at TIMESTAMPTZ

warehouse.live_market_quotes
- quote_id UUID
- source_id UUID
- symbol VARCHAR
- exchange VARCHAR
- currency CHAR
- mic_code VARCHAR
- price NUMERIC
- day_volume NUMERIC
- source_timestamp TIMESTAMPTZ
- received_at TIMESTAMPTZ
- updated_at TIMESTAMPTZ

warehouse.live_market_ticks
- tick_id UUID
- source_id UUID
- symbol VARCHAR
- exchange VARCHAR
- currency CHAR
- mic_code VARCHAR
- price NUMERIC
- day_volume NUMERIC
- source_timestamp TIMESTAMPTZ
- received_at TIMESTAMPTZ
"""


SYSTEM_PROMPT = f"""
You are NXUS Natural Language to SQL.

Convert the user's business question into ONE safe PostgreSQL SELECT query.

{WAREHOUSE_SCHEMA}

STRICT RULES:
1. Output SQL only.
2. Only SELECT or WITH queries are allowed.
3. Use ONLY tables and columns listed above.
4. Never invent a table.
5. Never invent a column.
6. Never use schemas such as gold, silver, bronze, public, telemetry, or analytics unless explicitly listed above.
7. Never INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, CREATE, GRANT, REVOKE, MERGE, EXECUTE, COPY, VACUUM or other mutating/admin operations.
8. Use valid PostgreSQL syntax.
9. Prefer explicit JOIN conditions using known foreign-key relationships.
10. Add LIMIT 100 unless the user explicitly asks for another limit.
11. For revenue, prefer warehouse.fct_orders.net_order_value_usd unless the question clearly asks for gross revenue.
12. For product revenue, join warehouse.fct_order_items to warehouse.dim_product.
13. For regional revenue, join warehouse.fct_orders to warehouse.dim_location.
14. For customer analysis, use warehouse.dim_customer.
15. For time-based order analysis, use warehouse.fct_orders.order_timestamp.
16. Return exactly one SQL statement.

If the request cannot be answered from the available schema, return:

SELECT NULL AS error_message LIMIT 1;
"""


async def generate_sql(
    *,
    question: str,
    dialect: str,
) -> dict[str, str]:
    provider = AIRouter()

    prompt = f"""
Business question:
{question}

Requested dialect:
{dialect}

Generate one PostgreSQL SELECT query using ONLY the supplied NXUS schema.
Return SQL only.
"""

    response = await provider.generate(
        system_prompt=SYSTEM_PROMPT,
        user_prompt=prompt,
        temperature=0.0,
    )

    return {
        "sql": response.content.strip(),
        "provider": response.provider,
        "model": response.model,
    }