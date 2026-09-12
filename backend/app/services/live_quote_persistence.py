from __future__ import annotations

from backend.app.db.postgres import execute


class LiveQuotePersistence:
    async def upsert_quote(self, quote: dict) -> None:
        # Store every incoming tick as history.
        await execute(
            """
            INSERT INTO warehouse.live_market_ticks (
                source_id,
                symbol,
                exchange,
                currency,
                mic_code,
                price,
                day_volume,
                source_timestamp,
                received_at
            )
            SELECT
                ds.source_id,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                clock_timestamp()
            FROM system.data_sources ds
            WHERE ds.source_name = %s
            """,
            (
                quote["symbol"],
                quote.get("exchange"),
                quote.get("currency"),
                quote.get("mic_code"),
                quote["price"],
                quote.get("day_volume", 0),
                quote["source_timestamp"],
                "Twelve Data",
            ),
        )

        # Maintain the latest state separately.
        await execute(
            """
            INSERT INTO warehouse.live_market_quotes (
                source_id,
                symbol,
                exchange,
                currency,
                mic_code,
                price,
                day_volume,
                source_timestamp,
                received_at,
                updated_at
            )
            SELECT
                ds.source_id,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                clock_timestamp(),
                clock_timestamp()
            FROM system.data_sources ds
            WHERE ds.source_name = %s
            ON CONFLICT (symbol)
            DO UPDATE SET
                source_id = EXCLUDED.source_id,
                exchange = EXCLUDED.exchange,
                currency = EXCLUDED.currency,
                mic_code = EXCLUDED.mic_code,
                price = EXCLUDED.price,
                day_volume = EXCLUDED.day_volume,
                source_timestamp = EXCLUDED.source_timestamp,
                received_at = EXCLUDED.received_at,
                updated_at = clock_timestamp()
            """,
            (
                quote["symbol"],
                quote.get("exchange"),
                quote.get("currency"),
                quote.get("mic_code"),
                quote["price"],
                quote.get("day_volume", 0),
                quote["source_timestamp"],
                "Twelve Data",
            ),
        )