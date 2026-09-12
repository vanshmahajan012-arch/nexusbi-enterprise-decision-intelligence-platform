import asyncio
import logging

from backend.app.services.live_market_worker import LiveMarketWorker


async def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(message)s",
    )

    worker = LiveMarketWorker(["AAPL"])

    task = asyncio.create_task(worker.run())

    try:
        await asyncio.sleep(10)
    finally:
        await worker.stop()
        await asyncio.wait_for(task, timeout=15)


if __name__ == "__main__":
    asyncio.set_event_loop_policy(
        asyncio.WindowsSelectorEventLoopPolicy()
    )
    asyncio.run(main())
