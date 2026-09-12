from __future__ import annotations

from fastapi import APIRouter

from backend.app.analytics.business_analysis_service import (
    get_business_insights,
)


router = APIRouter(
    prefix="/api/analytics",
    tags=["business-analysis"],
)


@router.get("/business-insights")
async def business_insights() -> dict:
    insights = await get_business_insights()

    return {
        "status": "OK",
        "count": len(insights),
        "insights": [
            insight.to_dict()
            for insight in insights
        ],
    }