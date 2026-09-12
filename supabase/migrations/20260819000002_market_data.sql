CREATE TABLE IF NOT EXISTS warehouse.fct_market_ohlcv (
    market_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raw_id UUID REFERENCES raw.ingestion_events(raw_id) ON DELETE SET NULL,
    source_id UUID NOT NULL REFERENCES system.data_sources(source_id) ON DELETE CASCADE,

    symbol VARCHAR(32) NOT NULL,
    exchange VARCHAR(64),
    interval VARCHAR(16) NOT NULL,

    source_timestamp TIMESTAMPTZ NOT NULL,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),

    open_price NUMERIC(20,8) NOT NULL CHECK (open_price >= 0),
    high_price NUMERIC(20,8) NOT NULL CHECK (high_price >= 0),
    low_price NUMERIC(20,8) NOT NULL CHECK (low_price >= 0),
    close_price NUMERIC(20,8) NOT NULL CHECK (close_price >= 0),
    volume NUMERIC(24,8) NOT NULL CHECK (volume >= 0),

    currency CHAR(3),
    source_record_id VARCHAR(256),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),

    CONSTRAINT ck_market_ohlcv_price_range
        CHECK (
            high_price >= low_price
            AND open_price BETWEEN low_price AND high_price
            AND close_price BETWEEN low_price AND high_price
        ),

    CONSTRAINT uq_market_ohlcv_source_record
        UNIQUE (source_id, source_record_id)
);

CREATE INDEX IF NOT EXISTS idx_market_ohlcv_symbol_time
    ON warehouse.fct_market_ohlcv(symbol, source_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_market_ohlcv_source
    ON warehouse.fct_market_ohlcv(source_id, source_timestamp DESC);
