from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from backend.app.scenarios.scenario_decision_service import (
    evaluate_scenario_decision,
)


router = APIRouter(
    prefix="/api/scenarios",
    tags=["scenario-decisions"],
)


@router.get("/decision")
async def evaluate_decision(
    target: str = Query(
        min_length=1,
        max_length=100,
    ),
    change_pct: float = Query(
        default=10.0,
        ge=-100.0,
        le=500.0,
    ),
) -> dict:
    try:
        return await evaluate_scenario_decision(
            target=target,
            change_pct=change_pct,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        ) from exc