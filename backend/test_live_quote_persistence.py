import asyncio

from backend.app.connectors.twelve_data_ws import TwelveDataWebSocket
from backend.app.services.live_quote_persistence import LiveQuotePersistence


async def main() -> None:
    stream = TwelveDataWebSocket(["AAPL"])
    persistence = LiveQuotePersistence()

    try:
        received = 0

        async for message in stream.stream():
            if message.get("event") != "price":
                continue

            timestamp = message["timestamp"]

            from datetime import datetime, timezone

            quote = {
                "symbol": message["symbol"],
                "exchange": message.get("exchange"),
                "currency": message.get("currency"),
                "mic_code": message.get("mic_code"),
                "price": float(message["price"]),
                "day_volume": float(message.get("day_volume", 0)),
                "source_timestamp": datetime.fromtimestamp(
                    int(timestamp),
                    tz=timezone.utc,
                ),
            }

            await persistence.upsert_quote(quote)

            print(
                f"Persisted LIVE {quote['symbol']} "
                f"${quote['price']:.2f} "
                f"{quote['source_timestamp']}"
            )

            received += 1

            if received >= 5:
                break

    finally:
        await stream.close()


if __name__ == "__main__":
    asyncio.set_event_loop_policy(
        asyncio.WindowsSelectorEventLoopPolicy()
    )
    asyncio.run(main())
