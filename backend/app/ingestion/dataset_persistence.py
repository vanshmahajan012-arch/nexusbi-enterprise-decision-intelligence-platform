from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4

from backend.app.db.postgres import fetch_one


def _json_default(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat()

    if isinstance(value, UUID):
        return str(value)

    raise TypeError(
        f"Object of type {type(value).__name__} "
        "is not JSON serializable"
    )


def _json(value: Any) -> str:
    return json.dumps(
        value,
        default=_json_default,
        ensure_ascii=False,
    )


async def create_dataset(
    *,
    dataset_name: str,
    dataset_key: str,
    source_type: str,
    file_name: str | None,
    file_size_bytes: int | None,
) -> str:
    dataset_id = uuid4()

    row = await fetch_one(
        """
        INSERT INTO system.datasets (
            dataset_id,
            dataset_name,
            dataset_key,
            source_type,
            file_name,
            file_size_bytes,
            status
        )
        VALUES (
            %s,
            %s,
            %s,
            %s,
            %s,
            %s,
            'INGESTED'
        )
        RETURNING dataset_id
        """,
        (
            dataset_id,
            dataset_name,
            dataset_key,
            source_type,
            file_name,
            file_size_bytes,
        ),
    )

    if not row:
        raise RuntimeError(
            "Failed to create dataset registry entry"
        )

    return str(row[0])


async def save_dataset_profile(
    *,
    dataset_id: str,
    run_id: str | None,
    profile: dict[str, Any],
) -> None:
    row_count = int(
        profile.get("row_count", 0)
    )

    column_count = int(
        profile.get("column_count", 0)
    )

    await fetch_one(
        """
        INSERT INTO staging.dataset_profiles (
            dataset_id,
            run_id,
            row_count,
            column_count,
            profile_payload
        )
        VALUES (
            %s,
            %s,
            %s,
            %s,
            %s::jsonb
        )
        RETURNING profile_id
        """,
        (
            dataset_id,
            run_id,
            row_count,
            column_count,
            _json(profile),
        ),
    )


async def save_dataset_quality(
    *,
    dataset_id: str,
    run_id: str | None,
    quality_report: dict[str, Any],
) -> None:
    row_count = int(
        quality_report.get("row_count", 0)
    )

    column_count = int(
        quality_report.get("column_count", 0)
    )

    duplicate_rows = int(
        quality_report.get(
            "duplicate_rows",
            0,
        )
    )

    missing_values = int(
        quality_report.get(
            "missing_values",
            0,
        )
    )

    quality_score = float(
        quality_report.get(
            "quality_score",
            0.0,
        )
    )

    issues = quality_report.get(
        "issues",
        [],
    )

    issue_count = len(issues)

    await fetch_one(
        """
        INSERT INTO staging.dataset_quality_reports (
            dataset_id,
            run_id,
            quality_score,
            row_count,
            column_count,
            duplicate_rows,
            missing_values,
            issue_count,
            report_payload
        )
        VALUES (
            %s,
            %s,
            %s,
            %s,
            %s,
            %s,
            %s,
            %s,
            %s::jsonb
        )
        RETURNING quality_report_id
        """,
        (
            dataset_id,
            run_id,
            quality_score,
            row_count,
            column_count,
            duplicate_rows,
            missing_values,
            issue_count,
            _json(quality_report),
        ),
    )


async def update_dataset_profile_state(
    *,
    dataset_id: str,
    profile: dict[str, Any],
    quality_report: dict[str, Any],
    status: str = "READY",
) -> None:
    row_count = int(
        profile.get("row_count", 0)
    )

    column_count = int(
        profile.get("column_count", 0)
    )

    quality_score = float(
        quality_report.get(
            "quality_score",
            0.0,
        )
    )

    await fetch_one(
        """
        UPDATE system.datasets
        SET
            row_count = %s,
            column_count = %s,
            schema_profile = %s::jsonb,
            quality_report = %s::jsonb,
            quality_score = %s,
            status = %s,
            updated_at = clock_timestamp()
        WHERE dataset_id = %s
        RETURNING dataset_id
        """,
        (
            row_count,
            column_count,
            _json(profile),
            _json(quality_report),
            quality_score,
            status,
            dataset_id,
        ),
    )