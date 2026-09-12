CREATE TABLE IF NOT EXISTS warehouse.live_market_ticks (
    tick_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES system.data_sources(source_id) ON DELETE CASCADE,

    symbol VARCHAR(32) NOT NULL,
    exchange VARCHAR(64),
    currency CHAR(3),
    mic_code VARCHAR(16),

    price NUMERIC(20,8) NOT NULL CHECK (price >= 0),
    day_volume NUMERIC(24,8) NOT NULL DEFAULT 0 CHECK (day_volume >= 0),

    source_timestamp TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),

    CONSTRAINT uq_live_market_tick
        UNIQUE (symbol, source_timestamp, price, received_at)
);

CREATE INDEX IF NOT EXISTS idx_live_market_ticks_symbol_time
    ON warehouse.live_market_ticks(symbol, source_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_live_market_ticks_received
    ON warehouse.live_market_ticks(received_at DESC);
