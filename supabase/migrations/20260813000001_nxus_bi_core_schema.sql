-- ============================================================================
-- NXUS BI — ENTERPRISE PRODUCTION DATABASE SCHEMA (PHASE 2)
-- Target Engine: PostgreSQL 15+ (Supabase Managed)
-- Schemas: raw, staging, warehouse, semantic, ai, knowledge, decision, audit, system
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- 2. SCHEMAS
CREATE SCHEMA IF NOT EXISTS raw;
CREATE SCHEMA IF NOT EXISTS staging;
CREATE SCHEMA IF NOT EXISTS warehouse;
CREATE SCHEMA IF NOT EXISTS semantic;
CREATE SCHEMA IF NOT EXISTS ai;
CREATE SCHEMA IF NOT EXISTS knowledge;
CREATE SCHEMA IF NOT EXISTS decision;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS system;

-- ============================================================================
-- SCHEMA: SYSTEM (Sources, Connectors, Ingestion Runs, Pipeline Health)
-- ============================================================================

CREATE TABLE IF NOT EXISTS system.data_sources (
    source_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_name VARCHAR(128) NOT NULL UNIQUE,
    source_type VARCHAR(64) NOT NULL, -- 'POSTGRESQL', 'SNOWFLAKE', 'KAFKA', 'CLICKHOUSE', 'SALESFORCE', 'STRIPE'
    auth_type VARCHAR(32) NOT NULL DEFAULT 'VAULT_SECRET',
    connection_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS system.connectors (
    connector_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES system.data_sources(source_id) ON DELETE CASCADE,
    connector_name VARCHAR(128) NOT NULL,
    version VARCHAR(32) NOT NULL DEFAULT 'v1.0.0',
    schedule_cron VARCHAR(64) DEFAULT '*/5 * * * *',
    sync_mode VARCHAR(32) NOT NULL DEFAULT 'INCREMENTAL_CDC', -- 'BATCH_SNAPSHOT', 'INCREMENTAL_CDC', 'STREAM'
    config_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    health_status VARCHAR(32) NOT NULL DEFAULT 'HEALTHY', -- 'HEALTHY', 'DEGRADED', 'FAILED'
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS system.ingestion_runs (
    run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connector_id UUID NOT NULL REFERENCES system.connectors(connector_id) ON DELETE CASCADE,
    source_id UUID NOT NULL REFERENCES system.data_sources(source_id) ON DELETE CASCADE,
    run_type VARCHAR(32) NOT NULL DEFAULT 'SCHEDULED', -- 'SCHEDULED', 'MANUAL_TRIGGER', 'BACKFILL'
    status VARCHAR(32) NOT NULL DEFAULT 'RUNNING', -- 'RUNNING', 'COMPLETED', 'FAILED', 'PARTIAL_QUARANTINE'
    started_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    ended_at TIMESTAMPTZ,
    records_received BIGINT NOT NULL DEFAULT 0,
    records_accepted BIGINT NOT NULL DEFAULT 0,
    records_rejected BIGINT NOT NULL DEFAULT 0,
    records_quarantined BIGINT NOT NULL DEFAULT 0,
    bytes_processed BIGINT NOT NULL DEFAULT 0,
    duration_ms INTEGER,
    error_summary TEXT,
    error_details JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS system.service_health_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name VARCHAR(128) NOT NULL,
    component_category VARCHAR(64) NOT NULL, -- 'OLAP_WAREHOUSE', 'TELEMETRY_INGEST', 'VECTOR_DB', 'TRANSFORMATION'
    status VARCHAR(32) NOT NULL, -- 'HEALTHY', 'WARNING', 'CRITICAL'
    uptime_pct NUMERIC(5,2) NOT NULL DEFAULT 100.00,
    latency_p95_ms NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    cluster_load_pct NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    measured_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- ============================================================================
-- SCHEMA: RAW (Bronze Immutable Ingestion Layer)
-- ============================================================================

CREATE TABLE IF NOT EXISTS raw.ingestion_events (
    raw_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID REFERENCES system.ingestion_runs(run_id) ON DELETE SET NULL,
    source_id UUID NOT NULL REFERENCES system.data_sources(source_id) ON DELETE CASCADE,
    entity_topic VARCHAR(128) NOT NULL, -- e.g. 'orders', 'payments', 'telemetry.gateway'
    source_record_id VARCHAR(256),
    source_timestamp TIMESTAMPTZ NOT NULL,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    schema_version VARCHAR(32) NOT NULL DEFAULT '1.0',
    payload_hash CHAR(64) NOT NULL,
    raw_payload JSONB NOT NULL,
    validation_status VARCHAR(32) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'VALID', 'INVALID', 'QUARANTINED'
    quarantine_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_raw_source_topic ON raw.ingestion_events(source_id, entity_topic);
CREATE INDEX IF NOT EXISTS idx_raw_ingested_at ON raw.ingestion_events(ingested_at DESC);
CREATE INDEX IF NOT EXISTS idx_raw_payload_hash ON raw.ingestion_events(payload_hash);

-- ============================================================================
-- SCHEMA: STAGING (Silver Cleansed & Normalized Staging)
-- ============================================================================

CREATE TABLE IF NOT EXISTS staging.data_quality_results (
    quality_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID REFERENCES system.ingestion_runs(run_id) ON DELETE CASCADE,
    raw_id UUID REFERENCES raw.ingestion_events(raw_id) ON DELETE SET NULL,
    rule_name VARCHAR(128) NOT NULL,
    target_table VARCHAR(128) NOT NULL,
    target_column VARCHAR(128),
    validation_type VARCHAR(64) NOT NULL, -- 'NOT_NULL', 'TYPE_CHECK', 'RANGE_CHECK', 'FOREIGN_KEY_INTEGRITY', 'Z_SCORE_OUTLIER'
    severity VARCHAR(32) NOT NULL DEFAULT 'ERROR', -- 'INFO', 'WARNING', 'ERROR', 'CRITICAL'
    passed BOOLEAN NOT NULL,
    observed_value TEXT,
    error_message TEXT,
    evaluated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_quality_target_table ON staging.data_quality_results(target_table, passed);
CREATE INDEX IF NOT EXISTS idx_quality_eval_at ON staging.data_quality_results(evaluated_at DESC);

-- ============================================================================
-- SCHEMA: WAREHOUSE (Gold Dimensional & Fact Analytical Core)
-- ============================================================================

-- DIMENSIONS
CREATE TABLE IF NOT EXISTS warehouse.dim_date (
    date_id INT PRIMARY KEY, -- YYYYMMDD
    full_date DATE NOT NULL UNIQUE,
    day_of_week SMALLINT NOT NULL,
    day_name VARCHAR(16) NOT NULL,
    day_of_month SMALLINT NOT NULL,
    day_of_year SMALLINT NOT NULL,
    week_of_year SMALLINT NOT NULL,
    month_number SMALLINT NOT NULL,
    month_name VARCHAR(16) NOT NULL,
    quarter SMALLINT NOT NULL,
    year INT NOT NULL,
    is_weekend BOOLEAN NOT NULL,
    is_holiday BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS warehouse.dim_location (
    location_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region_code VARCHAR(32) NOT NULL, -- 'APAC', 'EMEA', 'NORTH_AMERICA', 'LATAM'
    country_iso VARCHAR(3) NOT NULL, -- 'USA', 'SGP', 'JPN', 'DEU', 'GBR'
    city VARCHAR(128),
    timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS warehouse.dim_platform (
    platform_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_code VARCHAR(64) NOT NULL UNIQUE, -- 'WEB_APP', 'IOS_NATIVE', 'ANDROID_NATIVE', 'REST_API'
    device_category VARCHAR(32) NOT NULL, -- 'DESKTOP', 'MOBILE', 'TABLET', 'SERVER'
    operating_system VARCHAR(64),
    client_version VARCHAR(32),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS warehouse.dim_customer (
    customer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_customer_key VARCHAR(128) NOT NULL UNIQUE,
    company_name VARCHAR(256) NOT NULL,
    customer_tier VARCHAR(64) NOT NULL DEFAULT 'MID_MARKET', -- 'ENTERPRISE', 'MID_MARKET', 'GROWTH', 'SELF_SERVE'
    industry VARCHAR(128),
    account_status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'AT_RISK', 'CHURNED', 'PROSPECT'
    contract_renewal_date DATE,
    assigned_csm VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS warehouse.dim_product (
    product_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(64) NOT NULL UNIQUE,
    product_name VARCHAR(256) NOT NULL,
    category VARCHAR(128) NOT NULL,
    pricing_tier VARCHAR(64) NOT NULL,
    unit_cost_usd NUMERIC(14,4) NOT NULL DEFAULT 0.0000,
    list_price_usd NUMERIC(14,4) NOT NULL DEFAULT 0.0000,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- FACT TABLES
CREATE TABLE IF NOT EXISTS warehouse.fct_orders (
    order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raw_id UUID REFERENCES raw.ingestion_events(raw_id) ON DELETE SET NULL,
    date_id INT NOT NULL REFERENCES warehouse.dim_date(date_id),
    customer_id UUID NOT NULL REFERENCES warehouse.dim_customer(customer_id),
    location_id UUID NOT NULL REFERENCES warehouse.dim_location(location_id),
    platform_id UUID NOT NULL REFERENCES warehouse.dim_platform(platform_id),
    order_code VARCHAR(128) NOT NULL UNIQUE,
    order_status VARCHAR(32) NOT NULL, -- 'COMPLETED', 'PENDING', 'FAILED', 'CANCELLED', 'REFUNDED'
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    gross_order_value_usd NUMERIC(16,4) NOT NULL DEFAULT 0.0000,
    discount_amount_usd NUMERIC(16,4) NOT NULL DEFAULT 0.0000,
    net_order_value_usd NUMERIC(16,4) NOT NULL DEFAULT 0.0000,
    cost_of_goods_usd NUMERIC(16,4) NOT NULL DEFAULT 0.0000,
    gross_margin_usd NUMERIC(16,4) GENERATED ALWAYS AS (net_order_value_usd - cost_of_goods_usd) STORED,
    order_timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_fct_orders_timestamp ON warehouse.fct_orders(order_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_fct_orders_customer ON warehouse.fct_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_fct_orders_location ON warehouse.fct_orders(location_id);
CREATE INDEX IF NOT EXISTS idx_fct_orders_status ON warehouse.fct_orders(order_status);

CREATE TABLE IF NOT EXISTS warehouse.fct_order_items (
    order_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES warehouse.fct_orders(order_id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES warehouse.dim_product(product_id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price_usd NUMERIC(14,4) NOT NULL,
    unit_cost_usd NUMERIC(14,4) NOT NULL,
    total_line_amount_usd NUMERIC(16,4) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_fct_items_order_product ON warehouse.fct_order_items(order_id, product_id);

CREATE TABLE IF NOT EXISTS warehouse.fct_telemetry_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raw_id UUID REFERENCES raw.ingestion_events(raw_id) ON DELETE SET NULL,
    event_type VARCHAR(64) NOT NULL, -- 'CHECKOUT_ATTEMPT', 'PAYMENT_AUTHORIZATION', 'API_LATENCY', 'QUERY_EXECUTION'
    service_name VARCHAR(128) NOT NULL,
    region_code VARCHAR(32) NOT NULL,
    status_code INTEGER NOT NULL,
    latency_ms NUMERIC(10,2) NOT NULL,
    error_code VARCHAR(64),
    event_payload JSONB DEFAULT '{}'::jsonb,
    event_timestamp TIMESTAMPTZ NOT NULL,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_fct_telemetry_time ON warehouse.fct_telemetry_events(event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_fct_telemetry_service_region ON warehouse.fct_telemetry_events(service_name, region_code);
CREATE INDEX IF NOT EXISTS idx_fct_telemetry_type ON warehouse.fct_telemetry_events(event_type);

-- ============================================================================
-- SCHEMA: SEMANTIC (Governed Metric Catalog & Pre-Aggregated Observations)
-- ============================================================================

CREATE TABLE IF NOT EXISTS semantic.metrics_catalog (
    metric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_key VARCHAR(128) NOT NULL UNIQUE, -- 'arr', 'nrr', 'gross_margin_pct', 'checkout_conversion_rate', 'cac_payback_months'
    display_name VARCHAR(256) NOT NULL,
    domain VARCHAR(64) NOT NULL, -- 'FINANCE', 'SALES', 'INFRASTRUCTURE', 'PRODUCT', 'CUSTOMER_SUCCESS'
    business_definition TEXT NOT NULL,
    sql_formula TEXT NOT NULL,
    target_grain VARCHAR(64) NOT NULL DEFAULT 'HOURLY', -- 'STREAM', 'HOURLY', 'DAILY', 'MONTHLY'
    allowed_dimensions TEXT[] DEFAULT ARRAY['region_code', 'customer_tier', 'product_segment', 'platform_code'],
    owner_team VARCHAR(128) NOT NULL DEFAULT 'Finance & Analytics Core',
    target_sla_freshness_seconds INTEGER NOT NULL DEFAULT 300,
    unit_format VARCHAR(32) NOT NULL DEFAULT 'CURRENCY_USD', -- 'CURRENCY_USD', 'PERCENTAGE', 'COUNT', 'MILLISECONDS', 'MONTHS'
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS semantic.metric_observations (
    observation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_id UUID NOT NULL REFERENCES semantic.metrics_catalog(metric_id) ON DELETE CASCADE,
    grain VARCHAR(32) NOT NULL DEFAULT 'HOURLY', -- 'REALTIME', 'HOURLY', 'DAILY'
    dimension_filters JSONB NOT NULL DEFAULT '{}'::jsonb, -- e.g. {"region": "APAC", "tier": "ENTERPRISE"}
    metric_value NUMERIC(20,6) NOT NULL,
    baseline_expected_value NUMERIC(20,6),
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    confidence_score NUMERIC(5,4) DEFAULT 1.0000,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_metric_obs_lookup ON semantic.metric_observations(metric_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_metric_obs_grain ON semantic.metric_observations(grain, period_start DESC);

-- ============================================================================
-- SCHEMA: AI (Anomalies, Causal RCA, Bayesian Forecasts, NL->SQL, Interactions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai.anomalies (
    anomaly_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_id UUID NOT NULL REFERENCES semantic.metrics_catalog(metric_id) ON DELETE CASCADE,
    title VARCHAR(256) NOT NULL,
    category VARCHAR(64) NOT NULL, -- 'INFRASTRUCTURE', 'REVENUE', 'SALES', 'PLATFORM'
    severity VARCHAR(32) NOT NULL, -- 'CRITICAL', 'MAJOR', 'MINOR'
    status VARCHAR(32) NOT NULL DEFAULT 'DETECTED', -- 'DETECTED', 'INVESTIGATING', 'ACKNOWLEDGED', 'RESOLVED', 'FALSE_POSITIVE'
    current_value VARCHAR(64) NOT NULL,
    expected_value VARCHAR(64) NOT NULL,
    deviation_pct NUMERIC(8,2) NOT NULL,
    z_score NUMERIC(8,3) NOT NULL,
    lead_hypothesis TEXT NOT NULL,
    estimated_impact_usd NUMERIC(16,2),
    confidence_score NUMERIC(5,4) NOT NULL DEFAULT 0.9500,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    resolved_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_anomalies_status_sev ON ai.anomalies(status, severity, detected_at DESC);

CREATE TABLE IF NOT EXISTS ai.rca_investigations (
    investigation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anomaly_id UUID NOT NULL REFERENCES ai.anomalies(anomaly_id) ON DELETE CASCADE,
    incident_number VARCHAR(32) NOT NULL UNIQUE, -- 'INC-1092'
    title VARCHAR(256) NOT NULL,
    causal_dag_payload JSONB NOT NULL, -- Nodes, Edges, Weights, Layers
    top_root_cause TEXT NOT NULL,
    root_cause_node_id VARCHAR(64) NOT NULL,
    attribution_confidence NUMERIC(5,4) NOT NULL DEFAULT 0.9400,
    evidence_trail JSONB NOT NULL DEFAULT '[]'::jsonb,
    recommended_mitigation TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'COMPLETED', -- 'IN_PROGRESS', 'COMPLETED', 'DISMISSED'
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS ai.forecasts (
    forecast_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_id UUID NOT NULL REFERENCES semantic.metrics_catalog(metric_id) ON DELETE CASCADE,
    horizon_label VARCHAR(64) NOT NULL, -- 'Q3-2026', 'Q4-2026', '2027-FULL-YEAR'
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    baseline_value NUMERIC(18,4) NOT NULL,
    forecast_p50 NUMERIC(18,4) NOT NULL,
    forecast_p10 NUMERIC(18,4) NOT NULL,
    forecast_p90 NUMERIC(18,4) NOT NULL,
    model_name VARCHAR(128) NOT NULL DEFAULT 'BayesianHierarchicalEnsemble-v3',
    model_version VARCHAR(32) NOT NULL DEFAULT '3.4.1',
    confidence_score NUMERIC(5,4) NOT NULL DEFAULT 0.9200,
    growth_assumption_pct NUMERIC(6,2) NOT NULL DEFAULT 0.00,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS ai.nl_sql_queries (
    query_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    natural_language_prompt TEXT NOT NULL,
    interpreted_intent TEXT NOT NULL,
    compiled_sql TEXT NOT NULL,
    target_engine VARCHAR(64) NOT NULL DEFAULT 'POSTGRESQL_WAREHOUSE', -- 'POSTGRESQL_WAREHOUSE', 'SNOWFLAKE', 'CLICKHOUSE'
    execution_status VARCHAR(32) NOT NULL DEFAULT 'SUCCESS', -- 'SUCCESS', 'FAILED', 'REJECTED_SAFETY_POLICY'
    execution_time_ms INTEGER NOT NULL DEFAULT 0,
    rows_returned INTEGER NOT NULL DEFAULT 0,
    confidence_score NUMERIC(5,4) NOT NULL DEFAULT 0.9800,
    safety_checks_passed BOOLEAN NOT NULL DEFAULT true,
    user_id UUID,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS ai.analyst_conversations (
    conversation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_title VARCHAR(256) NOT NULL,
    user_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS ai.analyst_messages (
    message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES ai.analyst_conversations(conversation_id) ON DELETE CASCADE,
    sender_role VARCHAR(32) NOT NULL, -- 'USER', 'ASSISTANT', 'SYSTEM'
    content TEXT NOT NULL,
    grounding_metadata JSONB DEFAULT '{}'::jsonb,
    sql_query_ref UUID REFERENCES ai.nl_sql_queries(query_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- ============================================================================
-- SCHEMA: KNOWLEDGE (Vector Store & Enterprise RAG Documents)
-- ============================================================================

CREATE TABLE IF NOT EXISTS knowledge.documents (
    document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(256) NOT NULL,
    category VARCHAR(64) NOT NULL, -- 'SOP_RUNBOOK', 'INCIDENT_POSTMORTEM', 'QBR_STRATEGY', 'TAXONOMY'
    source_url VARCHAR(512),
    author VARCHAR(128) NOT NULL DEFAULT 'Enterprise Architecture Team',
    version VARCHAR(32) NOT NULL DEFAULT '1.0',
    status VARCHAR(32) NOT NULL DEFAULT 'INDEXED', -- 'INDEXED', 'PENDING_EMBEDDING', 'DEPRECATED'
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS knowledge.document_chunks (
    chunk_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES knowledge.documents(document_id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    chunk_content TEXT NOT NULL,
    embedding VECTOR(1536), -- Standard OpenAI/Gemini embedding vector dimensionality
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- HNSW Cosine Similarity Index for sub-10ms semantic retrieval
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_vector 
ON knowledge.document_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- ============================================================================
-- SCHEMA: DECISION (Prescriptive Playbooks, What-If Scenarios, Alerts & Outcomes)
-- ============================================================================

CREATE TABLE IF NOT EXISTS decision.prescriptive_actions (
    action_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_code VARCHAR(64) NOT NULL UNIQUE, -- 'act-01'
    title VARCHAR(256) NOT NULL,
    category VARCHAR(64) NOT NULL, -- 'INFRASTRUCTURE', 'PRICING', 'SALES', 'MARKETING'
    description TEXT NOT NULL,
    estimated_impact VARCHAR(128) NOT NULL, -- '+$48,200/hr Protected GMV'
    confidence_score NUMERIC(5,4) NOT NULL DEFAULT 0.9500,
    risk_level VARCHAR(32) NOT NULL DEFAULT 'LOW', -- 'LOW', 'MEDIUM', 'HIGH'
    effort_sla VARCHAR(64) NOT NULL DEFAULT 'Instant (Zero-Downtime)',
    causal_driver TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING_APPROVAL', -- 'PENDING_APPROVAL', 'EXECUTED', 'DISMISSED'
    policy_checks_passed BOOLEAN NOT NULL DEFAULT true,
    workflow_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS decision.whatif_scenarios (
    scenario_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario_name VARCHAR(256) NOT NULL,
    price_change_pct NUMERIC(6,2) NOT NULL DEFAULT 0.00,
    churn_delta_pct NUMERIC(6,2) NOT NULL DEFAULT 0.00,
    sales_efficiency_shift_pct NUMERIC(6,2) NOT NULL DEFAULT 0.00,
    headcount_investment_usd NUMERIC(16,2) NOT NULL DEFAULT 0.00,
    simulated_arr_millions NUMERIC(10,2) NOT NULL,
    simulated_gross_margin_pct NUMERIC(6,2) NOT NULL,
    simulated_cac_payback_months NUMERIC(6,2) NOT NULL,
    ai_assessment_summary TEXT NOT NULL,
    created_by VARCHAR(128) NOT NULL DEFAULT 'Executive Strategy Team',
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS decision.alert_rules (
    rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_code VARCHAR(32) NOT NULL UNIQUE, -- 'RULE-01'
    name VARCHAR(256) NOT NULL,
    evaluated_metric VARCHAR(128) NOT NULL, -- 'fct_orders.conversion_rate'
    threshold_condition TEXT NOT NULL, -- 'z_score < -3.0 OR drop > 15%'
    severity VARCHAR(32) NOT NULL, -- 'CRITICAL', 'MAJOR', 'MINOR'
    notification_channels TEXT NOT NULL, -- 'PagerDuty #infra-sev1, Slack #exec-alerts'
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    last_triggered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS decision.incidents (
    incident_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_code VARCHAR(32) NOT NULL UNIQUE, -- 'INC-1092'
    title VARCHAR(256) NOT NULL,
    severity VARCHAR(32) NOT NULL, -- 'CRITICAL', 'MAJOR', 'MINOR'
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'INVESTIGATING', 'RESOLVED'
    opened_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    resolved_at TIMESTAMPTZ,
    assigned_to VARCHAR(128) NOT NULL DEFAULT 'SecOps / Payment Infra On-Call',
    estimated_impact VARCHAR(128) NOT NULL,
    lead_hypothesis TEXT NOT NULL,
    rca_investigation_id UUID REFERENCES ai.rca_investigations(investigation_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS decision.action_outcomes (
    outcome_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outcome_code VARCHAR(32) NOT NULL UNIQUE, -- 'OUT-301'
    action_id UUID REFERENCES decision.prescriptive_actions(action_id) ON DELETE SET NULL,
    action_title VARCHAR(256) NOT NULL,
    category VARCHAR(64) NOT NULL,
    executed_at TIMESTAMPTZ NOT NULL,
    executed_by VARCHAR(128) NOT NULL,
    baseline_metric TEXT NOT NULL,
    post_action_observed TEXT NOT NULL,
    net_realized_value VARCHAR(128) NOT NULL, -- '+$42,800/hr Protected GMV'
    status VARCHAR(32) NOT NULL DEFAULT 'VERIFIED', -- 'VERIFIED', 'MONITORING', 'ROLLED_BACK'
    ai_verification_audit TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- ============================================================================
-- SCHEMA: AUDIT (Immutable Governance & Security Trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit.execution_trail (
    audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id VARCHAR(128) NOT NULL DEFAULT 'SYSTEM_POLICY_ENGINE',
    action_type VARCHAR(64) NOT NULL, -- 'EXECUTE_PRESCRIPTIVE_ACTION', 'OVERRIDE_ALERT', 'MUTATE_SECURITY_ROLE'
    target_entity_type VARCHAR(64) NOT NULL,
    target_entity_id VARCHAR(128) NOT NULL,
    previous_state JSONB,
    new_state JSONB,
    request_ip VARCHAR(64),
    immutable_hash CHAR(64) NOT NULL,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_audit_target ON audit.execution_trail(target_entity_type, target_entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_time ON audit.execution_trail(executed_at DESC);

-- ============================================================================
-- AUTOMATED TRIGGERS & FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION system.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = clock_timestamp();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach timestamp triggers
DROP TRIGGER IF EXISTS trg_dim_cust_updated ON warehouse.dim_customer;
CREATE TRIGGER trg_dim_cust_updated BEFORE UPDATE ON warehouse.dim_customer
FOR EACH ROW EXECUTE FUNCTION system.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_metrics_catalog_updated ON semantic.metrics_catalog;
CREATE TRIGGER trg_metrics_catalog_updated BEFORE UPDATE ON semantic.metrics_catalog
FOR EACH ROW EXECUTE FUNCTION system.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_anomalies_updated ON ai.anomalies;
CREATE TRIGGER trg_anomalies_updated BEFORE UPDATE ON ai.anomalies
FOR EACH ROW EXECUTE FUNCTION system.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_prescriptive_act_updated ON decision.prescriptive_actions;
CREATE TRIGGER trg_prescriptive_act_updated BEFORE UPDATE ON decision.prescriptive_actions
FOR EACH ROW EXECUTE FUNCTION system.update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE warehouse.fct_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE semantic.metric_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision.prescriptive_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.execution_trail ENABLE ROW LEVEL SECURITY;

-- Allow authenticated read access for reporting agents
CREATE POLICY "Authenticated users can read warehouse facts"
ON warehouse.fct_orders FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read metric observations"
ON semantic.metric_observations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can view anomalies"
ON ai.anomalies FOR SELECT TO authenticated USING (true);

-- ============================================================================
-- REFERENCE SEED DATA
-- ============================================================================

INSERT INTO semantic.metrics_catalog (metric_key, display_name, domain, business_definition, sql_formula, target_grain, unit_format)
VALUES 
('arr', 'Annual Recurring Revenue', 'FINANCE', 'Total normalized annualized run-rate subscription revenue.', 'SUM(active_contracts.annual_contract_value)', 'DAILY', 'CURRENCY_USD'),
('nrr', 'Net Revenue Retention', 'FINANCE', 'Percentage of recurring revenue retained from existing customers over 12 months.', '(arr_ending - arr_new) / arr_beginning * 100', 'MONTHLY', 'PERCENTAGE'),
('gross_margin_pct', 'Gross Margin Percentage', 'FINANCE', 'Net revenue remaining after direct COGS and hosting infrastructure.', '(SUM(net_order_value_usd) - SUM(cost_of_goods_usd)) / SUM(net_order_value_usd) * 100', 'HOURLY', 'PERCENTAGE'),
('checkout_conversion_rate', 'Checkout Conversion Rate', 'PRODUCT', 'Ratio of successfully authorized orders to checkout session attempts.', 'COUNT(CASE WHEN order_status = ''COMPLETED'' THEN 1 END)::float / NULLIF(COUNT(event_id), 0) * 100', 'STREAM', 'PERCENTAGE'),
('cac_payback_months', 'CAC Payback Period', 'SALES', 'Months of gross profit required to recover sales and marketing acquisition cost.', 'total_gtm_spend / (new_arr_added * gross_margin_pct) * 12', 'MONTHLY', 'MONTHS')
ON CONFLICT (metric_key) DO NOTHING;
