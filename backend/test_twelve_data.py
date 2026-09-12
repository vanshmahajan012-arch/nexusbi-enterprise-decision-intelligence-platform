import asyncio

from backend.app.connectors.twelve_data import TwelveDataConnector


async def main() -> None:
    connector = TwelveDataConnector()

    try:
        data = await connector.test_connection()

        if "status" in data and data["status"] == "error":
            raise RuntimeError(data.get("message", "Twelve Data returned an API error"))

        print("Twelve Data connection: True")
        print("Symbol:", data.get("meta", {}).get("symbol"))
        print("Interval:", data.get("meta", {}).get("interval"))
        print("Values returned:", len(data.get("values", [])))

    finally:
        await connector.close()


if __name__ == "__main__":
    asyncio.run(main())
