from __future__ import annotations

import asyncio
import logging
from collections.abc import Iterable

from fastapi import WebSocket


logger = logging.getLogger("nxus.live_market_broadcaster")


class LiveMarketBroadcaster:
    def __init__(self) -> None:
        self._clients: set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()

        async with self._lock:
            self._clients.add(websocket)

        logger.info(
            "Frontend live client connected. clients=%d",
            len(self._clients),
        )

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self._lock:
            self._clients.discard(websocket)

        logger.info(
            "Frontend live client disconnected. clients=%d",
            len(self._clients),
        )

    async def broadcast(self, payload: dict) -> None:
        async with self._lock:
            clients: Iterable[WebSocket] = tuple(self._clients)

        if not clients:
            return

        dead_clients: list[WebSocket] = []

        for websocket in clients:
            try:
                await websocket.send_json(payload)
            except Exception:
                dead_clients.append(websocket)

        if dead_clients:
            async with self._lock:
                for websocket in dead_clients:
                    self._clients.discard(websocket)


live_market_broadcaster = LiveMarketBroadcaster()