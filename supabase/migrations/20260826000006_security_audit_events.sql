-- =========================================================
-- NXUS BI SECURITY / USER ACTIVITY EVENTS
-- =========================================================

CREATE TABLE IF NOT EXISTS audit.security_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NULL,
    event_type VARCHAR(64) NOT NULL,

    mode VARCHAR(16) NOT NULL DEFAULT 'FULL',
    -- FULL | DEMO

    severity VARCHAR(16) NOT NULL DEFAULT 'INFO',
    -- INFO | WARNING | HIGH | CRITICAL

    email VARCHAR(320) NULL,

    request_ip VARCHAR(64) NULL,
    user_agent TEXT NULL,

    endpoint VARCHAR(512) NULL,
    method VARCHAR(16) NULL,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    immutable_hash CHAR(64) NULL,

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_security_events_created_at
    ON audit.security_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_events_user
    ON audit.security_events(user_id);

CREATE INDEX IF NOT EXISTS idx_security_events_type
    ON audit.security_events(event_type);

CREATE INDEX IF NOT EXISTS idx_security_events_severity
    ON audit.security_events(severity);

CREATE INDEX IF NOT EXISTS idx_security_events_ip
    ON audit.security_events(request_ip);

ALTER TABLE audit.security_events
ENABLE ROW LEVEL SECURITY;

-- Users can only read their own security-event records.
CREATE POLICY "Users can read own security events"
ON audit.security_events
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
);

-- Client applications are NOT allowed to insert
-- security events directly.
-- Inserts will be performed by the trusted backend/service role.