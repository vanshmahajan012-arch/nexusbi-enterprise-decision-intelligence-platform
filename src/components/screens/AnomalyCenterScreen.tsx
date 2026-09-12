import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  GitFork,
  CheckCircle,
  VolumeX,
  Filter,
  ArrowRight,
  Sparkles,
  Activity,
  RefreshCw,
} from "lucide-react";

import { StatusBadge } from "../shared/StatusBadge";
import { apiFetch } from "../../services/api";
import {
  AnomalyItem,
  ScreenId,
} from "../../types";

interface AnomalyCenterScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onSelectAnomalyForRca?: (
    anomaly: AnomalyItem,
  ) => void;
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

interface BackendResponse {
  status: string;
  metrics_analyzed: number;
  anomalies_evaluated: number;
  anomalies_detected: number;
  critical_count: number;
  major_count: number;
  results: BackendAnomaly[];
  detected_anomalies: BackendAnomaly[];
}

const METRIC_LABELS: Record<string, string> = {
  revenue: "Revenue",
  orders: "Orders",
  units: "Units",
  aov: "Average Order Value",
};

const toUiSeverity = (
  severity: string,
): AnomalyItem["severity"] => {
  if (
    severity === "CRITICAL" ||
    severity === "MAJOR" ||
    severity === "MINOR"
  ) {
    return severity;
  }

  return "MINOR";
};

const toStatus = (
  anomaly: BackendAnomaly,
): AnomalyItem["status"] => {
  return anomaly.is_anomaly
    ? "ACTIVE"
    : "RESOLVED";
};

const toAnomalyItem = (
  anomaly: BackendAnomaly,
): AnomalyItem => {
  const metricLabel =
    METRIC_LABELS[anomaly.metric] ??
    anomaly.metric;

  return {
    id: `ANOMALY-${anomaly.metric}`,
    title: `${metricLabel} anomaly detected`,
    metricKey: anomaly.metric,
    metricDisplayName: metricLabel,
    severity: toUiSeverity(
      anomaly.severity,
    ),
    status: toStatus(anomaly),
    zScore: anomaly.z_score,
    detectedAt: "Current analysis",
    aiHypothesis: anomaly.explanation,
    affectedDimension: metricLabel,
    currentValue: String(anomaly.current_value),
    expectedRange: String(anomaly.expected_value),
    deltaPct: anomaly.deviation_pct,
    correlatedEventsCount: 0,
    rcaReady: anomaly.is_anomaly,
  };
};

export const AnomalyCenterScreen: React.FC<
  AnomalyCenterScreenProps
> = ({
  onNavigate,
  onSelectAnomalyForRca,
}) => {
  const [anomalies, setAnomalies] =
    useState<AnomalyItem[]>([]);

  const [severityFilter, setSeverityFilter] =
    useState("ALL");

  const [statusFilter, setStatusFilter] =
    useState("ALL");

  const [isLoading, setIsLoading] =
    useState(true);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const loadAnomalies = async (
    showRefreshState = false,
  ) => {
    if (showRefreshState) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError(null);

    try {
      const response = await apiFetch(
        "/api/analytics/anomalies?z_threshold=2",
      );

      if (!response.ok) {
        throw new Error(
          `Failed to load anomalies (${response.status})`,
        );
      }

      const data =
        (await response.json()) as BackendResponse;

      const mapped = data.results.map(
        toAnomalyItem,
      );

      setAnomalies(mapped);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load anomaly data.",
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void loadAnomalies();
  }, []);

  const handleMute = (
    id: string,
  ) => {
    setAnomalies((prev) =>
      prev.map((anomaly) =>
        anomaly.id === id
          ? {
              ...anomaly,
              status: "MUTED",
            }
          : anomaly,
      ),
    );
  };

  const handleAcknowledge = (
    id: string,
  ) => {
    setAnomalies((prev) =>
      prev.map((anomaly) =>
        anomaly.id === id
          ? {
              ...anomaly,
              status:
                "INVESTIGATING",
            }
          : anomaly,
      ),
    );
  };

  const handleTriggerRca = (
    anomaly: AnomalyItem,
  ) => {
    onSelectAnomalyForRca?.(
      anomaly,
    );

    onNavigate(
      "root-cause-analysis",
    );
  };

  const filteredAnomalies =
    useMemo(
      () =>
        anomalies.filter(
          (anomaly) => {
            const matchesSeverity =
              severityFilter ===
                "ALL" ||
              anomaly.severity ===
                severityFilter;

            const matchesStatus =
              statusFilter === "ALL" ||
              anomaly.status ===
                statusFilter;

            return (
              matchesSeverity &&
              matchesStatus
            );
          },
        ),
      [
        anomalies,
        severityFilter,
        statusFilter,
      ],
    );

  const activeDeviations =
    anomalies.filter(
      (anomaly) =>
        anomaly.status ===
        "ACTIVE",
    ).length;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111319] border border-white/8 rounded-xl p-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-mono font-semibold">
              STATISTICAL & ML ANOMALY RADAR
            </span>

            <span className="text-xs text-slate-500 font-mono">
              Live backend analysis
            </span>
          </div>

          <h1 className="text-xl font-bold text-white tracking-tight">
            Enterprise Anomaly Command Center
          </h1>

          <p className="text-xs text-slate-400">
            Real-time isolation of business metric deviations.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="px-3 py-2 rounded-lg bg-black/40 border border-white/8 text-slate-300">
            Active Deviations:
            {" "}
            <strong className="text-rose-400 font-bold">
              {activeDeviations}
            </strong>
          </div>

          <button
            onClick={() =>
              void loadAnomalies(
                true,
              )
            }
            disabled={
              isRefreshing
            }
            className="px-3 py-2 rounded-lg bg-[#181B24] hover:bg-[#202532] border border-white/10 text-slate-300"
            title="Refresh"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                isRefreshing
                  ? "animate-spin"
                  : ""
              }`}
            />
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 flex items-center gap-2 text-xs font-mono text-rose-200">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#111319] border border-white/8 rounded-xl p-3 text-xs font-mono">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-400 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-[#00F4FE]" />
            Severity:
          </span>

          {[
            "ALL",
            "CRITICAL",
            "MAJOR",
            "MINOR",
          ].map((severity) => (
            <button
              key={severity}
              onClick={() =>
                setSeverityFilter(
                  severity,
                )
              }
              className={`px-2.5 py-1 rounded-md transition-colors ${
                severityFilter ===
                severity
                  ? "bg-[#00F4FE]/15 text-[#00F4FE] border border-[#00F4FE]/30 font-semibold"
                  : "bg-[#14171F] text-slate-400 hover:text-white border border-white/6"
              }`}
            >
              {severity}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-400">
            Status:
          </span>

          {[
            "ALL",
            "ACTIVE",
            "INVESTIGATING",
            "MITIGATED",
            "RESOLVED",
            "MUTED",
          ].map((status) => (
            <button
              key={status}
              onClick={() =>
                setStatusFilter(
                  status,
                )
              }
              className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                statusFilter ===
                status
                  ? "bg-white/15 text-white font-semibold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="bg-[#111319] border border-white/8 rounded-xl p-10 text-center">
          <RefreshCw className="w-6 h-6 mx-auto mb-3 animate-spin text-[#00F4FE]" />
          <div className="text-xs text-slate-400 font-mono">
            Running anomaly analysis...
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAnomalies.map(
            (anomaly) => {
              const isCritical =
                anomaly.severity ===
                "CRITICAL";

              return (
                <div
                  key={anomaly.id}
                  className={`bg-[#111319] rounded-xl p-5 border transition-all duration-200 ${
                    isCritical
                      ? "border-rose-500/40 shadow-xl shadow-rose-500/5"
                      : "border-white/8 hover:border-white/16 shadow-lg"
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-white/6 pb-3">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <StatusBadge
                        type={
                          anomaly.severity
                        }
                      />

                      <span className="text-sm font-bold text-white tracking-tight">
                        {
                          anomaly.title
                        }
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-mono">
                      <span className="px-2 py-0.5 rounded bg-black/40 text-slate-300 border border-white/6">
                        Deviation:
                        {" "}
                        <strong
                          className={
                            anomaly.zScore <
                            0
                              ? "text-rose-400"
                              : "text-amber-400"
                          }
                        >
                          {anomaly.zScore >
                          0
                            ? `+${anomaly.zScore}Ïƒ`
                            : `${anomaly.zScore}Ïƒ`}
                        </strong>
                      </span>

                      <StatusBadge
                        type={
                          anomaly.status
                        }
                        size="sm"
                        showDot={false}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 my-4">
                    <div className="lg:col-span-2 space-y-2">
                      <div className="text-xs font-mono text-[#00F4FE] font-semibold flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        Detection Explanation:
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed bg-black/30 p-3 rounded-lg border border-white/5">
                        {
                          anomaly.aiHypothesis
                        }
                      </p>

                      <div className="text-[11px] font-mono text-slate-400">
                        Target Metric:
                        {" "}
                        <span className="text-slate-200">
                          {
                            anomaly.affectedDimension
                          }
                        </span>
                      </div>
                    </div>

                    <div className="bg-[#161922] p-3.5 rounded-lg border border-white/6 flex flex-col justify-between font-mono text-xs">
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase">
                          Observed vs Expected
                        </div>

                        <div className="text-lg font-bold text-white mt-0.5 flex items-baseline gap-2">
                          <span
                            className={
                              anomaly.deltaPct <
                              0
                                ? "text-rose-400"
                                : "text-amber-400"
                            }
                          >
                            {anomaly.currentValue}
                          </span>

                          <span className="text-xs text-slate-500 font-normal">
                            (exp:
                            {" "}
                            {
                              anomaly.expectedRange
                            }
                            )
                          </span>
                        </div>
                      </div>

                      <div className="mt-2 pt-2 border-t border-white/6 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">
                          Net Metric Shift:
                        </span>

                        <span
                          className={`font-bold ${
                            anomaly.deltaPct <
                            0
                              ? "text-rose-400"
                              : "text-amber-400"
                          }`}
                        >
                          {anomaly.deltaPct >
                          0
                            ? `+${anomaly.deltaPct}%`
                            : `${anomaly.deltaPct}%`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/6">
                    <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                      <Activity className="w-3.5 h-3.5 text-[#00F4FE]" />

                      <span>
                        Business materiality:
                        {" "}
                        {Math.abs(
                          anomaly.deltaPct,
                        ).toFixed(
                          2,
                        )}
                        %
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {anomaly.status ===
                        "ACTIVE" && (
                        <button
                          onClick={() =>
                            handleAcknowledge(
                              anomaly.id,
                            )
                          }
                          className="px-3 py-1.5 rounded-lg bg-[#181B24] hover:bg-[#202532] border border-white/10 text-slate-300 text-xs font-mono flex items-center gap-1.5"
                        >
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                          Acknowledge
                        </button>
                      )}

                      {anomaly.status !==
                        "MUTED" && (
                        <button
                          onClick={() =>
                            handleMute(
                              anomaly.id,
                            )
                          }
                          className="px-3 py-1.5 rounded-lg bg-[#181B24] hover:bg-[#202532] border border-white/10 text-slate-400 hover:text-white text-xs font-mono flex items-center gap-1.5"
                        >
                          <VolumeX className="w-3.5 h-3.5" />
                          Mute
                        </button>
                      )}

                      {anomaly.rcaReady && (
                        <button
                          onClick={() =>
                            handleTriggerRca(
                              anomaly,
                            )
                          }
                          className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-rose-500 to-amber-500 hover:opacity-90 text-white font-bold text-xs font-mono flex items-center gap-1.5"
                        >
                          <GitFork className="w-3.5 h-3.5" />
                          Launch RCA Workspace
                          <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            },
          )}

          {filteredAnomalies.length ===
            0 && (
            <div className="bg-[#111319] border border-white/8 rounded-xl p-8 text-center">
              <AlertTriangle className="w-7 h-7 mx-auto text-slate-500 mb-2" />

              <div className="text-sm font-bold text-white">
                No anomalies found
              </div>

              <div className="text-xs text-slate-500 font-mono mt-1">
                No anomalies match the selected filters.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};