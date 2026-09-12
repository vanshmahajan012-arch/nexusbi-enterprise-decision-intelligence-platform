from __future__ import annotations

import asyncio
import logging

from backend.app.connectors.twelve_data_ws import TwelveDataWebSocket
from backend.app.services.live_quote_persistence import (
    LiveQuotePersistence,
)
from backend.app.services.live_market_health import (
    live_market_health,
)
from backend.app.services.live_market_broadcaster import (
    live_market_broadcaster,
)


logger = logging.getLogger("nxus.live_market")


class LiveMarketWorker:
    def __init__(self, symbols: list[str]) -> None:
        self.symbols = symbols
        self._stop_event = asyncio.Event()
        self._reconnect_delay = 5
        self.persistence = LiveQuotePersistence()

    async def run(self) -> None:
        live_market_health.mark_started()

        while not self._stop_event.is_set():
            stream = TwelveDataWebSocket(self.symbols)

            try:
                logger.info(
                    "Starting live market stream for %s",
                    ", ".join(self.symbols),
                )

                live_market_health.mark_connected()

                async for message in stream.stream():
                    if self._stop_event.is_set():
                        break

                    if message.get("event") != "price":
                        continue

                    normalized = self._normalize(message)

                    # Persist the real tick first.
                    await self.persistence.upsert_quote(
                        normalized
                    )

                    # Update backend live-health state.
                    live_market_health.record_price(
                        symbol=normalized["symbol"],
                        price=normalized["price"],
                        source_timestamp=normalized[
                            "source_timestamp"
                        ],
                    )

                    # Broadcast the same real tick to connected
                    # frontend clients.
                    await live_market_broadcaster.broadcast(
                        {
                            "event": "market-price",
                            "symbol": normalized["symbol"],
                            "price": normalized["price"],
                            "currency": normalized.get(
                                "currency"
                            ),
                            "exchange": normalized.get(
                                "exchange"
                            ),
                            "mic_code": normalized.get(
                                "mic_code"
                            ),
                            "day_volume": normalized.get(
                                "day_volume"
                            ),
                            "source_timestamp": (
                                normalized[
                                    "source_timestamp"
                                ].isoformat()
                            ),
                            "received_at": (
                                live_market_health.snapshot()[
                                    "last_received_at"
                                ]
                            ),
                        }
                    )

                    logger.info(
                        "LIVE %s %.4f",
                        normalized["symbol"],
                        normalized["price"],
                    )

            except asyncio.CancelledError:
                live_market_health.mark_stopped()
                raise

            except Exception:
                live_market_health.mark_reconnect()

                logger.exception(
                    "Live market stream failed; reconnecting in %ss",
                    self._reconnect_delay,
                )

                try:
                    await asyncio.wait_for(
                        self._stop_event.wait(),
                        timeout=self._reconnect_delay,
                    )
                except asyncio.TimeoutError:
                    pass

            finally:
                await stream.close()

    async def stop(self) -> None:
        self._stop_event.set()
        live_market_health.mark_stopped()

    @staticmethod
    def _normalize(message: dict) -> dict:
        from datetime import datetime, timezone

        return {
            "symbol": message["symbol"],
            "exchange": message.get("exchange"),
            "currency": message.get("currency"),
            "mic_code": message.get("mic_code"),
            "price": float(message["price"]),
            "day_volume": float(
                message.get("day_volume", 0)
            ),
            "source_timestamp": datetime.fromtimestamp(
                int(message["timestamp"]),
                tz=timezone.utc,
            ),
        }
        