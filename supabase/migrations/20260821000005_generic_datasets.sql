-- ============================================================================
-- NXUS BI — GENERIC BUSINESS DATASETS
-- Generic company-file ingestion registry and profiling persistence
-- ============================================================================

-- ============================================================================
-- 1. DATASET REGISTRY
-- ============================================================================

CREATE TABLE IF NOT EXISTS system.datasets (
    dataset_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    dataset_name VARCHAR(256) NOT NULL,
    dataset_key VARCHAR(256) NOT NULL UNIQUE,

    source_type VARCHAR(32) NOT NULL,
    -- 'CSV', 'XLSX', 'XLS', 'POSTGRESQL', 'REST_API', etc.

    file_name VARCHAR(512),
    file_size_bytes BIGINT,

    row_count BIGINT NOT NULL DEFAULT 0,
    column_count INTEGER NOT NULL DEFAULT 0,

    schema_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
    quality_report JSONB NOT NULL DEFAULT '{}'::jsonb,

    quality_score NUMERIC(5,2),

    status VARCHAR(32) NOT NULL DEFAULT 'INGESTED',
    -- 'INGESTED', 'PROFILED', 'VALIDATED',
    -- 'PARTIAL', 'FAILED', 'READY'

    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_datasets_status
ON system.datasets(status);

CREATE INDEX IF NOT EXISTS idx_datasets_created_at
ON system.datasets(created_at DESC);


-- ============================================================================
-- 2. DATASET PROFILE HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS staging.dataset_profiles (
    profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    dataset_id UUID NOT NULL
        REFERENCES system.datasets(dataset_id)
        ON DELETE CASCADE,

    run_id UUID
        REFERENCES system.ingestion_runs(run_id)
        ON DELETE SET NULL,

    row_count BIGINT NOT NULL,
    column_count INTEGER NOT NULL,

    profile_payload JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_dataset_profiles_dataset
ON staging.dataset_profiles(dataset_id, created_at DESC);


-- ============================================================================
-- 3. DATASET QUALITY HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS staging.dataset_quality_reports (
    quality_report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    dataset_id UUID NOT NULL
        REFERENCES system.datasets(dataset_id)
        ON DELETE CASCADE,

    run_id UUID
        REFERENCES system.ingestion_runs(run_id)
        ON DELETE SET NULL,

    quality_score NUMERIC(5,2) NOT NULL,

    row_count BIGINT NOT NULL,
    column_count INTEGER NOT NULL,

    duplicate_rows BIGINT NOT NULL DEFAULT 0,
    missing_values BIGINT NOT NULL DEFAULT 0,

    issue_count INTEGER NOT NULL DEFAULT 0,

    report_payload JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_dataset_quality_dataset
ON staging.dataset_quality_reports(dataset_id, created_at DESC);


-- ============================================================================
-- 4. DATASET UPDATED-AT TRIGGER
-- ============================================================================

DROP TRIGGER IF EXISTS trg_datasets_updated
ON system.datasets;

CREATE TRIGGER trg_datasets_updated
BEFORE UPDATE ON system.datasets
FOR EACH ROW
EXECUTE FUNCTION system.update_updated_at_column();