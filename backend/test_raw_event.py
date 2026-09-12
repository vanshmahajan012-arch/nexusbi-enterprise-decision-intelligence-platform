from datetime import datetime, timezone
import json

from backend.app.ingestion.twelve_data_ingestion import build_raw_event


payload = {
    "symbol": "AAPL",
    "interval": "1min",
    "datetime": "2026-08-18 15:59:00",
    "open": "310.23999",
    "high": "310.48001",
    "low": "309.98999",
    "close": "310.20001",
    "volume": "1354785",
}

event = build_raw_event(
    source_id="twelve-data",
    run_id=None,
    symbol="AAPL",
    source_timestamp=datetime(2026, 8, 18, 15, 59, tzinfo=timezone.utc),
    payload=payload,
)

print(json.dumps(event, indent=2))
