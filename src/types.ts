export type ScreenId =
  | "command-center"
  | "live-intelligence"
  | "analytics-explorer"
  | "anomaly-center"
  | "root-cause-analysis"
  | "forecasts-prediction"
  | "ai-analyst"
  | "evidence-lineage"
  | "nl-to-sql"
  | "knowledge-rag"
  | "decision-intelligence"
  | "scenario-simulator"
  | "alerts-incidents"
  | "actions-outcomes"
  | "system-health";

export interface NavItem {
  id: ScreenId;
  label: string;
  category: "EXECUTIVE" | "ANALYTICS & AI" | "DIAGNOSTICS & RCA" | "DATA & PLATFORM";
  iconName: string;
  badge?: string | number;
  badgeType?: "cyan" | "rose" | "amber" | "emerald" | "blue";
  isNew?: boolean;
}

export interface MetricSummary {
  id: string;
  title: string;
  value: string;
  numericValue: number;
  unit?: string;
  changePct: number;
  changeDirection: "up" | "down" | "neutral";
  changeIsPositive: boolean;
  timeframe: string;
  sparklineData: number[];
  targetValue?: string;
  confidenceInterval?: string;
  anomalyDetected?: boolean;
}

export interface LiveEvent {
  id: string;
  timestamp: string;
  source: "Stripe" | "Postgres-CDC" | "Kafka-Events" | "Shopify" | "Salesforce" | "Datadog";
  eventType: string;
  entityId: string;
  amountUsd?: number;
  status: "SUCCESS" | "WARNING" | "CRITICAL" | "PROCESSING";
  latencyMs: number;
  details: string;
  region: string;
}

export interface AnomalyItem {
  id: string;
  title: string;
  metricKey: string;
  metricDisplayName: string;
  severity: "CRITICAL" | "MAJOR" | "MINOR" | "INFO";
  zScore: number;
  detectedAt: string;
  status: "ACTIVE" | "INVESTIGATING" | "MITIGATED" | "RESOLVED" | "MUTED";
  currentValue: string;
  expectedRange: string;
  deltaPct: number;
  affectedDimension: string;
  correlatedEventsCount: number;
  aiHypothesis: string;
  rcaReady: boolean;
}

export interface CausalNode {
  id: string;
  label: string;
  layer: "Infrastructure" | "Application API" | "Third-Party / Gateway" | "Business Metric";
  status: "NORMAL" | "DEGRADED" | "CRITICAL";
  contributionPct: number;
  telemetryMetric: string;
  details: string;
}

export interface CausalEdge {
  from: string;
  to: string;
  weight: number;
  relationshipType: "CAUSES" | "AMPLIFIES" | "CORRELATES";
}

export interface ForecastPoint {
  date: string;
  historical?: number;
  predicted?: number;
  p10?: number;
  p50?: number;
  p90?: number;
  actual?: number;
}

export interface DecisionItem {
  id: string;
  title: string;
  category: "REVENUE_OPTIMIZATION" | "RISK_MITIGATION" | "COST_REDUCTION" | "INFRASTRUCTURE";
  confidenceScore: number; // 0-100
  expectedRoiUsd: number;
  timeToValueDays: number;
  riskScore: number; // 0-100
  description: string;
  impactMetrics: { metric: string; delta: string }[];
  suggestedAction: string;
  autoExecutable: boolean;
  status: "PENDING_APPROVAL" | "EXECUTING" | "ACTIVE" | "ARCHIVED";
}

export interface IncidentAlert {
  id: string;
  title: string;
  priority: "P1" | "P2" | "P3" | "P4";
  service: string;
  environment: string;
  triggeredAt: string;
  slaRemainingMinutes: number;
  status: "TRIGGERED" | "ACKNOWLEDGED" | "INVESTIGATING" | "MITIGATED" | "RESOLVED";
  assignee: string;
  groupedEventsCount: number;
  runbookUrl: string;
  rootCauseCandidate: string;
}

export interface ActionOutcomeRecord {
  id: string;
  actionTitle: string;
  executedAt: string;
  executedBy: string;
  decisionId: string;
  primaryMetric: string;
  baselineValue: number;
  targetDeltaPct: number;
  actualDeltaPct: number;
  outcomeStatus: "EXCEEDED" | "MET_TARGET" | "UNDERPERFORMED" | "EVALUATING";
  mlCalibrationWeight: number; // Feedback learning multiplier
  learningsNote: string;
}

export interface LineageNode {
  id: string;
  name: string;
  type: "SOURCE" | "BRONZE_INGEST" | "SILVER_CLEANSED" | "GOLD_MART" | "SEMANTIC_METRIC" | "ANOMALY_MONITOR" | "DASHBOARD";
  layerName: string;
  freshness: string;
  qualityScore: number;
  rowCount: string;
  owner: string;
}

export interface RAGDocument {
  id: string;
  title: string;
  category: "POST_MORTEM" | "SOP" | "BUSINESS_LOGIC" | "QBR_DECK" | "METRIC_TAXONOMY";
  updatedAt: string;
  author: string;
  chunkCount: number;
  relevanceScore?: number;
  snippet: string;
  fullContent: string;
}

export interface PrescriptiveAction {
  id: string;
  title: string;
  category: string;
  description: string;
  estimatedImpact: string;
  confidenceScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  effort: string;
  causalDriver: string;
  status: "PENDING_APPROVAL" | "EXECUTED" | "DISMISSED";
}
