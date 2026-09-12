from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any


@dataclass
class MarketSnapshot:
    symbol: str
    name: str | None
    exchange: str | None
    mic_code: str | None
    currency: str | None

    price: float
    open_price: float | None
    high_price: float | None
    low_price: float | None
    previous_close: float | None

    change: float | None
    percent_change: float | None
    volume: float | None

    market_open: bool
    source_timestamp: datetime
    received_at: datetime

    fifty_two_week_low: float | None = None
    fifty_two_week_high: float | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "symbol": self.symbol,
            "name": self.name,
            "exchange": self.exchange,
            "mic_code": self.mic_code,
            "currency": self.currency,
            "price": self.price,
            "open": self.open_price,
            "high": self.high_price,
            "low": self.low_price,
            "previous_close": self.previous_close,
            "change": self.change,
            "percent_change": self.percent_change,
            "volume": self.volume,
            "is_market_open": self.market_open,
            "source_timestamp": self.source_timestamp.isoformat(),
            "received_at": self.received_at.isoformat(),
            "fifty_two_week_low": self.fifty_two_week_low,
            "fifty_two_week_high": self.fifty_two_week_high,
        }


def build_market_snapshot(
    quote: dict[str, Any],
    *,
    live_price: float | None = None,
    live_source_timestamp: datetime | None = None,
) -> MarketSnapshot:
    def to_float(value: Any) -> float | None:
        if value is None or value == "":
            return None

        return float(value)

    received_at = datetime.now(timezone.utc)

    quote_price = to_float(quote.get("close")) or 0.0

    price = (
        live_price
        if live_price is not None
        else quote_price
    )

    source_timestamp = (
        live_source_timestamp
        if live_source_timestamp is not None
        else datetime.fromtimestamp(
            int(quote["last_quote_at"]),
            tz=timezone.utc,
        )
    )

    fifty_two_week = quote.get("fifty_two_week") or {}

    return MarketSnapshot(
        symbol=quote["symbol"],
        name=quote.get("name"),
        exchange=quote.get("exchange"),
        mic_code=quote.get("mic_code"),
        currency=quote.get("currency"),
        price=price,
        open_price=to_float(quote.get("open")),
        high_price=to_float(quote.get("high")),
        low_price=to_float(quote.get("low")),
        previous_close=to_float(quote.get("previous_close")),
        change=to_float(quote.get("change")),
        percent_change=to_float(
            quote.get("percent_change")
        ),
        volume=to_float(quote.get("volume")),
        market_open=bool(
            quote.get("is_market_open", False)
        ),
        source_timestamp=source_timestamp,
        received_at=received_at,
        fifty_two_week_low=to_float(
            fifty_two_week.get("low")
        ),
        fifty_two_week_high=to_float(
            fifty_two_week.get("high")
        ),
    )
    