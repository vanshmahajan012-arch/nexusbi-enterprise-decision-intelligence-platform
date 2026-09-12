from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Any

from backend.app.ingestion.schema_profiler import (
    _is_null,
    _try_parse_datetime,
    _try_parse_number,
)


@dataclass
class DataQualityIssue:
    issue_type: str
    severity: str
    column: str | None
    message: str
    affected_rows: int

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class DataQualityReport:
    row_count: int
    column_count: int
    duplicate_rows: int
    missing_values: int
    issues: list[DataQualityIssue]
    quality_score: float

    def to_dict(self) -> dict[str, Any]:
        return {
            "row_count": self.row_count,
            "column_count": self.column_count,
            "duplicate_rows": self.duplicate_rows,
            "missing_values": self.missing_values,
            "quality_score": self.quality_score,
            "issues": [
                issue.to_dict()
                for issue in self.issues
            ],
        }


def _normalise_for_duplicate(record: dict[str, Any]) -> tuple:
    return tuple(
        (key, str(record.get(key)).strip())
        for key in sorted(record.keys())
    )


def _detect_duplicates(
    records: list[dict[str, Any]],
) -> int:
    seen: set[tuple] = set()
    duplicates = 0

    for record in records:
        fingerprint = _normalise_for_duplicate(record)

        if fingerprint in seen:
            duplicates += 1
        else:
            seen.add(fingerprint)

    return duplicates


def _detect_missing_values(
    records: list[dict[str, Any]],
) -> tuple[int, dict[str, int]]:
    total_missing = 0
    missing_by_column: dict[str, int] = {}

    for record in records:
        for column, value in record.items():
            if _is_null(value):
                total_missing += 1
                missing_by_column[column] = (
                    missing_by_column.get(column, 0) + 1
                )

    return total_missing, missing_by_column


def _detect_column_inconsistencies(
    records: list[dict[str, Any]],
) -> list[DataQualityIssue]:
    issues: list[DataQualityIssue] = []

    columns: set[str] = set()

    for record in records:
        columns.update(record.keys())

    for column in sorted(columns):
        values = [
            record.get(column)
            for record in records
            if not _is_null(record.get(column))
        ]

        if not values:
            continue

        numeric_count = sum(
            _try_parse_number(value) is not None
            for value in values
        )

        datetime_count = sum(
            _try_parse_datetime(value) is not None
            for value in values
        )

        total = len(values)

        if (
            numeric_count > 0
            and numeric_count < total
        ):
            issues.append(
                DataQualityIssue(
                    issue_type="TYPE_INCONSISTENCY",
                    severity="MEDIUM",
                    column=column,
                    message=(
                        "Column contains a mixture of "
                        "numeric and non-numeric values"
                    ),
                    affected_rows=total - numeric_count,
                )
            )

        elif (
            datetime_count > 0
            and datetime_count < total
            and numeric_count == 0
        ):
            issues.append(
                DataQualityIssue(
                    issue_type="TYPE_INCONSISTENCY",
                    severity="MEDIUM",
                    column=column,
                    message=(
                        "Column contains a mixture of "
                        "datetime and non-datetime values"
                    ),
                    affected_rows=total - datetime_count,
                )
            )

    return issues


def _detect_numeric_anomalies(
    records: list[dict[str, Any]],
) -> list[DataQualityIssue]:
    issues: list[DataQualityIssue] = []

    columns: set[str] = set()

    for record in records:
        columns.update(record.keys())

    for column in sorted(columns):
        numeric_values: list[float] = []

        for record in records:
            value = record.get(column)

            parsed = _try_parse_number(value)

            if parsed is not None:
                numeric_values.append(parsed)

        if len(numeric_values) < 4:
            continue

        mean = sum(numeric_values) / len(numeric_values)

        variance = sum(
            (value - mean) ** 2
            for value in numeric_values
        ) / len(numeric_values)

        std_dev = variance**0.5

        if std_dev == 0:
            continue

        anomaly_count = sum(
            abs(value - mean) > (3 * std_dev)
            for value in numeric_values
        )

        if anomaly_count > 0:
            issues.append(
                DataQualityIssue(
                    issue_type="NUMERIC_OUTLIER",
                    severity="LOW",
                    column=column,
                    message=(
                        "Potential extreme values detected "
                        "using a 3-sigma rule"
                    ),
                    affected_rows=anomaly_count,
                )
            )

    return issues


def calculate_data_quality(
    records: list[dict[str, Any]],
) -> DataQualityReport:
    if not records:
        return DataQualityReport(
            row_count=0,
            column_count=0,
            duplicate_rows=0,
            missing_values=0,
            issues=[],
            quality_score=0.0,
        )

    columns: set[str] = set()

    for record in records:
        columns.update(record.keys())

    row_count = len(records)
    column_count = len(columns)

    duplicate_rows = _detect_duplicates(records)

    missing_values, missing_by_column = (
        _detect_missing_values(records)
    )

    issues: list[DataQualityIssue] = []

    # ---------------------------------------------------------
    # Missing value issues
    # ---------------------------------------------------------

    for column, affected_rows in sorted(
        missing_by_column.items()
    ):
        percentage = (
            affected_rows / row_count
        ) * 100

        severity = (
            "HIGH"
            if percentage >= 30
            else "MEDIUM"
            if percentage >= 10
            else "LOW"
        )

        issues.append(
            DataQualityIssue(
                issue_type="MISSING_VALUES",
                severity=severity,
                column=column,
                message=(
                    f"{percentage:.2f}% of rows "
                    "contain missing values"
                ),
                affected_rows=affected_rows,
            )
        )

    # ---------------------------------------------------------
    # Duplicate rows
    # ---------------------------------------------------------

    if duplicate_rows > 0:
        severity = (
            "HIGH"
            if duplicate_rows / row_count >= 0.05
            else "MEDIUM"
        )

        issues.append(
            DataQualityIssue(
                issue_type="DUPLICATE_ROWS",
                severity=severity,
                column=None,
                message=(
                    f"{duplicate_rows} duplicate rows detected"
                ),
                affected_rows=duplicate_rows,
            )
        )

    # ---------------------------------------------------------
    # Type consistency
    # ---------------------------------------------------------

    issues.extend(
        _detect_column_inconsistencies(records)
    )

    # ---------------------------------------------------------
    # Numeric outliers
    # ---------------------------------------------------------

    issues.extend(
        _detect_numeric_anomalies(records)
    )

    # ---------------------------------------------------------
    # Quality score
    # ---------------------------------------------------------

    total_cells = row_count * max(column_count, 1)

    missing_penalty = (
        (missing_values / total_cells) * 40
        if total_cells
        else 0
    )

    duplicate_penalty = (
        (duplicate_rows / row_count) * 25
        if row_count
        else 0
    )

    issue_penalty = min(
        len(issues) * 3,
        25,
    )

    quality_score = max(
        0.0,
        min(
            100.0,
            100.0
            - missing_penalty
            - duplicate_penalty
            - issue_penalty,
        ),
    )

    return DataQualityReport(
        row_count=row_count,
        column_count=column_count,
        duplicate_rows=duplicate_rows,
        missing_values=missing_values,
        issues=issues,
        quality_score=round(
            quality_score,
            2,
        ),
    )