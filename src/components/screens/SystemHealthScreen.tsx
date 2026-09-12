import React, {
  useEffect,
  useState,
} from "react";

import {
  Server,
  Activity,
  Database,
  Radio,
  Clock,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  BookOpen,
  Zap,
} from "lucide-react";

import { StatusBadge } from "../shared/StatusBadge";
import { ScreenId } from "../../types";
import { apiFetch } from "../../services/api";

interface SystemHealthScreenProps {
  onNavigate: (
    screen: ScreenId,
  ) => void;
}

interface ComponentHealth {
  status: string;
  latency_ms?: number | null;
  error?: string | null;
  feed_status?: string;
  age_seconds?: number | null;
  reconnect_count?: number;
  total_chunks?: number;
  embedded_chunks?: number;
  embedding_coverage_pct?: number;
  event_count?: number;
  message?: string;
}

interface SystemHealthResponse {
  status: string;
  checked_at: number;
  components: {
    api: ComponentHealth;
    postgresql: ComponentHealth;
    market_feed: ComponentHealth;
    knowledge_store: ComponentHealth;
    telemetry: ComponentHealth;
  };
}

function badgeType(
  status: string,
): "HEALTHY" | "WARNING" | "CRITICAL" {
  if (
    status === "HEALTHY" ||
    status === "LIVE"
  ) {
    return "HEALTHY";
  }

  if (
    status === "WARNING" ||
    status === "DEGRADED" ||
    status === "STALE" ||
    status === "CONNECTING"
  ) {
    return "WARNING";
  }

  return "CRITICAL";
}

export const SystemHealthScreen: React.FC<
  SystemHealthScreenProps
> = ({
  onNavigate,
}) => {
  const [
    data,
    setData,
  ] =
    useState<SystemHealthResponse | null>(
      null,
    );

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isRefreshing,
    setIsRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const loadHealth =
    async (
      refresh = false,
    ) => {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setError(null);

      try {
        const response =
          await apiFetch(
            "/api/system/health",
          );

        if (!response.ok) {
          throw new Error(
            `System health request failed (${response.status})`,
          );
        }

        const result =
          (await response.json()) as SystemHealthResponse;

        setData(result);
      } catch (
        healthError
      ) {
        setError(
          healthError instanceof
            Error
            ? healthError.message
            : "Unable to load system health.",
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    };

  useEffect(() => {
    void loadHealth();

    const interval =
      window.setInterval(() => {
        void loadHealth(true);
      }, 5000);

    return () =>
      window.clearInterval(
        interval,
      );
  }, []);

  const components =
    data?.components;

  const serviceRows = components
    ? [
        {
          name: "NXUS API",
          category: "Application",
          component:
            components.api,
        },
        {
          name: "PostgreSQL / Supabase",
          category: "Database",
          component:
            components.postgresql,
        },
        {
          name: "Live Market Feed",
          category: "Market / WebSocket",
          component:
            components.market_feed,
        },
        {
          name: "Knowledge Store",
          category:
            "RAG Knowledge Base",
          component:
            components.knowledge_store,
        },
        {
          name: "Telemetry Warehouse",
          category:
            "Telemetry Ingestion",
          component:
            components.telemetry,
        },
      ]
    : [];

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111319] border border-white/8 rounded-xl p-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold flex items-center gap-1">
              <Server className="w-3.5 h-3.5" />
              INFRASTRUCTURE & PLATFORM HEALTH
            </span>

            <span className="text-xs text-slate-500 font-mono">
              Real backend diagnostics
            </span>
          </div>

          <h1 className="text-xl font-bold text-white tracking-tight">
            System & Cluster Observability
          </h1>

          <p className="text-xs text-slate-400">
            Live state of the application, database, market feed, knowledge store, and telemetry warehouse.
          </p>
        </div>

        <button
          onClick={() =>
            void loadHealth(true)
          }
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#181B24] hover:bg-[#202532] border border-white/10 text-slate-300 font-mono text-xs"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${
              isRefreshing
                ? "animate-spin text-[#00F4FE]"
                : ""
            }`}
          />

          Refresh Diagnostics
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-xs font-mono text-rose-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="bg-[#111319] border border-white/8 rounded-xl p-10 text-center">
          <RefreshCw className="w-6 h-6 mx-auto mb-3 animate-spin text-[#00F4FE]" />

          <div className="text-xs text-slate-400 font-mono">
            Running system diagnostics...
          </div>
        </div>
      ) : (
        <>
          {/* Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
            <div className="bg-[#111319] border border-white/8 rounded-xl p-4 space-y-1">
              <div className="text-[10px] text-slate-400 uppercase">
                Overall System
              </div>

              <div
                className={`text-2xl font-bold ${
                  data?.status ===
                  "HEALTHY"
                    ? "text-emerald-400"
                    : data?.status ===
                        "WARNING"
                      ? "text-amber-400"
                      : "text-rose-400"
                }`}
              >
                {data?.status ??
                  "UNKNOWN"}
              </div>

              <div className="text-xs text-slate-500">
                Live backend assessment
              </div>
            </div>

            <div className="bg-[#111319] border border-white/8 rounded-xl p-4 space-y-1">
              <div className="text-[10px] text-slate-400 uppercase">
                Database Latency
              </div>

              <div className="text-2xl font-bold text-[#00F4FE]">
                {components?.postgresql
                  .latency_ms !=
                null
                  ? `${components.postgresql.latency_ms.toFixed(
                      2,
                    )}ms`
                  : "â€”"}
              </div>

              <div className="text-xs text-slate-500">
                SELECT 1 health check
              </div>
            </div>

            <div className="bg-[#111319] border border-white/8 rounded-xl p-4 space-y-1">
              <div className="text-[10px] text-slate-400 uppercase">
                Knowledge Chunks
              </div>

              <div className="text-2xl font-bold text-white">
                {components?.knowledge_store
                  .total_chunks ??
                  0}
              </div>

              <div className="text-xs text-slate-500">
                Embedded:{" "}
                {
                  components?.knowledge_store
                    .embedded_chunks
                }{" "}
                (
                {
                  components?.knowledge_store
                    .embedding_coverage_pct
                }
                %)
              </div>
            </div>

            <div className="bg-[#111319] border border-white/8 rounded-xl p-4 space-y-1">
              <div className="text-[10px] text-slate-400 uppercase">
                Telemetry Events
              </div>

              <div className="text-2xl font-bold text-white">
                {components?.telemetry
                  .event_count ??
                  0}
              </div>

              <div className="text-xs text-slate-500">
                Current warehouse records
              </div>
            </div>
          </div>

          {/* Services */}
          <div className="bg-[#111319] border border-white/8 rounded-xl overflow-hidden shadow-xl">
            <div className="p-4 bg-[#0C0E14] border-b border-white/8 flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-white uppercase tracking-wider">
                Connected Infrastructure Components
              </span>

              <span className="text-slate-500">
                Auto-polled every 5s
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#0C0E14] text-slate-400 uppercase text-[10px] border-b border-white/8">
                  <tr>
                    <th className="py-3 px-4">
                      Component
                    </th>

                    <th className="py-3 px-4">
                      Category
                    </th>

                    <th className="py-3 px-4">
                      Status
                    </th>

                    <th className="py-3 px-4">
                      Metric
                    </th>

                    <th className="py-3 px-4">
                      Notes
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/5">
                  {serviceRows.map(
                    (service) => {
                      const component =
                        service.component;

                      let metric =
                        "â€”";

                      if (
                        service.name ===
                        "PostgreSQL / Supabase"
                      ) {
                        metric =
                          component.latency_ms !=
                          null
                            ? `${component.latency_ms.toFixed(
                                2,
                              )}ms`
                            : "â€”";
                      } else if (
                        service.name ===
                        "Live Market Feed"
                      ) {
                        metric =
                          component.age_seconds !=
                          null
                            ? `${component.age_seconds.toFixed(
                                1,
                              )}s age`
                            : "â€”";
                      } else if (
                        service.name ===
                        "Knowledge Store"
                      ) {
                        metric = `${component.embedding_coverage_pct ?? 0}% embedded`;
                      } else if (
                        service.name ===
                        "Telemetry Warehouse"
                      ) {
                        metric = `${component.event_count ?? 0} events`;
                      } else {
                        metric =
                          component.message ??
                          "API responding";
                      }

                      let notes =
                        "";

                      if (
                        service.name ===
                        "Live Market Feed"
                      ) {
                        notes =
                          `Feed: ${
                            component.feed_status ??
                            "UNKNOWN"
                          } Â· Reconnects: ${
                            component.reconnect_count ??
                            0
                          }`;
                      } else if (
                        service.name ===
                        "Knowledge Store"
                      ) {
                        notes =
                          "Embedding coverage is derived from PostgreSQL.";
                      } else if (
                        service.name ===
                        "Telemetry Warehouse"
                      ) {
                        notes =
                          "No telemetry records are currently available.";
                      } else if (
                        component.error
                      ) {
                        notes =
                          component.error;
                      } else {
                        notes =
                          "Live health check passed.";
                      }

                      return (
                        <tr
                          key={
                            service.name
                          }
                          className="hover:bg-white/4 transition-colors"
                        >
                          <td className="py-3 px-4 font-bold text-white">
                            {
                              service.name
                            }
                          </td>

                          <td className="py-3 px-4 text-[#00F4FE]">
                            {
                              service.category
                            }
                          </td>

                          <td className="py-3 px-4">
                            <StatusBadge
                              type={badgeType(
                                component.status,
                              )}
                              size="sm"
                            />
                          </td>

                          <td className="py-3 px-4 text-slate-200">
                            {metric}
                          </td>

                          <td className="py-3 px-4 text-slate-400 text-[11px] max-w-xs">
                            {notes}
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick navigation */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={() =>
                onNavigate(
                  "knowledge-rag",
                )
              }
              className="bg-[#111319] border border-white/8 rounded-xl p-4 text-left hover:border-purple-500/30 transition-colors"
            >
              <BookOpen className="w-4 h-4 text-purple-400 mb-2" />

              <div className="text-sm font-bold text-white">
                Knowledge / RAG
              </div>

              <div className="text-xs text-slate-500 mt-1">
                Inspect document and embedding health.
              </div>
            </button>

            <button
              onClick={() =>
                onNavigate(
                  "live-intelligence",
                )
              }
              className="bg-[#111319] border border-white/8 rounded-xl p-4 text-left hover:border-emerald-500/30 transition-colors"
            >
              <Radio className="w-4 h-4 text-emerald-400 mb-2" />

              <div className="text-sm font-bold text-white">
                Live Intelligence
              </div>

              <div className="text-xs text-slate-500 mt-1">
                Inspect telemetry availability.
              </div>
            </button>

            <button
              onClick={() =>
                onNavigate(
                  "nl-to-sql",
                )
              }
              className="bg-[#111319] border border-white/8 rounded-xl p-4 text-left hover:border-[#00F4FE]/30 transition-colors"
            >
              <Database className="w-4 h-4 text-[#00F4FE] mb-2" />

              <div className="text-sm font-bold text-white">
                Warehouse
              </div>

              <div className="text-xs text-slate-500 mt-1">
                Run validated read-only warehouse queries.
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  );
};