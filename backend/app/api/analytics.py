from __future__ import annotations

from fastapi import APIRouter

from backend.app.analytics.kpi_queries import (
    get_business_kpis,
)


router = APIRouter(
    prefix="/api/analytics",
    tags=["analytics"],
)


@router.get("/kpis")
async def get_kpis() -> dict:
    kpis = await get_business_kpis()

    return {
        "status": "OK",
        "count": len(kpis),
        "kpis": [
            kpi.to_dict()
            for kpi in kpis
        ],
    }