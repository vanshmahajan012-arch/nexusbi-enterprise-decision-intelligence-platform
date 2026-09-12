import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Sparkles,
  ArrowRight,
  GitFork,
  Activity,
  Sliders,
  Globe,
  ExternalLink,
  ChevronRight,
  Zap,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

import { MetricCard } from "../shared/MetricCard";
import { StatusBadge } from "../shared/StatusBadge";
import { Sparkline } from "../shared/Sparkline";

import { ScreenId } from "../../types";
import { apiFetch } from "../../services/api";
import { useAaplLatestPrice } from "../../hooks/useAaplLatestPrice";

const COMMAND_CENTER_REFRESH_INTERVAL_MS = 10_000;

interface CommandCenterScreenProps {
  onNavigate: (
    screen: ScreenId,
  ) => void;
}

interface Kpi {
  key: string;
  name: string;
  value: number;
  unit: string;
  description: string;
}

interface BackendAnomaly {
  metric: string;
  current_value: number;
  expected_value: number;
  deviation_pct: number;
  z_score: number;
  severity: string;
  is_anomaly: boolean;
  detection_reason: string;
  explanation: string;
}

interface AnomalyResponse {
  results: BackendAnomaly[];
  anomalies_detected: number;
  critical_count: number;
  major_count: number;
}

interface DecisionItem {
  decision_type: string;
  title: string;
  priority: string;
  rationale: string;
  evidence: string[];
  expected_impact: string;
  risk_level: string;
  confidence: number;
  related_metrics: string[];
  event_group: string;
}

interface DecisionResponse {
  decisions: DecisionItem[];
  summary: string;
  high_priority_count: number;
}

interface RegionPerformance {
  region: string;
  revenue: number;
  order_count: number;
}

function formatNumber(
  value: number | null | undefined,
  decimals = 2,
): string {
  if (
    value === null ||
    value === undefined ||
    Number.isNaN(value)
  ) {
    return "—";
  }

  return value.toLocaleString(
    "en-US",
    {
      minimumFractionDigits:
        decimals,
      maximumFractionDigits:
        decimals,
    },
  );
}

function formatCurrency(
  value: number | null | undefined,
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return "—";
  }

  if (Math.abs(value) >= 1_000_000) {
    return `$${(
      value / 1_000_000
    ).toFixed(2)}M`;
  }

  if (Math.abs(value) >= 1_000) {
    return `$${(
      value / 1_000
    ).toFixed(1)}K`;
  }

  return `$${value.toFixed(2)}`;
}

function formatVolume(
  value: number | null | undefined,
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return "—";
  }

  if (value >= 1_000_000_000) {
    return `${(
      value / 1_000_000_000
    ).toFixed(2)}B`;
  }

  if (value >= 1_000_000) {
    return `${(
      value / 1_000_000
    ).toFixed(2)}M`;
  }

  if (value >= 1_000) {
    return `${(
      value / 1_000
    ).toFixed(1)}K`;
  }

  return value.toLocaleString(
    "en-US",
  );
}

function getFeedPresentation(
  feedState: string,
) {
  switch (feedState) {
    case "LIVE":
      return {
        label: "LIVE",
        dot: "bg-emerald-400",
        badge:
          "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400",
        line: "text-emerald-400",
        sparkline: "#00F4FE",
      };

    case "DELAYED":
      return {
        label: "DELAYED",
        dot: "bg-yellow-400",
        badge:
          "bg-yellow-500/10 border border-yellow-500/20 text-yellow-400",
        line: "text-yellow-400",
        sparkline: "#EAB308",
      };

    case "STALE":
      return {
        label: "STALE",
        dot: "bg-orange-400",
        badge:
          "bg-orange-500/10 border border-orange-500/20 text-orange-400",
        line: "text-orange-400",
        sparkline: "#F97316",
      };

    case "OFFLINE":
      return {
        label: "OFFLINE",
        dot: "bg-rose-400",
        badge:
          "bg-rose-500/10 border border-rose-500/20 text-rose-400",
        line: "text-rose-400",
        sparkline: "#EF4444",
      };

    case "PRE_MARKET":
      return {
        label: "PRE-MARKET",
        dot: "bg-amber-400",
        badge:
          "bg-amber-500/10 border border-amber-500/20 text-amber-300",
        line: "text-amber-300",
        sparkline: "#F59E0B",
      };

    case "POST_MARKET":
      return {
        label: "POST-MARKET",
        dot: "bg-violet-400",
        badge:
          "bg-violet-500/10 border border-violet-500/20 text-violet-300",
        line: "text-violet-300",
        sparkline: "#8B5CF6",
      };

    case "MARKET_CLOSED":
      return {
        label: "MARKET CLOSED",
        dot: "bg-slate-400",
        badge:
          "bg-slate-500/10 border border-slate-500/20 text-slate-400",
        line: "text-slate-400",
        sparkline: "#64748B",
      };

    case "CONNECTED":
      return {
        label: "CONNECTED",
        dot: "bg-cyan-400",
        badge:
          "bg-cyan-500/10 border border-cyan-500/20 text-cyan-300",
        line: "text-cyan-300",
        sparkline: "#22D3EE",
      };

    default:
      return {
        label: "CONNECTING",
        dot: "bg-slate-400",
        badge:
          "bg-slate-500/10 border border-slate-500/20 text-slate-400",
        line: "text-slate-400",
        sparkline: "#94A3B8",
      };
  }
}

function getFreshnessText(
  freshnessSeconds: number | null,
): string {
  if (freshnessSeconds === null) {
    return "Awaiting tick";
  }

  if (freshnessSeconds < 1) {
    return "Just now";
  }

  if (freshnessSeconds < 60) {
    return `${freshnessSeconds.toFixed(
      1,
    )}s ago`;
  }

  const minutes = Math.floor(
    freshnessSeconds / 60,
  );

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  return `${Math.floor(
    minutes / 60,
  )}h ago`;
}

function makeMetricCard(
  kpi: Kpi,
) {
  return {
    id: kpi.key,
    label: kpi.name,
    value:
      kpi.unit === "CURRENCY"
        ? formatCurrency(kpi.value)
        : formatNumber(
            kpi.value,
            0,
          ),
    unit: kpi.unit,
    trend: null,
    trendLabel: null,
    description:
      kpi.description,
    sparklineData: [],
  };
}

export const CommandCenterScreen: React.FC<
  CommandCenterScreenProps
> = ({
  onNavigate,
}) => {
  const {
    data: aaplMetric,
    rawData: aaplRawData,
    isLoading: isAaplLoading,
    error: aaplError,
    feedState,
    marketSession,
    freshnessSeconds,
  } = useAaplLatestPrice();

  const [
    kpis,
    setKpis,
  ] = useState<Kpi[]>([]);

  const [
    anomalyData,
    setAnomalyData,
  ] = useState<
    AnomalyResponse | null
  >(null);

  const [
    decisionData,
    setDecisionData,
  ] = useState<
    DecisionResponse | null
  >(null);

  const [
    regions,
    setRegions,
  ] = useState<
    RegionPerformance[]
  >([]);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const loadCommandCenterData =
    async (
      showLoading = false,
    ) => {
      if (showLoading) {
        setIsLoading(true);
      }
      setError(null);

      try {
        const [
          kpiResponse,
          anomalyResponse,
          decisionResponse,
          regionResponse,
        ] = await Promise.all([
          apiFetch(
            "/api/analytics/kpis",
          ),
          apiFetch(
            "/api/analytics/anomalies?z_threshold=2",
          ),
          apiFetch(
            "/api/decisions",
          ),
          apiFetch(
            "/api/analytics/revenue-by-region",
          ),
        ]);

        if (
          !kpiResponse.ok ||
          !anomalyResponse.ok ||
          !decisionResponse.ok ||
          !regionResponse.ok
        ) {
          throw new Error(
            "One or more Command Center data sources failed.",
          );
        }

        const [
          kpiJson,
          anomalyJson,
          decisionJson,
          regionJson,
        ] = await Promise.all([
          kpiResponse.json(),
          anomalyResponse.json(),
          decisionResponse.json(),
          regionResponse.json(),
        ]);

        setKpis(
          kpiJson.kpis ?? [],
        );

        setAnomalyData(
          anomalyJson,
        );

        setDecisionData(
          decisionJson,
        );

        setRegions(
          regionJson.data ?? [],
        );
      } catch (
        loadError
      ) {
        setError(
          loadError instanceof
            Error
            ? loadError.message
            : "Unable to load Command Center data.",
        );
      } finally {
        if (showLoading) {
          setIsLoading(false);
        }
      }
    };

  useEffect(() => {
    let cancelled = false;

    const refresh = async (
      showLoading: boolean,
    ) => {
      if (cancelled) {
        return;
      }

      await loadCommandCenterData(
        showLoading,
      );
    };

    void refresh(true);

    const intervalId =
      window.setInterval(() => {
        void refresh(false);
      }, COMMAND_CENTER_REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
    // Background polling intentionally keeps the existing
    // dashboard state visible between refreshes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const feed =
    getFeedPresentation(
      feedState,
    );

  const liveSparkline =
    aaplMetric?.sparklineData &&
    aaplMetric.sparklineData
      .length > 1
      ? aaplMetric.sparklineData
      : [];

  const dayChange =
    aaplRawData?.change ?? null;

  const dayChangePct =
    aaplRawData?.percent_change ??
    null;

  const dayChangeDirection =
    dayChangePct === null
      ? "neutral"
      : dayChangePct > 0
        ? "up"
        : dayChangePct < 0
          ? "down"
          : "neutral";

  const dayChangeClass =
    dayChangeDirection === "up"
      ? "text-emerald-400"
      : dayChangeDirection ===
          "down"
        ? "text-rose-400"
        : "text-slate-400";

  const marketIntelligence =
    aaplRawData?.market_intelligence;

  const intelligenceDayRange =
    marketIntelligence?.day_range_pct ??
    null;

  const intelligenceRangePosition =
    marketIntelligence?.range_position_pct ??
    null;

  const intelligenceVolatility =
    marketIntelligence?.tick_volatility_pct ??
    null;

  const intelligenceVolume =
    marketIntelligence?.volume ??
    null;

  const topAnomaly =
    useMemo(() => {
      return (
        anomalyData?.results?.find(
          (item) =>
            item.is_anomaly,
        ) ?? null
      );
    }, [anomalyData]);

  const topDecision =
    decisionData?.decisions?.[0] ??
    null;

  const metricCards =
    kpis.map(makeMetricCard);

  const highestRegionRevenue =
    regions.reduce(
      (max, region) =>
        region.revenue >
        (max?.revenue ?? 0)
          ? region
          : max,
      null as
        | RegionPerformance
        | null,
    );

  const maxRegionRevenue =
    regions.reduce(
      (max, region) =>
        Math.max(
          max,
          region.revenue,
        ),
      0,
    );

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Executive AI Pulse */}
      <div className="ai-glow-card rounded-xl p-5 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#00F4FE]/15 border border-[#00F4FE]/30 text-[#00F4FE] text-xs font-mono font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                EXECUTIVE AI SYNTHESIS
              </span>

              <span className="text-xs text-slate-500 font-mono">
                Live backend state
              </span>
            </div>

            <h1 className="text-xl lg:text-2xl font-bold text-white tracking-tight">
              Enterprise Health:
              {" "}
              <span className="text-[#00F4FE]">
                {topAnomaly?.severity ===
                "CRITICAL"
                  ? "Anomaly Detected"
                  : "Operational"}
              </span>
            </h1>

            <p className="text-sm text-slate-300 leading-relaxed">
              Total revenue is{" "}
              <strong className="text-white font-mono">
                {formatCurrency(
                  kpis.find(
                    (kpi) =>
                      kpi.key ===
                      "total_revenue",
                  )?.value,
                )}
              </strong>
              {" "}
              across{" "}
              <strong className="text-white font-mono">
                {formatNumber(
                  kpis.find(
                    (kpi) =>
                      kpi.key ===
                      "total_orders",
                  )?.value,
                  0,
                )}
              </strong>
              {" "}
              orders.
              {" "}
              {anomalyData?.anomalies_detected ??
                0}{" "}
              anomalies detected.
              {" "}
              {decisionData?.high_priority_count ??
                0}{" "}
              high-priority decision(s) require attention.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() =>
                onNavigate(
                  "decision-intelligence",
                )
              }
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#00F4FE] to-[#3B82F6] hover:from-[#38BDF8] hover:to-[#2563EB] text-black font-semibold text-xs font-mono shadow-lg shadow-[#00F4FE]/20 transition-all"
            >
              <span>
                Review AI Decisions
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() =>
                onNavigate(
                  "ai-analyst",
                )
              }
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#181B24] hover:bg-[#202532] border border-white/12 text-slate-200 text-xs font-mono transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#00F4FE]" />
              <span>
                Ask AI Analyst
              </span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-xs font-mono text-rose-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* KPI Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs uppercase font-mono tracking-wider text-slate-400 font-semibold flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-[#00F4FE]" />
            Core Enterprise Vital Signs
          </h2>

          <button
            onClick={() =>
              onNavigate(
                "analytics-explorer",
              )
            }
            className="text-xs font-mono text-[#00F4FE] hover:underline flex items-center gap-1"
          >
            Deep Dive in Analytics Explorer
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {isLoading ? (
          <div className="bg-[#111319] border border-white/8 rounded-xl p-8 text-center">
            <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin text-[#00F4FE]" />
            <div className="text-xs text-slate-400 font-mono">
              Loading enterprise metrics...
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {metricCards.map(
              (metric) => (
                <MetricCard
                  key={
                    metric.id
                  }
                  metric={
                    metric as any
                  }
                  highlight={
                    metric.id ===
                    "total_revenue"
                  }
                  onClick={() =>
                    onNavigate(
                      "analytics-explorer",
                    )
                  }
                />
              ),
            )}
          </div>
        )}
      </div>

      {/* Live Market Snapshot */}
      <div className="bg-[#111318]/90 border border-[#00F4FE]/20 rounded-xl p-4 shadow-lg shadow-black/30">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-mono">
                Live Market Data
              </div>

              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase ${feed.badge}`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${feed.dot} ${
                    feedState ===
                      "LIVE" ||
                    
                    feedState ===
                      "CONNECTED"
                      ? "animate-pulse"
                      : ""
                  }`}
                />

                {feed.label}
              </span>

              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase ${
                  marketSession === "REGULAR"
                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                    : marketSession === "PRE_MARKET"
                      ? "bg-amber-500/10 border border-amber-500/20 text-amber-300"
                      : marketSession === "POST_MARKET"
                        ? "bg-violet-500/10 border border-violet-500/20 text-violet-300"
                        : "bg-slate-500/10 border border-slate-500/20 text-slate-400"
                }`}
              >
                {marketSession === "REGULAR"
                  ? "MARKET OPEN"
                  : marketSession === "PRE_MARKET"
                    ? "PRE-MARKET"
                    : marketSession === "POST_MARKET"
                      ? "POST-MARKET"
                      : "MARKET CLOSED"}
              </span>
            </div>

            <div className="flex flex-wrap items-end gap-3 mt-2">
              <div className="text-2xl lg:text-3xl font-bold text-white font-mono tracking-tight">
                {isAaplLoading
                  ? "Loading..."
                  : aaplRawData
                    ? `${aaplRawData.currency ?? "USD"} ${formatNumber(
                        aaplRawData.price,
                        2,
                      )}`
                    : "Unavailable"}
              </div>

              {aaplRawData && (
                <div
                  className={`flex items-center gap-1 mb-1 font-mono text-sm font-semibold ${dayChangeClass}`}
                >
                  <span>
                    {dayChangeDirection ===
                    "up"
                      ? "↑"
                      : dayChangeDirection ===
                          "down"
                        ? "↓"
                        : "→"}
                  </span>

                  <span>
                    {dayChange ===
                    null
                      ? "—"
                      : `${Math.abs(
                          dayChange,
                        ).toFixed(2)}`}
                  </span>

                  <span>
                    (
                    {dayChangePct ===
                    null
                      ? "—"
                      : `${Math.abs(
                          dayChangePct,
                        ).toFixed(2)}%`}
                    )
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[10px] font-mono">
              <span className="text-slate-500">
                {aaplRawData?.exchange ??
                  "NASDAQ"}{" "}
                •{" "}
                {aaplRawData?.mic_code ??
                  "XNGS"}
              </span>

              <span className="text-slate-700">
                •
              </span>

              <span className={feed.line}>
                {feedState ===
                "OFFLINE"
                  ? "Market feed offline"
                  : `Updated ${getFreshnessText(
                      freshnessSeconds,
                    )}`}
              </span>

              <span className="text-slate-700">
                •
              </span>

              <span className="text-slate-500">
                Twelve Data
              </span>

              {aaplError && (
                <>
                  <span className="text-slate-700">
                    •
                  </span>

                  <span className="text-rose-400">
                    {aaplError}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 min-w-0 xl:min-w-[440px]">
            {[
              [
                "Open",
                formatNumber(
                  aaplRawData?.open,
                ),
              ],
              [
                "High",
                formatNumber(
                  aaplRawData?.high,
                ),
              ],
              [
                "Low",
                formatNumber(
                  aaplRawData?.low,
                ),
              ],
              [
                "Volume",
                formatVolume(
                  aaplRawData?.volume,
                ),
              ],
            ].map(
              ([label, value]) => (
                <div
                  key={label}
                  className="bg-black/30 border border-white/5 rounded-lg px-3 py-2"
                >
                  <div className="text-[9px] uppercase text-slate-500 font-mono">
                    {label}
                  </div>

                  <div className="text-xs font-mono text-white mt-0.5">
                    {value}
                  </div>
                </div>
              ),
            )}
          </div>

          <div className="shrink-0 flex flex-col items-end gap-2">
            {liveSparkline.length >
              1 && (
              <Sparkline
                data={
                  liveSparkline
                }
                color={
                  feed.sparkline
                }
                width={150}
                height={44}
              />
            )}

            {aaplRawData && (
              <div className="text-right">
                <div className="text-[9px] uppercase text-slate-500 font-mono">
                  52W Range
                </div>

                <div className="text-[10px] text-slate-300 font-mono mt-0.5">
                  {formatNumber(
                    aaplRawData.fifty_two_week_low,
                  )}{" "}
                  —{" "}
                  {formatNumber(
                    aaplRawData.fifty_two_week_high,
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-white/5 pt-3 mt-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {[
              [
                "Day Change",
                dayChangePct ===
                null
                  ? "—"
                  : `${dayChangePct > 0 ? "+" : ""}${dayChangePct.toFixed(2)}%`,
              ],
              [
                "Day Range",
                intelligenceDayRange ===
                null
                  ? "—"
                  : `${intelligenceDayRange.toFixed(2)}%`,
              ],
              [
                "Range Position",
                intelligenceRangePosition ===
                null
                  ? "—"
                  : `${intelligenceRangePosition.toFixed(1)}%`,
              ],
              [
                "Tick Volatility",
                intelligenceVolatility ===
                null
                  ? "—"
                  : `${intelligenceVolatility.toFixed(3)}%`,
              ],
              [
                "Volume",
                formatVolume(
                  intelligenceVolume,
                ),
              ],
            ].map(
              ([label, value]) => (
                <div
                  key={label}
                  className="bg-black/30 border border-white/5 rounded-lg px-3 py-2"
                >
                  <div className="text-[9px] uppercase text-slate-500 font-mono">
                    {label}
                  </div>

                  <div className="text-xs font-mono text-white mt-0.5">
                    {value}
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      </div>

      {/* Decision Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#111319] border border-rose-500/25 rounded-xl p-5 space-y-4 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-500 animate-pulse" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusBadge
                type={
                  topAnomaly?.severity ===
                  "CRITICAL"
                    ? "CRITICAL"
                    : "WARNING"
                }
                label={
                  topAnomaly
                    ? `${topAnomaly.severity} ANOMALY`
                    : "NO ACTIVE ANOMALY"
                }
              />

              <span className="text-xs font-mono text-slate-400">
                Live analysis
              </span>
            </div>

            <button
              onClick={() =>
                onNavigate(
                  "root-cause-analysis",
                )
              }
              className="text-xs font-mono text-rose-400 hover:text-rose-300 flex items-center gap-1 font-semibold"
            >
              <span>
                Explore Causal Graph
              </span>
              <GitFork className="w-3.5 h-3.5" />
            </button>
          </div>

          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              {topAnomaly?.metric ??
                "No anomaly"}
            </h3>

            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {topAnomaly?.explanation ??
                "No active anomaly explanation is available."}
            </p>
          </div>

          {topAnomaly && (
            <div className="grid grid-cols-3 gap-2 bg-black/40 p-3 rounded-lg border border-white/6 font-mono text-xs">
              <div>
                <div className="text-[10px] text-slate-400 uppercase">
                  Observed
                </div>

                <div className="text-rose-400 font-bold text-sm">
                  {formatNumber(
                    topAnomaly.current_value,
                  )}
                </div>
              </div>

              <div>
                <div className="text-[10px] text-slate-400 uppercase">
                  Expected
                </div>

                <div className="text-slate-300 text-sm">
                  {formatNumber(
                    topAnomaly.expected_value,
                  )}
                </div>
              </div>

              <div>
                <div className="text-[10px] text-slate-400 uppercase">
                  Deviation
                </div>

                <div className="text-rose-400 font-bold text-sm">
                  {topAnomaly.deviation_pct >
                  0
                    ? "+"
                    : ""}
                  {
                    topAnomaly.deviation_pct
                  }
                  %
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span>
                {anomalyData
                  ?.anomalies_detected ??
                  0}{" "}
                detected anomalies
              </span>
            </div>

            <button
              onClick={() =>
                onNavigate(
                  "root-cause-analysis",
                )
              }
              className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 text-xs font-mono font-medium flex items-center gap-1.5"
            >
              <GitFork className="w-3.5 h-3.5" />
              <span>
                Launch RCA Workspace
              </span>
            </button>
          </div>
        </div>

        <div className="bg-[#111319] border border-cyan-500/25 rounded-xl p-5 space-y-4 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#00F4FE] via-[#3B82F6] to-[#00F4FE]" />

          <div className="flex items-center justify-between">
            <span className="px-2 py-0.5 rounded-md bg-[#00F4FE]/15 border border-[#00F4FE]/30 text-[#00F4FE] text-xs font-mono font-semibold">
              AI DECISION
            </span>

            <span className="text-xs font-mono text-emerald-400 font-bold">
              {topDecision
                ? `${topDecision.confidence}% CONFIDENCE`
                : "NO ACTIVE DECISION"}
            </span>
          </div>

          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              {topDecision?.title ??
                "No active decision"}
            </h3>

            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {topDecision?.rationale ??
                decisionData?.summary ??
                "No decision intelligence summary is available."}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 bg-black/40 p-3 rounded-lg border border-white/6 font-mono text-xs">
            <div>
              <div className="text-[10px] text-slate-400 uppercase">
                Priority
              </div>

              <div className="text-[#00F4FE] font-bold text-sm">
                {topDecision
                  ?.priority ??
                  "—"}
              </div>
            </div>

            <div>
              <div className="text-[10px] text-slate-400 uppercase">
                Risk
              </div>

              <div className="text-emerald-400 font-bold text-sm">
                {topDecision
                  ?.risk_level ??
                  "—"}
              </div>
            </div>

            <div>
              <div className="text-[10px] text-slate-400 uppercase">
                Impact
              </div>

              <div className="text-slate-300 font-bold text-sm">
                {topDecision
                  ?.expected_impact
                  ? "Defined"
                  : "—"}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() =>
                onNavigate(
                  "scenario-simulator",
                )
              }
              className="text-xs font-mono text-slate-400 hover:text-[#00F4FE] flex items-center gap-1"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>
                Simulate in What-If Engine
              </span>
            </button>

            <button
              onClick={() =>
                onNavigate(
                  "decision-intelligence",
                )
              }
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#00F4FE] to-[#3B82F6] hover:opacity-90 text-black text-xs font-mono font-bold flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>
                Review Decision
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Regional Performance + Live Ticker */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-[#111319] border border-white/8 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs uppercase font-mono tracking-wider text-slate-400 font-semibold flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-[#00F4FE]" />
              Cross-Regional Business Performance
            </h3>

            <span className="text-xs font-mono text-slate-400">
              {highestRegionRevenue
                ? `Top: ${highestRegionRevenue.region}`
                : "No data"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {regions.map(
              (region) => {
                const fillPct =
                  maxRegionRevenue >
                  0
                    ? Math.round(
                        (region.revenue /
                          maxRegionRevenue) *
                          100,
                      )
                    : 0;

                return (
                  <div
                    key={
                      region.region
                    }
                    className="bg-[#151821] p-3.5 rounded-lg border border-white/6 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-200 font-medium">
                        {
                          region.region
                        }
                      </span>

                      <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {
                          region.order_count
                        }{" "}
                        orders
                      </span>
                    </div>

                    <div className="text-xl font-bold font-mono text-white">
                      {formatCurrency(
                        region.revenue,
                      )}
                    </div>

                    <div className="text-xs font-mono text-slate-400">
                      Revenue contribution
                    </div>

                    <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#00F4FE]"
                        style={{
                          width: `${fillPct}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              },
            )}

            {regions.length ===
              0 && (
              <div className="md:col-span-4 rounded-lg border border-white/8 p-6 text-center text-xs text-slate-500 font-mono">
                No regional performance data available.
              </div>
            )}
          </div>
        </div>

        <div className="bg-[#111319] border border-white/8 rounded-xl p-5 space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h3 className="text-xs uppercase font-mono tracking-wider text-slate-400 font-semibold flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              Live Ingestion
            </h3>

            <button
              onClick={() =>
                onNavigate(
                  "live-intelligence",
                )
              }
              className="text-xs font-mono text-[#00F4FE] hover:underline"
            >
              View Full Stream
            </button>
          </div>

          <div className="space-y-2 flex-1">
            <div className="bg-black/30 p-3 rounded border border-white/5 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400">
                  LIVE
                </span>
              </div>

              <div className="text-slate-300 mt-2">
                Live market and telemetry streams are available in the Live Intelligence workspace.
              </div>
            </div>

            <div className="bg-black/30 p-3 rounded border border-white/5 text-xs font-mono">
              <div className="text-slate-500">
                Current backend state
              </div>

              <div className="text-[#00F4FE] mt-1">
                {aaplRawData
                  ? "Market feed connected"
                  : "Awaiting market feed"}
              </div>
            </div>
          </div>

          <button
            onClick={() =>
              onNavigate(
                "live-intelligence",
              )
            }
            className="w-full py-2 rounded-lg bg-[#161922] hover:bg-[#1C212E] border border-white/10 text-xs font-mono text-slate-300 flex items-center justify-center gap-2"
          >
            <span>
              Open Real-Time Analytics Pipeline
            </span>

            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};