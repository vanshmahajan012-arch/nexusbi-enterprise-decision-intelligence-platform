from __future__ import annotations

import time
from typing import Any

import requests

from backend.app.core.settings import settings


TWELVE_DATA_QUOTE_URL = "https://api.twelvedata.com/quote"

# REST quote ko har request par hit nahi karna.
QUOTE_CACHE_TTL_SECONDS = 60.0

_cached_quotes: dict[str, dict[str, Any]] = {}
_cached_at: dict[str, float] = {}


class TwelveDataQuote:
    def __init__(self, symbol: str) -> None:
        if not settings.twelve_data_api_key:
            raise RuntimeError(
                "TWELVE_DATA_API_KEY is not configured"
            )

        if not symbol:
            raise ValueError("Symbol is required")

        self.symbol = symbol.upper()

    def get(self, force_refresh: bool = False) -> dict[str, Any]:
        now = time.monotonic()

        cached = _cached_quotes.get(self.symbol)
        cached_time = _cached_at.get(self.symbol, 0.0)

        cache_is_fresh = (
            cached is not None
            and (now - cached_time) < QUOTE_CACHE_TTL_SECONDS
        )

        if cache_is_fresh and not force_refresh:
            return {
                **cached,
                "_cache_hit": True,
                "_cache_age_seconds": round(
                    now - cached_time,
                    3,
                ),
            }

        try:
            response = requests.get(
                TWELVE_DATA_QUOTE_URL,
                params={
                    "symbol": self.symbol,
                    "apikey": settings.twelve_data_api_key,
                },
                timeout=10,
            )

            response.raise_for_status()

            data = response.json()

            if data.get("status") == "error":
                raise RuntimeError(
                    data.get(
                        "message",
                        "Twelve Data quote request failed",
                    )
                )

            _cached_quotes[self.symbol] = data
            _cached_at[self.symbol] = now

            return {
                **data,
                "_cache_hit": False,
                "_cache_age_seconds": 0.0,
            }

        except requests.HTTPError as exc:
            status_code = (
                exc.response.status_code
                if exc.response is not None
                else None
            )

            # Rate-limit ke case mein last known good quote use karo.
            if status_code == 429 and cached is not None:
                return {
                    **cached,
                    "_cache_hit": True,
                    "_cache_age_seconds": round(
                        now - cached_time,
                        3,
                    ),
                    "_stale_fallback": True,
                }

            raise