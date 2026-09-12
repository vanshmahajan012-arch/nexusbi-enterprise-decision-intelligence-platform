from __future__ import annotations

from fastapi import APIRouter

from backend.app.analytics.variance_service import (
    get_business_variances,
)


router = APIRouter(
    prefix="/api/analytics",
    tags=["variance"],
)


@router.get("/variance")
async def get_variance_analysis() -> dict:
    result = await get_business_variances()

    return {
        "status": "OK",
        **result,
    }