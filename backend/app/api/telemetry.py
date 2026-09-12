from __future__ import annotations

from fastapi import APIRouter, Query

from backend.app.db.postgres import fetch_all


router = APIRouter(
    prefix="/api/telemetry",
    tags=["telemetry"],
)


@router.get("/recent")
async def get_recent_telemetry(
    limit: int = Query(
        default=50,
        ge=1,
        le=200,
    ),
) -> dict:
    rows = await fetch_all(
        """
        SELECT
            event_id,
            event_timestamp,
            event_type,
            service_name,
            region_code,
            status_code,
            latency_ms,
            error_code
        FROM warehouse.fct_telemetry_events
        ORDER BY
            event_timestamp DESC
        LIMIT %s
        """,
        (limit,),
    )

    events = []

    for row in rows:
        (
            event_id,
            event_timestamp,
            event_type,
            service_name,
            region_code,
            status_code,
            latency_ms,
            error_code,
        ) = row

        status = (
            "WARNING"
            if (
                error_code is not None
                or status_code is not None
                and status_code >= 400
                or float(latency_ms or 0) > 250
            )
            else "SUCCESS"
        )

        events.append(
            {
                "id": str(event_id),
                "timestamp": (
                    event_timestamp.isoformat()
                    if event_timestamp
                    else None
                ),
                "source": service_name or "telemetry",
                "eventType": event_type or "event",
                "entityId": str(event_id),
                "amountUsd": None,
                "status": status,
                "latencyMs": float(
                    latency_ms or 0
                ),
                "details": (
                    error_code
                    or (
                        f"HTTP {status_code}"
                        if status_code
                        else "Telemetry event"
                    )
                ),
                "region": region_code or "unknown",
            }
        )

    return {
        "status": "OK",
        "count": len(events),
        "events": events,
    }