from __future__ import annotations

from fastapi import APIRouter

from backend.app.decisions.decision_service import (
    get_decision_intelligence,
)


router = APIRouter(
    prefix="/api/decisions",
    tags=["decision-intelligence"],
)


@router.get("")
async def get_decisions() -> dict:
    return await get_decision_intelligence()