import asyncio
import json

from backend.app.connectors.twelve_data import TwelveDataConnector


async def main() -> None:
    connector = TwelveDataConnector()

    try:
        data = await connector.test_connection()
        print(json.dumps(data, indent=2))

    finally:
        await connector.close()


if __name__ == "__main__":
    asyncio.run(main())
