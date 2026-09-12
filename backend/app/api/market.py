from datetime import datetime

from fastapi import APIRouter, HTTPException

from backend.app.connectors.twelve_data_quote import (
    TwelveDataQuote,
)
from backend.app.db.postgres import (
    fetch_all,
    fetch_one,
)
from backend.app.services.live_market_health import (
    live_market_health,
)
from backend.app.services.market_intelligence import (
    calculate_market_intelligence,
)
from backend.app.services.market_snapshot import (
    build_market_snapshot,
)


router = APIRouter(
    prefix="/api/market",
    tags=["market"],
)


@router.get("/aapl/latest")
async def get_aapl_latest_price() -> dict:
    row = await fetch_one(
        """
        SELECT
            symbol,
            price,
            currency,
            source_timestamp,
            received_at,
            updated_at
        FROM warehouse.live_market_quotes
        WHERE symbol = %s
        LIMIT 1
        """,
        ("AAPL",),
    )

    if not row:
        raise HTTPException(
            status_code=404,
            detail="AAPL live quote is unavailable",
        )

    (
        symbol,
        price,
        currency,
        source_timestamp,
        received_at,
        updated_at,
    ) = row

    return {
        "metric": "aapl_latest_price",
        "symbol": symbol,
        "value": float(price),
        "currency": currency,
        "source_timestamp": source_timestamp,
        "received_at": received_at,
        "updated_at": updated_at,
    }


@router.get("/aapl/history")
async def get_aapl_history(limit: int = 30) -> dict:
    limit = max(2, min(limit, 200))

    rows = await fetch_all(
        """
        SELECT
            price,
            source_timestamp,
            received_at
        FROM warehouse.live_market_ticks
        WHERE symbol = %s
        ORDER BY source_timestamp DESC, received_at DESC
        LIMIT %s
        """,
        ("AAPL", limit),
    )

    points = [
        {
            "price": float(row[0]),
            "source_timestamp": row[1],
            "received_at": row[2],
        }
        for row in reversed(rows)
    ]

    return {
        "symbol": "AAPL",
        "count": len(points),
        "points": points,
    }


@router.get("/aapl/snapshot")
async def get_aapl_market_snapshot() -> dict:
    # ---------------------------------------------------------
    # 1. Get current live-feed health
    # ---------------------------------------------------------

    live_health = live_market_health.snapshot()

    live_price = live_health.get("last_price")

    live_source_timestamp = None

    if live_health.get("last_source_timestamp"):
        live_source_timestamp = datetime.fromisoformat(
            live_health["last_source_timestamp"]
        )

    # ---------------------------------------------------------
    # 2. Get cached Twelve Data session quote
    #
    # This contains:
    # Open / High / Low / Previous Close /
    # Day Change / Day Change % / Volume / 52W range
    # ---------------------------------------------------------

    quote = TwelveDataQuote("AAPL").get()

    # ---------------------------------------------------------
    # 3. Normalize quote + live WebSocket price
    # ---------------------------------------------------------

    snapshot = build_market_snapshot(
        quote,
        live_price=live_price,
        live_source_timestamp=live_source_timestamp,
    )

    # ---------------------------------------------------------
    # 4. Get recent real ticks for intelligence calculations
    # ---------------------------------------------------------

    tick_rows = await fetch_all(
        """
        SELECT
            price
        FROM warehouse.live_market_ticks
        WHERE symbol = %s
        ORDER BY source_timestamp DESC, received_at DESC
        LIMIT 30
        """,
        ("AAPL",),
    )

    tick_prices = [
        float(row[0])
        for row in reversed(tick_rows)
    ]

    # ---------------------------------------------------------
    # 5. Calculate market intelligence
    # ---------------------------------------------------------

    intelligence = calculate_market_intelligence(
        price=snapshot.price,
        open_price=snapshot.open_price,
        high_price=snapshot.high_price,
        low_price=snapshot.low_price,
        percent_change=snapshot.percent_change,
        volume=snapshot.volume,
        tick_prices=tick_prices,
    )

    # ---------------------------------------------------------
    # 6. Return unified market state
    # ---------------------------------------------------------

    return {
        "status": live_health["status"],
        "feed_age_seconds": live_health["age_seconds"],
        "reconnect_count": live_health["reconnect_count"],

        "quote_cache_hit": quote.get(
            "_cache_hit",
            False,
        ),

        "quote_cache_age_seconds": quote.get(
            "_cache_age_seconds",
            0.0,
        ),

        "quote_stale_fallback": quote.get(
            "_stale_fallback",
            False,
        ),

        **snapshot.to_dict(),

        "market_intelligence": (
            intelligence.to_dict()
        ),
    }


@router.get("/health")
async def get_live_market_health() -> dict:
    return live_market_health.snapshot()