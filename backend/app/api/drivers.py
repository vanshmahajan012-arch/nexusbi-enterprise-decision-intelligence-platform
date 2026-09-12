from __future__ import annotations

from fastapi import APIRouter

from backend.app.analytics.driver_service import (
    get_driver_analysis,
)


router = APIRouter(
    prefix="/api/analytics",
    tags=["drivers"],
)


@router.get("/drivers")
async def get_drivers() -> dict:
    result = await get_driver_analysis()

    return {
        "status": "OK",
        **result,
    }