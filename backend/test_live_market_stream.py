import asyncio

from backend.app.services.live_market_stream import LiveMarketStreamService


async def main() -> None:
    service = LiveMarketStreamService(["AAPL"])

    try:
        received = 0

        async for message in service.client.stream():
            if message.get("event") != "price":
                continue

            normalized = service._normalize_price_event(message)

            print(
                f"LIVE {normalized['symbol']} "
                f"${normalized['price']:.2f} "
                f"{normalized['currency']} "
                f"{normalized['source_timestamp']}"
            )

            received += 1

            if received >= 5:
                break

    finally:
        await service.stop()


if __name__ == "__main__":
    asyncio.run(main())
