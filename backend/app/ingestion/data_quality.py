from __future__ import annotations

from decimal import Decimal, InvalidOperation
from typing import Any


def validate_ohlcv_payload(payload: dict[str, Any]) -> tuple[bool, list[str]]:
    errors: list[str] = []

    required_fields = {
        "symbol",
        "interval",
        "datetime",
        "open",
        "high",
        "low",
        "close",
        "volume",
    }

    missing = required_fields - payload.keys()

    if missing:
        errors.extend(
            f"missing field: {field}"
            for field in sorted(missing)
        )

    if errors:
        return False, errors

    numeric_fields = ("open", "high", "low", "close", "volume")

    values: dict[str, Decimal] = {}

    for field in numeric_fields:
        try:
            values[field] = Decimal(str(payload[field]))
        except (InvalidOperation, TypeError, ValueError):
            errors.append(f"invalid numeric value: {field}")

    if errors:
        return False, errors

    if values["volume"] < 0:
        errors.append("volume cannot be negative")

    if values["high"] < values["low"]:
        errors.append("high cannot be below low")

    if not (
        values["low"]
        <= values["open"]
        <= values["high"]
    ):
        errors.append("open is outside high/low range")

    if not (
        values["low"]
        <= values["close"]
        <= values["high"]
    ):
        errors.append("close is outside high/low range")

    if not payload.get("symbol"):
        errors.append("symbol cannot be empty")

    if not payload.get("datetime"):
        errors.append("datetime cannot be empty")

    return len(errors) == 0, errors
