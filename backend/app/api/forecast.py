from __future__ import annotations

from fastapi import APIRouter

from backend.app.analytics.forecast_service import (
    get_business_forecasts,
)


router = APIRouter(
    prefix="/api/analytics",
    tags=["forecast"],
)


@router.get("/forecasts")
async def get_forecasts() -> dict:
    return await get_business_forecasts()