from __future__ import annotations

from fastapi import APIRouter

from backend.app.analytics.root_cause_service import (
    get_root_cause_analysis,
)


router = APIRouter(
    prefix="/api/analytics",
    tags=["root-cause"],
)


@router.get("/root-cause")
async def get_root_cause() -> dict:
    return await get_root_cause_analysis()