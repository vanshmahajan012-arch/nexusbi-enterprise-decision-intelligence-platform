from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone


@dataclass
class LiveMarketHealth:
    status: str = "STOPPED"
    last_symbol: str | None = None
    last_price: float | None = None
    last_source_timestamp: datetime | None = None
    last_received_at: datetime | None = None
    reconnect_count: int = 0

    def mark_started(self) -> None:
        self.status = "STARTING"

    def mark_connected(self) -> None:
        self.status = "HEALTHY"

    def mark_disconnected(self) -> None:
        self.status = "DISCONNECTED"

    def mark_reconnect(self) -> None:
        self.reconnect_count += 1
        self.status = "RECONNECTING"

    def mark_stopped(self) -> None:
        self.status = "STOPPED"

    def record_price(
        self,
        *,
        symbol: str,
        price: float,
        source_timestamp: datetime,
    ) -> None:
        self.status = "HEALTHY"
        self.last_symbol = symbol
        self.last_price = price
        self.last_source_timestamp = source_timestamp
        self.last_received_at = datetime.now(timezone.utc)

    def snapshot(self) -> dict:
        now = datetime.now(timezone.utc)

        age_seconds = None

        if self.last_received_at is not None:
            age_seconds = (
                now - self.last_received_at
            ).total_seconds()

        return {
            "status": self.status,
            "last_symbol": self.last_symbol,
            "last_price": self.last_price,
            "last_source_timestamp": (
                self.last_source_timestamp.isoformat()
                if self.last_source_timestamp
                else None
            ),
            "last_received_at": (
                self.last_received_at.isoformat()
                if self.last_received_at
                else None
            ),
            "age_seconds": age_seconds,
            "reconnect_count": self.reconnect_count,
        }


live_market_health = LiveMarketHealth()