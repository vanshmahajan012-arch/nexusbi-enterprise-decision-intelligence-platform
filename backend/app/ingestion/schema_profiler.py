from __future__ import annotations

from dataclasses import dataclass, asdict
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Iterable

import math


@dataclass
class ColumnProfile:
    name: str
    inferred_type: str
    row_count: int
    null_count: int
    null_percent: float
    unique_count: int
    unique_percent: float

    min_value: Any | None = None
    max_value: Any | None = None
    sample_values: list[Any] | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def _is_null(value: Any) -> bool:
    if value is None:
        return True

    if isinstance(value, float) and math.isnan(value):
        return True

    if isinstance(value, str):
        return value.strip().lower() in {
            "",
            "null",
            "none",
            "nan",
            "na",
            "n/a",
        }

    return False


def _try_parse_number(value: Any) -> float | None:
    if _is_null(value):
        return None

    if isinstance(value, bool):
        return None

    if isinstance(value, (int, float, Decimal)):
        return float(value)

    if isinstance(value, str):
        cleaned = value.strip().replace(",", "")

        try:
            return float(cleaned)
        except ValueError:
            return None

    return None


def _try_parse_datetime(value: Any) -> datetime | date | None:
    if _is_null(value):
        return None

    if isinstance(value, datetime):
        return value

    if isinstance(value, date):
        return value

    if isinstance(value, str):
        text = value.strip()

        formats = (
            "%Y-%m-%d",
            "%Y/%m/%d",
            "%d-%m-%Y",
            "%d/%m/%Y",
            "%Y-%m-%d %H:%M:%S",
            "%Y/%m/%d %H:%M:%S",
            "%d-%m-%Y %H:%M:%S",
            "%d/%m/%Y %H:%M:%S",
            "%Y-%m-%dT%H:%M:%S",
        )

        for fmt in formats:
            try:
                return datetime.strptime(text, fmt)
            except ValueError:
                continue

    return None


def _infer_type(values: list[Any]) -> str:
    non_null_values = [
        value
        for value in values
        if not _is_null(value)
    ]

    if not non_null_values:
        return "unknown"

    if all(isinstance(value, bool) for value in non_null_values):
        return "boolean"

    numeric_successes = sum(
        _try_parse_number(value) is not None
        for value in non_null_values
    )

    if numeric_successes == len(non_null_values):
        return "numeric"

    datetime_successes = sum(
        _try_parse_datetime(value) is not None
        for value in non_null_values
    )

    if datetime_successes == len(non_null_values):
        return "datetime"

    return "text"


def _normalise_for_unique(value: Any) -> Any:
    if _is_null(value):
        return None

    if isinstance(value, str):
        return value.strip()

    return value


def _serialise_value(value: Any) -> Any:
    if isinstance(value, (datetime, date)):
        return value.isoformat()

    if isinstance(value, Decimal):
        return float(value)

    return value


def profile_column(
    name: str,
    values: Iterable[Any],
    sample_size: int = 5,
) -> ColumnProfile:
    values_list = list(values)

    row_count = len(values_list)

    null_count = sum(
        _is_null(value)
        for value in values_list
    )

    non_null_values = [
        value
        for value in values_list
        if not _is_null(value)
    ]

    unique_values = {
        _normalise_for_unique(value)
        for value in non_null_values
    }

    unique_count = len(unique_values)

    unique_percent = (
        (unique_count / len(non_null_values)) * 100
        if non_null_values
        else 0.0
    )

    null_percent = (
        (null_count / row_count) * 100
        if row_count
        else 0.0
    )

    inferred_type = _infer_type(values_list)

    min_value = None
    max_value = None

    if non_null_values:
        if inferred_type == "numeric":
            numeric_values = [
                _try_parse_number(value)
                for value in non_null_values
            ]

            numeric_values = [
                value
                for value in numeric_values
                if value is not None
            ]

            if numeric_values:
                min_value = min(numeric_values)
                max_value = max(numeric_values)

        elif inferred_type == "datetime":
            parsed_values = [
                _try_parse_datetime(value)
                for value in non_null_values
            ]

            parsed_values = [
                value
                for value in parsed_values
                if value is not None
            ]

            if parsed_values:
                min_value = min(parsed_values)
                max_value = max(parsed_values)

        elif inferred_type == "text":
            text_values = [
                str(value).strip()
                for value in non_null_values
            ]

            if text_values:
                min_value = min(text_values)
                max_value = max(text_values)

    sample_values = [
        _serialise_value(value)
        for value in non_null_values[:sample_size]
    ]

    return ColumnProfile(
        name=name,
        inferred_type=inferred_type,
        row_count=row_count,
        null_count=null_count,
        null_percent=round(null_percent, 4),
        unique_count=unique_count,
        unique_percent=round(unique_percent, 4),
        min_value=_serialise_value(min_value),
        max_value=_serialise_value(max_value),
        sample_values=sample_values,
    )


def profile_records(
    records: list[dict[str, Any]],
    sample_size: int = 5,
) -> dict[str, Any]:
    if not records:
        return {
            "row_count": 0,
            "column_count": 0,
            "columns": [],
        }

    column_names: list[str] = []

    seen_columns: set[str] = set()

    for record in records:
        for key in record.keys():
            if key not in seen_columns:
                seen_columns.add(key)
                column_names.append(key)

    columns: list[ColumnProfile] = []

    for column_name in column_names:
        values = [
            record.get(column_name)
            for record in records
        ]

        columns.append(
            profile_column(
                column_name,
                values,
                sample_size=sample_size,
            )
        )

    return {
        "row_count": len(records),
        "column_count": len(column_names),
        "columns": [
            column.to_dict()
            for column in columns
        ],
    }