from __future__ import annotations

import asyncio
from datetime import datetime, timezone

from backend.app.connectors.twelve_data_ws import TwelveDataWebSocket


class LiveMarketStreamService:
    def __init__(self, symbols: list[str]) -> None:
        self.client = TwelveDataWebSocket(symbols)
        self._stopped = False

    async def run(self) -> None:
        try:
            async for message in self.client.stream():
                if self._stopped:
                    break

                if message.get("event") != "price":
                    continue

                normalized = self._normalize_price_event(message)

                print(
                    f"[LIVE] {normalized['symbol']} "
                    f"{normalized['price']} "
                    f"{normalized['currency']} "
                    f"{normalized['source_timestamp']}"
                )

        finally:
            await self.client.close()

    def _normalize_price_event(self, message: dict) -> dict:
        timestamp = datetime.fromtimestamp(
            int(message["timestamp"]),
            tz=timezone.utc,
        )

        return {
            "symbol": message["symbol"],
            "exchange": message.get("exchange"),
            "currency": message.get("currency"),
            "mic_code": message.get("mic_code"),
            "price": float(message["price"]),
            "day_volume": float(message.get("day_volume", 0)),
            "source_timestamp": timestamp.isoformat(),
        }

    async def stop(self) -> None:
        self._stopped = True
        await self.client.close()
