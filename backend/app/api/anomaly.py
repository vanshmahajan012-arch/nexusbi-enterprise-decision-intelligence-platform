from __future__ import annotations

from fastapi import APIRouter, Query

from backend.app.analytics.anomaly_service import (
    get_real_anomaly_analysis,
)


router = APIRouter(
    prefix="/api/analytics",
    tags=["anomaly"],
)


@router.get("/anomalies")
async def get_anomalies(
    z_threshold: float = Query(
        default=2.0,
        ge=0.5,
        le=5.0,
    ),
) -> dict:
    result = await get_real_anomaly_analysis(
        z_threshold=z_threshold,
    )

    return {
        **result,
        "z_threshold": z_threshold,
    }