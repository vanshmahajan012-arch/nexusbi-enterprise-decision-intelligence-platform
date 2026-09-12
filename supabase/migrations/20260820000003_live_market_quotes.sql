CREATE TABLE IF NOT EXISTS warehouse.live_market_quotes (
    quote_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES system.data_sources(source_id) ON DELETE CASCADE,

    symbol VARCHAR(32) NOT NULL,
    exchange VARCHAR(64),
    currency CHAR(3),
    mic_code VARCHAR(16),

    price NUMERIC(20,8) NOT NULL CHECK (price >= 0),
    day_volume NUMERIC(24,8) NOT NULL DEFAULT 0 CHECK (day_volume >= 0),

    source_timestamp TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),

    CONSTRAINT uq_live_market_quote_symbol
        UNIQUE (symbol)
);

CREATE INDEX IF NOT EXISTS idx_live_market_quotes_updated
    ON warehouse.live_market_quotes(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_live_market_quotes_source_time
    ON warehouse.live_market_quotes(source_timestamp DESC);
