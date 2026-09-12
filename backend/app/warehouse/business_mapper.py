from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any


@dataclass
class NormalizedOrder:
    order_code: str
    order_timestamp: datetime
    source_customer_key: str
    region: str
    product_name: str
    revenue: float
    quantity: int

    currency: str = "USD"
    order_status: str = "COMPLETED"
    platform_code: str = "UNKNOWN"
    device_category: str = "UNKNOWN"
    timezone: str = "UTC"

    sku: str | None = None
    category: str = "UNKNOWN"
    pricing_tier: str = "UNKNOWN"

    unit_cost: float = 0.0
    unit_price: float = 0.0


def _to_float(value: Any, default: float = 0.0) -> float:
    if value is None:
        return default

    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _to_int(value: Any, default: int = 0) -> int:
    if value is None:
        return default

    try:
        return int(float(value))
    except (TypeError, ValueError):
        return default


def _parse_timestamp(value: Any) -> datetime:
    if isinstance(value, datetime):
        parsed = value
    elif isinstance(value, str):
        text = value.strip()

        try:
            parsed = datetime.fromisoformat(
                text.replace("Z", "+00:00")
            )
        except ValueError:
            try:
                parsed = datetime.strptime(
                    text,
                    "%Y-%m-%d",
                )
            except ValueError:
                return datetime.now(timezone.utc)
    else:
        return datetime.now(timezone.utc)

    if parsed.tzinfo is None:
        parsed = parsed.replace(
            tzinfo=timezone.utc
        )

    return parsed.astimezone(timezone.utc)


def map_sales_record(
    record: dict[str, Any],
) -> NormalizedOrder:
    order_code = str(
        record.get(
            "order_id",
            "",
        )
    ).strip()

    if not order_code:
        raise ValueError(
            "Business sales record is missing order_id"
        )

    customer_key = str(
        record.get(
            "customer_id",
            "",
        )
    ).strip()

    if not customer_key:
        raise ValueError(
            f"Order {order_code} is missing customer_id"
        )

    region = str(
        record.get(
            "region",
            "UNKNOWN",
        )
    ).strip() or "UNKNOWN"

    product_name = str(
        record.get(
            "product",
            "UNKNOWN",
        )
    ).strip() or "UNKNOWN"

    revenue = _to_float(
        record.get("revenue"),
        default=0.0,
    )

    quantity = _to_int(
        record.get("quantity"),
        default=0,
    )

    if quantity < 0:
        raise ValueError(
            f"Order {order_code} has negative quantity"
        )

    return NormalizedOrder(
        order_code=order_code,
        order_timestamp=_parse_timestamp(
            record.get("order_date")
        ),
        source_customer_key=customer_key,
        region=region,
        product_name=product_name,
        revenue=revenue,
        quantity=quantity,
    )


def map_sales_records(
    records: list[dict[str, Any]],
) -> list[NormalizedOrder]:
    normalized: list[NormalizedOrder] = []

    for record in records:
        normalized.append(
            map_sales_record(record)
        )

    return normalized