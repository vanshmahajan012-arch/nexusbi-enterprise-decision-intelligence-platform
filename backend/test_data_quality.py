from backend.app.connectors.twelve_data import TwelveDataConnector
from backend.app.ingestion.data_quality import validate_ohlcv_payload
import asyncio


async def main() -> None:
    connector = TwelveDataConnector()

    try:
        response = await connector.test_connection()

        meta = response.get("meta", {})
        values = response.get("values", [])

        if not values:
            raise RuntimeError("No Twelve Data observation returned")

        observation = values[0]

        payload = {
            "symbol": meta.get("symbol"),
            "interval": meta.get("interval"),
            "datetime": observation.get("datetime"),
            "open": observation.get("open"),
            "high": observation.get("high"),
            "low": observation.get("low"),
            "close": observation.get("close"),
            "volume": observation.get("volume"),
        }

        valid, errors = validate_ohlcv_payload(payload)

        print("Validation passed:", valid)

        if errors:
            print("Validation errors:")
            for error in errors:
                print("-", error)

    finally:
        await connector.close()


if __name__ == "__main__":
    asyncio.run(main())
