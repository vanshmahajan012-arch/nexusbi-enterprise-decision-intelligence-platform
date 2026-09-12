from __future__ import annotations

import asyncio

from backend.app.services.live_market_worker import LiveMarketWorker


class LiveMarketRuntime:
    def __init__(self, symbols: list[str]) -> None:
        self.worker = LiveMarketWorker(symbols)
        self._task: asyncio.Task | None = None

    async def start(self) -> None:
        if self._task is not None and not self._task.done():
            return

        self._task = asyncio.create_task(
            self.worker.run(),
            name="nxus-live-market-worker",
        )

    async def stop(self) -> None:
        if self._task is None:
            return

        await self.worker.stop()

        try:
            await self._task
        except asyncio.CancelledError:
            pass
        finally:
            self._task = None


live_market_runtime = LiveMarketRuntime(["AAPL"])
