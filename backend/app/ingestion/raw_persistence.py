from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from typing import Any

from backend.app.db.postgres import fetch_one


def _json(value: Any) -> str:
    return json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        default=str,
    )


def _payload_hash(payload: dict[str, Any]) -> str:
    raw_json = _json(payload)

    return hashlib.sha256(
        raw_json.encode("utf-8")
    ).hexdigest()


async def persist_raw_record(
    *,
    run_id: str,
    source_id: str,
    entity_topic: str,
    source_record_id: str,
    source_timestamp: datetime,
    payload: dict[str, Any],
    schema_version: str = "1.0",
    validation_status: str = "PENDING",
    quarantine_reason: str | None = None,
) -> str:
    payload_hash = _payload_hash(payload)

    row = await fetch_one(
        """
        INSERT INTO raw.ingestion_events (
            run_id,
            source_id,
            entity_topic,
            source_record_id,
            source_timestamp,
            ingested_at,
            schema_version,
            payload_hash,
            raw_payload,
            validation_status,
            quarantine_reason
        )
        VALUES (
            %s,
            %s,
            %s,
            %s,
            %s,
            clock_timestamp(),
            %s,
            %s,
            %s::jsonb,
            %s,
            %s
        )
        RETURNING raw_id
        """,
        (
            run_id,
            source_id,
            entity_topic,
            source_record_id,
            source_timestamp.astimezone(timezone.utc),
            schema_version,
            payload_hash,
            _json(payload),
            validation_status,
            quarantine_reason,
        ),
    )

    if not row:
        raise RuntimeError(
            "Failed to persist raw ingestion record"
        )

    return str(row[0])


async def persist_raw_records(
    *,
    run_id: str,
    source_id: str,
    entity_topic: str,
    records: list[dict[str, Any]],
    timestamp_field: str | None = None,
    record_id_field: str | None = None,
    schema_version: str = "1.0",
) -> int:
    persisted_count = 0

    for index, record in enumerate(records):
        source_record_id = (
            str(record[record_id_field])
            if record_id_field
            and record.get(record_id_field) is not None
            else f"{entity_topic}:{index + 1}"
        )

        source_timestamp = _resolve_source_timestamp(
            record,
            timestamp_field,
        )

        await persist_raw_record(
            run_id=run_id,
            source_id=source_id,
            entity_topic=entity_topic,
            source_record_id=source_record_id,
            source_timestamp=source_timestamp,
            payload=record,
            schema_version=schema_version,
        )

        persisted_count += 1

    return persisted_count


def _resolve_source_timestamp(
    record: dict[str, Any],
    timestamp_field: str | None,
) -> datetime:
    if timestamp_field:
        raw_value = record.get(timestamp_field)

        if isinstance(raw_value, datetime):
            return _ensure_utc(raw_value)

        if isinstance(raw_value, str):
            text = raw_value.strip()

            try:
                parsed = datetime.fromisoformat(
                    text.replace("Z", "+00:00")
                )

                return _ensure_utc(parsed)

            except ValueError:
                pass

    return datetime.now(timezone.utc)


def _ensure_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(
            tzinfo=timezone.utc
        )

    return value.astimezone(timezone.utc)