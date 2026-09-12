from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from typing import Any


def build_raw_event(
    *,
    source_id: str,
    run_id: str | None,
    symbol: str,
    source_timestamp: datetime,
    payload: dict[str, Any],
    schema_version: str = "1.0",
) -> dict[str, Any]:
    raw_json = json.dumps(
        payload,
        sort_keys=True,
        separators=(",", ":"),
    )

    payload_hash = hashlib.sha256(raw_json.encode("utf-8")).hexdigest()

    return {
        "run_id": run_id,
        "source_id": source_id,
        "entity_topic": f"market.ohlcv.{symbol}",
        "source_record_id": f"{symbol}:{source_timestamp.isoformat()}",
        "source_timestamp": source_timestamp.astimezone(timezone.utc).isoformat(),
        "ingested_at": datetime.now(timezone.utc).isoformat(),
        "schema_version": schema_version,
        "payload_hash": payload_hash,
        "raw_payload": payload,
        "validation_status": "PENDING",
        "quarantine_reason": None,
    }
