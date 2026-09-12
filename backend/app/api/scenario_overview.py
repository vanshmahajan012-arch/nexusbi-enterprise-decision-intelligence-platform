from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from backend.app.scenarios.scenario_overview_service import (
    get_scenario_overview,
)


router = APIRouter(
    prefix="/api/scenarios",
    tags=["scenario-overview"],
)


@router.get("/overview")
async def scenario_overview(
    changes: str = Query(
        default="-20,-10,0,10,20",
    ),
    driver_limit: int = Query(
        default=5,
        ge=1,
        le=20,
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

        return await get_scenario_overview(
            changes=change_values,
            driver_limit=driver_limit,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc