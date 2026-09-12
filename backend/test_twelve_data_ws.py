import asyncio
import json

from backend.app.connectors.twelve_data_ws import TwelveDataWebSocket


async def main() -> None:
    client = TwelveDataWebSocket(["AAPL"])

    try:
        count = 0

        async for message in client.stream():
            print(json.dumps(message, indent=2))

            count += 1

            if count >= 5:
                break

    finally:
        await client.close()


if __name__ == "__main__":
    asyncio.run(main())
