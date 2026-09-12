from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from backend.app.db.postgres import fetch_one


async def get_or_create_data_source(
    *,
    source_name: str,
    source_type: str,
    auth_type: str = "VAULT_SECRET",
    connection_metadata: dict[str, Any] | None = None,
) -> str:
    metadata = connection_metadata or {}

    existing = await fetch_one(
        """
        SELECT source_id
        FROM system.data_sources
        WHERE source_name = %s
        LIMIT 1
        """,
        (source_name,),
    )

    if existing:
        return str(existing[0])

    source_id = uuid4()

    row = await fetch_one(
        """
        INSERT INTO system.data_sources (
            source_id,
            source_name,
            source_type,
            auth_type,
            connection_metadata
        )
        VALUES (
            %s,
            %s,
            %s,
            %s,
            %s::jsonb
        )
        RETURNING source_id
        """,
        (
            source_id,
            source_name,
            source_type,
            auth_type,
            _json(metadata),
        ),
    )

    if not row:
        raise RuntimeError(
            "Failed to create data source"
        )

    return str(row[0])


async def get_or_create_connector(
    *,
    source_id: str,
    connector_name: str,
    sync_mode: str = "BATCH_SNAPSHOT",
    config_payload: dict[str, Any] | None = None,
) -> str:
    payload = config_payload or {}

    existing = await fetch_one(
        """
        SELECT connector_id
        FROM system.connectors
        WHERE source_id = %s
          AND connector_name = %s
        LIMIT 1
        """,
        (
            source_id,
            connector_name,
        ),
    )

    if existing:
        return str(existing[0])

    connector_id = uuid4()

    row = await fetch_one(
        """
        INSERT INTO system.connectors (
            connector_id,
            source_id,
            connector_name,
            sync_mode,
            config_payload,
            health_status
        )
        VALUES (
            %s,
            %s,
            %s,
            %s,
            %s::jsonb,
            'HEALTHY'
        )
        RETURNING connector_id
        """,
        (
            connector_id,
            source_id,
            connector_name,
            sync_mode,
            _json(payload),
        ),
    )

    if not row:
        raise RuntimeError(
            "Failed to create connector"
        )

    return str(row[0])


async def start_ingestion_run(
    *,
    connector_id: str,
    source_id: str,
    run_type: str = "MANUAL_TRIGGER",
) -> str:
    run_id = uuid4()

    row = await fetch_one(
        """
        INSERT INTO system.ingestion_runs (
            run_id,
            connector_id,
            source_id,
            run_type,
            status,
            started_at
        )
        VALUES (
            %s,
            %s,
            %s,
            %s,
            'RUNNING',
            clock_timestamp()
        )
        RETURNING run_id
        """,
        (
            run_id,
            connector_id,
            source_id,
            run_type,
        ),
    )

    if not row:
        raise RuntimeError(
            "Failed to create ingestion run"
        )

    return str(row[0])


async def update_ingestion_run(
    *,
    run_id: str,
    status: str,
    records_received: int | None = None,
    records_accepted: int | None = None,
    records_rejected: int | None = None,
    records_quarantined: int | None = None,
    bytes_processed: int | None = None,
    error_summary: str | None = None,
    error_details: dict[str, Any] | None = None,
) -> None:
    started = await fetch_one(
        """
        SELECT started_at
        FROM system.ingestion_runs
        WHERE run_id = %s
        """,
        (run_id,),
    )

    if not started:
        raise RuntimeError(
            f"Ingestion run not found: {run_id}"
        )

    started_at = started[0]

    if started_at is None:
        duration_ms = None
    else:
        duration = (
            datetime.now(timezone.utc) -
            started_at
        ).total_seconds()

        duration_ms = int(
            max(duration * 1000, 0)
        )

    await fetch_one(
        """
        UPDATE system.ingestion_runs
        SET
            status = %s,
            ended_at = clock_timestamp(),
            records_received = COALESCE(
                %s,
                records_received
            ),
            records_accepted = COALESCE(
                %s,
                records_accepted
            ),
            records_rejected = COALESCE(
                %s,
                records_rejected
            ),
            records_quarantined = COALESCE(
                %s,
                records_quarantined
            ),
            bytes_processed = COALESCE(
                %s,
                bytes_processed
            ),
            duration_ms = %s,
            error_summary = %s,
            error_details = COALESCE(
                %s::jsonb,
                error_details
            )
        WHERE run_id = %s
        RETURNING run_id
        """,
        (
            status,
            records_received,
            records_accepted,
            records_rejected,
            records_quarantined,
            bytes_processed,
            duration_ms,
            error_summary,
            _json(error_details)
            if error_details is not None
            else None,
            run_id,
        ),
    )


def _json(value: Any) -> str:
    import json

    return json.dumps(
        value,
        ensure_ascii=False,
        default=str,
    )