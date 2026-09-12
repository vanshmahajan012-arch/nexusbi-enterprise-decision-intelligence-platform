from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from backend.app.scenarios.scenario_service import (
    compare_driver_scenarios,
    simulate_driver_change,
)


router = APIRouter(
    prefix="/api/scenarios",
    tags=["scenarios"],
)


@router.get("/driver")
async def simulate_driver(
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
        return await simulate_driver_change(
            target=target,
            change_pct=change_pct,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        ) from exc


@router.get("/driver/compare")
async def compare_driver(
    target: str = Query(
        min_length=1,
        max_length=100,
    ),
    changes: str = Query(
        default="-20,-10,0,10,20",
    ),
) -> dict:
    try:
        change_values = [
            float(value.strip())
            for value in changes.split(",")
            if value.strip()
        ]

        if not change_values:
            raise ValueError(
                "At least one scenario change is required."
            )

        if any(
            value < -100 or value > 500
            for value in change_values
        ):
            raise ValueError(
                "Each scenario change must be between "
                "-100% and +500%."
            )

        return await compare_driver_scenarios(
            target=target,
            changes=change_values,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc