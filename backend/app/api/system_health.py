from __future__ import annotations

import time

from fastapi import APIRouter

from backend.app.db.postgres import (
    fetch_one,
    test_database_connection,
)
from backend.app.services.live_market_health import (
    live_market_health,
)


router = APIRouter(
    prefix="/api/system",
    tags=["system-health"],
)


def _status_from_condition(
    healthy: bool,
    degraded: bool = False,
) -> str:
    if healthy:
        return "HEALTHY"

    if degraded:
        return "WARNING"

    return "CRITICAL"


@router.get("/health")
async def system_health() -> dict:
    # ---------------------------------------------------------
    # PostgreSQL health + latency
    # ---------------------------------------------------------

    db_started = time.perf_counter()

    try:
        database_ok = await test_database_connection()

        await fetch_one(
            "SELECT 1"
        )

        db_latency_ms = round(
            (
                time.perf_counter()
                - db_started
            )
            * 1000,
            2,
        )
    except Exception as exc:
        database_ok = False
        db_latency_ms = None
        database_error = str(exc)
    else:
        database_error = None

    # ---------------------------------------------------------
    # Knowledge / embeddings
    # ---------------------------------------------------------

    try:
        knowledge_row = await fetch_one(
            """
            SELECT
                COUNT(*) AS total_chunks,
                COUNT(embedding) AS embedded_chunks
            FROM knowledge.document_chunks
            """
        )

        total_chunks = int(
            knowledge_row[0] or 0
        )

        embedded_chunks = int(
            knowledge_row[1] or 0
        )
    except Exception:
        total_chunks = 0
        embedded_chunks = 0

    embedding_coverage = (
        round(
            embedded_chunks
            / total_chunks
            * 100,
            2,
        )
        if total_chunks
        else 0.0
    )

    # ---------------------------------------------------------
    # Telemetry
    # ---------------------------------------------------------

    try:
        telemetry_row = await fetch_one(
            """
            SELECT COUNT(*)
            FROM warehouse.fct_telemetry_events
            """
        )

        telemetry_events = int(
            telemetry_row[0] or 0
        )
    except Exception:
        telemetry_events = 0

    # ---------------------------------------------------------
    # Live market feed
    # ---------------------------------------------------------

    market_health = (
        live_market_health.snapshot()
    )

    market_status = market_health.get(
        "status",
        "UNKNOWN",
    )

    market_age_seconds = market_health.get(
        "age_seconds"
    )

    market_reconnects = market_health.get(
        "reconnect_count",
        0,
    )

    market_healthy = (
        market_status == "HEALTHY"
        or market_status == "LIVE"
    )

    market_degraded = (
        market_status
        in {
            "DEGRADED",
            "STALE",
            "CONNECTING",
        }
    )

    # ---------------------------------------------------------
    # Overall state
    # ---------------------------------------------------------

    components = {
        "database": database_ok,
        "market": market_healthy,
        "knowledge_store": total_chunks > 0,
    }

    critical_count = sum(
        1
        for value in components.values()
        if not value
    )

    overall_status = (
        "HEALTHY"
        if critical_count == 0
        and not market_degraded
        else "WARNING"
        if database_ok
        else "CRITICAL"
    )

    return {
        "status": overall_status,
        "checked_at": time.time(),
        "components": {
            "api": {
                "status": "HEALTHY",
                "message": "NXUS API is responding",
            },
            "postgresql": {
                "status": (
                    "HEALTHY"
                    if database_ok
                    else "CRITICAL"
                ),
                "latency_ms": db_latency_ms,
                "error": database_error,
            },
            "market_feed": {
                "status": _status_from_condition(
                    market_healthy,
                    market_degraded,
                ),
                "feed_status": market_status,
                "age_seconds": market_age_seconds,
                "reconnect_count": market_reconnects,
            },
            "knowledge_store": {
                "status": (
                    "HEALTHY"
                    if total_chunks > 0
                    else "WARNING"
                ),
                "total_chunks": total_chunks,
                "embedded_chunks": embedded_chunks,
                "embedding_coverage_pct": embedding_coverage,
            },
            "telemetry": {
                "status": (
                    "HEALTHY"
                    if telemetry_events > 0
                    else "WARNING"
                ),
                "event_count": telemetry_events,
            },
        },
    }