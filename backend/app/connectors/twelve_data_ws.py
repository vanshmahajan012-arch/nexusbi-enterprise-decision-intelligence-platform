from __future__ import annotations

import asyncio
import json
from typing import AsyncIterator

import websockets
from websockets.asyncio.client import ClientConnection

from backend.app.core.settings import settings


TWELVE_DATA_WS_URL = "wss://ws.twelvedata.com/v1/quotes/price"


class TwelveDataWebSocket:
    def __init__(self, symbols: list[str]) -> None:
        if not settings.twelve_data_api_key:
            raise RuntimeError("TWELVE_DATA_API_KEY is not configured")

        if not symbols:
            raise ValueError("At least one symbol is required")

        self.symbols = symbols
        self._socket: ClientConnection | None = None
        self._heartbeat_task: asyncio.Task | None = None
        self._stopped = False

    async def connect(self) -> None:
        self._stopped = False

        url = (
            f"{TWELVE_DATA_WS_URL}"
            f"?apikey={settings.twelve_data_api_key}"
        )

        self._socket = await websockets.connect(
            url,
            ping_interval=20,
            ping_timeout=20,
            close_timeout=10,
        )

        await self._socket.send(
            json.dumps(
                {
                    "action": "subscribe",
                    "params": {
                        "symbols": ",".join(self.symbols),
                    },
                }
            )
        )

        self._heartbeat_task = asyncio.create_task(
            self._heartbeat_loop(),
            name="twelve-data-heartbeat",
        )

    async def _heartbeat_loop(self) -> None:
        while not self._stopped and self._socket is not None:
            try:
                await asyncio.sleep(10)

                if self._socket is not None:
                    await self._socket.send(
                        json.dumps({"action": "heartbeat"})
                    )

            except asyncio.CancelledError:
                break

            except Exception:
                break

    async def stream(self) -> AsyncIterator[dict]:
        if self._socket is None:
            await self.connect()

        if self._socket is None:
            raise RuntimeError("WebSocket connection was not established")

        try:
            async for message in self._socket:
                if isinstance(message, bytes):
                    message = message.decode("utf-8")

                data = json.loads(message)
                yield data

        except websockets.exceptions.ConnectionClosed:
            # Let the worker handle reconnecting.
            return

        finally:
            await self.close()

    async def close(self) -> None:
        self._stopped = True

        if self._heartbeat_task is not None:
            self._heartbeat_task.cancel()

            await asyncio.gather(
                self._heartbeat_task,
                return_exceptions=True,
            )

            self._heartbeat_task = None

        if self._socket is not None:
            try:
                await self._socket.close()
            finally:
                self._socket = None