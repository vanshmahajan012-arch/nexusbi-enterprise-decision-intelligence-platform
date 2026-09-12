import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Pause,
  Play,
  Filter,
  RefreshCw,
  Server,
  Radio,
  Clock,
  AlertTriangle,
  ArrowUpRight,
} from "lucide-react";

import { StatusBadge } from "../shared/StatusBadge";

interface LiveEvent {
  id: string;
  timestamp: string | null;
  source: string;
  eventType: string;
  entityId: string;
  amountUsd?: number | null;
  status: "SUCCESS" | "WARNING";
  latencyMs: number;
  details: string;
  region: string;
}

interface TelemetryResponse {
  status: string;
  count: number;
  events: LiveEvent[];
}

const API_BASE_URL = "http://127.0.0.1:8000";

const SOURCES = [
  "ALL",
];

export const LiveIntelligenceScreen: React.FC = () => {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedSource, setSelectedSource] =
    useState("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] =
    useState(false);
  const [error, setError] = useState<string | null>(
    null,
  );

  const loadEvents = async (
    refresh = false,
  ) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/telemetry/recent?limit=50`,
      );

      if (!response.ok) {
        throw new Error(
          `Telemetry request failed (${response.status})`,
        );
      }

      const data =
        (await response.json()) as TelemetryResponse;

      setEvents(data.events ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load telemetry.",
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void loadEvents();

    const interval = window.setInterval(() => {
      if (!isPaused) {
        void loadEvents(true);
      }
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, [isPaused]);

  const filteredEvents = useMemo(() => {
    if (selectedSource === "ALL") {
      return events;
    }

    return events.filter(
      (event) => event.source === selectedSource,
    );
  }, [events, selectedSource]);

  const warningCount = events.filter(
    (event) => event.status === "WARNING",
  ).length;

  const avgLatency =
    events.length > 0
      ? events.reduce(
          (sum, event) => sum + event.latencyMs,
          0,
        ) / events.length
      : 0;

  const sourceOptions = [
    "ALL",
    ...Array.from(
      new Set(events.map((event) => event.source)),
    ),
  ];

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111319] border border-white/8 rounded-xl p-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold">
              <Radio className="w-3.5 h-3.5" />
              LIVE TELEMETRY
            </span>

            <span className="text-xs text-slate-500 font-mono">
              Backend polling: 5s
            </span>
          </div>

          <h1 className="text-xl font-bold text-white tracking-tight">
            Distributed Ingestion & Real-Time Event Bus
          </h1>

          <p className="text-xs text-slate-400">
            Live events retrieved from the NXUS telemetry warehouse.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setIsPaused((value) => !value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs font-semibold transition-all ${
              isPaused
                ? "bg-emerald-500 hover:bg-emerald-400 text-black"
                : "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30"
            }`}
          >
            {isPaused ? (
              <Play className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Pause className="w-3.5 h-3.5 fill-current" />
            )}
            {isPaused
              ? "Resume Polling"
              : "Pause Polling"}
          </button>

          <button
            onClick={() => void loadEvents(true)}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-[#181B24] hover:bg-[#202532] border border-white/10 text-slate-300"
            title="Refresh telemetry"
          >
            <RefreshCw
              className={`w-4 h-4 ${
                isRefreshing ? "animate-spin" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-xs font-mono text-rose-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#111319] border border-white/8 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>EVENTS IN BUFFER</span>
            <Activity className="w-3.5 h-3.5 text-[#00F4FE]" />
          </div>

          <div className="text-2xl font-bold font-mono text-white">
            {events.length}
          </div>

          <div className="text-[11px] font-mono text-slate-400">
            Real telemetry records
          </div>
        </div>

        <div className="bg-[#111319] border border-white/8 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>AVG LATENCY</span>
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
          </div>

          <div className="text-2xl font-bold font-mono text-emerald-400">
            {events.length
              ? `${avgLatency.toFixed(1)}ms`
              : "—"}
          </div>

          <div className="text-[11px] font-mono text-slate-400">
            Derived from actual events
          </div>
        </div>

        <div className="bg-[#111319] border border-white/8 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>WARNING EVENTS</span>
            <Server className="w-3.5 h-3.5 text-amber-400" />
          </div>

          <div className="text-2xl font-bold font-mono text-amber-400">
            {warningCount}
          </div>

          <div className="text-[11px] font-mono text-slate-400">
            Current telemetry window
          </div>
        </div>

        <div className="bg-[#111319] border border-white/8 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>STREAM STATUS</span>
            <Radio className="w-3.5 h-3.5 text-[#00F4FE]" />
          </div>

          <div
            className={`text-2xl font-bold font-mono ${
              error
                ? "text-rose-400"
                : "text-emerald-400"
            }`}
          >
            {error
              ? "ERROR"
              : "CONNECTED"}
          </div>

          <div className="text-[11px] font-mono text-slate-400">
            {events.length
              ? "Telemetry available"
              : "Telemetry table currently empty"}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <span className="text-xs font-mono text-slate-400 mr-2 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            Filter Source:
          </span>

          {sourceOptions.map((source) => (
            <button
              key={source}
              onClick={() =>
                setSelectedSource(source)
              }
              className={`px-3 py-1 rounded-md text-xs font-mono ${
                selectedSource === source
                  ? "bg-[#00F4FE]/15 text-[#00F4FE] border border-[#00F4FE]/30 font-semibold"
                  : "bg-[#14171F] text-slate-400 hover:text-white border border-white/6"
              }`}
            >
              {source}
            </button>
          ))}
        </div>

        <div className="text-xs font-mono text-slate-400">
          Showing {filteredEvents.length} events
        </div>
      </div>

      <div className="bg-[#111319] border border-white/8 rounded-xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-10 text-center">
            <RefreshCw className="w-6 h-6 mx-auto mb-3 animate-spin text-[#00F4FE]" />
            <div className="text-xs text-slate-400 font-mono">
              Loading telemetry...
            </div>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-12 text-center">
            <Activity className="w-8 h-8 mx-auto mb-3 text-slate-600" />

            <div className="text-sm font-bold text-white">
              No telemetry events available
            </div>

            <div className="text-xs text-slate-500 font-mono mt-2 max-w-md mx-auto">
              The NXUS telemetry backend is connected, but
              warehouse.fct_telemetry_events currently contains
              no records.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0C0E14] text-slate-400 uppercase tracking-wider text-[10px] border-b border-white/8">
                <tr>
                  <th className="py-3 px-4">
                    Timestamp
                  </th>
                  <th className="py-3 px-4">
                    Source
                  </th>
                  <th className="py-3 px-4">
                    Event Type
                  </th>
                  <th className="py-3 px-4">
                    Entity
                  </th>
                  <th className="py-3 px-4">
                    Details
                  </th>
                  <th className="py-3 px-4">
                    Latency
                  </th>
                  <th className="py-3 px-4">
                    Region
                  </th>
                  <th className="py-3 px-4 text-right">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/5">
                {filteredEvents.map(
                  (event) => (
                    <tr
                      key={event.id}
                      className="hover:bg-white/4 transition-colors"
                    >
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        {event.timestamp ?? "—"}
                      </td>

                      <td className="py-3 px-4 font-semibold text-[#00F4FE] whitespace-nowrap">
                        {event.source}
                      </td>

                      <td className="py-3 px-4 text-slate-200 whitespace-nowrap">
                        {event.eventType}
                      </td>

                      <td className="py-3 px-4 text-slate-400">
                        {event.entityId}
                      </td>

                      <td className="py-3 px-4 text-slate-300">
                        {event.details}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={
                            event.latencyMs > 200
                              ? "text-amber-400"
                              : "text-slate-300"
                          }
                        >
                          {event.latencyMs.toFixed(1)}
                          ms
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-500">
                        {event.region}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <StatusBadge
                          type={event.status}
                          size="sm"
                        />
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};