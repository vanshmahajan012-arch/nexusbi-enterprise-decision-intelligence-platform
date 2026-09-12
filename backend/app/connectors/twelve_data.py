from __future__ import annotations

import httpx

from backend.app.core.settings import settings


TWELVE_DATA_BASE_URL = "https://api.twelvedata.com"


class TwelveDataConnector:
    def __init__(self) -> None:
        if not settings.twelve_data_api_key:
            raise RuntimeError("TWELVE_DATA_API_KEY is not configured")

        self._api_key = settings.twelve_data_api_key
        self._client = httpx.AsyncClient(
            base_url=TWELVE_DATA_BASE_URL,
            timeout=15.0,
        )

    async def test_connection(self) -> dict:
        response = await self._client.get(
            "/time_series",
            params={
                "symbol": "AAPL",
                "interval": "1min",
                "outputsize": 1,
                "apikey": self._api_key,
            },
        )

        response.raise_for_status()
        return response.json()

    async def close(self) -> None:
        await self._client.aclose()
