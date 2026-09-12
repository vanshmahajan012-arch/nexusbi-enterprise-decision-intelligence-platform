import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  GitFork,
  Sparkles,
  ArrowRight,
  Layers,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

import { StatusBadge } from "../shared/StatusBadge";
import { ScreenId } from "../../types";
import { apiFetch } from "../../services/api";

interface RootCauseAnalysisScreenProps {
  onNavigate: (screen: ScreenId) => void;
  selectedIncidentTitle?: string;
}

interface RootCauseCandidate {
  cause_type: string;
  cause: string;
  evidence: string[];
  impact_score: number;
  confidence: number;
  severity: string;
  explanation: string;
}

interface RootCauseResponse {
  status: string;
  periods: {
    current_start: string;
    current_end: string;
    previous_start: string;
    previous_end: string;
  } | null;
  candidate_count: number;
  candidates: RootCauseCandidate[];
  summary: string;
}

type BadgeSeverity =
  | "CRITICAL"
  | "MAJOR"
  | "MINOR"
  | "INFO";

const severityClass = (
  severity: string,
): string => {
  switch (severity) {
    case "CRITICAL":
      return "text-rose-400";

    case "MAJOR":
      return "text-amber-400";

    case "LOW":
      return "text-slate-300";

    default:
      return "text-slate-400";
  }
};

const toBadgeSeverity = (
  severity: string,
): BadgeSeverity => {
  switch (severity) {
    case "CRITICAL":
      return "CRITICAL";

    case "MAJOR":
      return "MAJOR";

    case "LOW":
      return "MINOR";

    case "MINOR":
      return "MINOR";

    case "INFO":
      return "INFO";

    default:
      return "INFO";
  }
};

export const RootCauseAnalysisScreen: React.FC<
  RootCauseAnalysisScreenProps
> = ({
  onNavigate,
  selectedIncidentTitle =
    "Business Root Cause Analysis",
}) => {
  const [
    data,
    setData,
  ] = useState<RootCauseResponse | null>(
    null,
  );

  const [
    selectedIndex,
    setSelectedIndex,
  ] = useState(0);

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
  ] = useState<string | null>(null);

  const loadRootCause = async (
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
          "/api/analytics/root-cause",
        );

      if (!response.ok) {
        throw new Error(
          `Root-cause request failed (${response.status})`,
        );
      }

      const result =
        (await response.json()) as RootCauseResponse;

      setData(result);
      setSelectedIndex(0);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load root-cause analysis.",
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void loadRootCause();
  }, []);

  const candidates =
    data?.candidates ?? [];

  const selectedCandidate =
    candidates[selectedIndex] ??
    null;

  const maxImpact =
    useMemo(
      () =>
        candidates.reduce(
          (
            max,
            candidate,
          ) =>
            Math.max(
              max,
              candidate.impact_score,
            ),
          0,
        ),
      [candidates],
    );

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111319] border border-white/8 rounded-xl p-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-mono font-semibold flex items-center gap-1">
              <GitFork className="w-3.5 h-3.5" />
              ROOT-CAUSE ANALYSIS
            </span>

            <span className="text-xs text-slate-500 font-mono">
              Live analytical engine
            </span>
          </div>

          <h1 className="text-xl font-bold text-white tracking-tight">
            {selectedIncidentTitle}
          </h1>

          <p className="text-xs text-slate-400">
            Ranked business root-cause candidates derived from current and previous period evidence.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-2 rounded-lg bg-black/40 border border-white/8 text-slate-300 text-xs font-mono">
            Candidates:{" "}
            <strong className="text-[#00F4FE]">
              {data?.candidate_count ?? 0}
            </strong>
          </div>

          <button
            onClick={() =>
              void loadRootCause(true)
            }
            disabled={isRefreshing}
            className="px-3 py-2 rounded-lg bg-[#181C26] hover:bg-[#202534] border border-white/10 text-slate-300"
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

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-xs font-mono text-rose-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoading ? (
        <div className="bg-[#111319] border border-white/8 rounded-xl p-10 text-center">
          <RefreshCw className="w-6 h-6 mx-auto mb-3 animate-spin text-[#00F4FE]" />

          <div className="text-xs text-slate-400 font-mono">
            Running root-cause analysis...
          </div>
        </div>
      ) : (
        <>
          {/* Period context */}
          {data?.periods && (
            <div className="bg-[#111319] border border-white/8 rounded-xl p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
                <div className="bg-black/30 rounded-lg border border-white/6 p-3">
                  <div className="text-[10px] text-slate-500 uppercase">
                    Current Period
                  </div>

                  <div className="text-slate-200 mt-1">
                    {
                      data.periods.current_start
                    }{" "}
                    â†’{" "}
                    {
                      data.periods.current_end
                    }
                  </div>
                </div>

                <div className="bg-black/30 rounded-lg border border-white/6 p-3">
                  <div className="text-[10px] text-slate-500 uppercase">
                    Previous Period
                  </div>

                  <div className="text-slate-200 mt-1">
                    {
                      data.periods.previous_start
                    }{" "}
                    â†’{" "}
                    {
                      data.periods.previous_end
                    }
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Candidates */}
            <div className="lg:col-span-2 bg-[#111319] border border-white/8 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/6 pb-3">
                <h2 className="text-xs uppercase font-mono tracking-wider text-slate-400 font-semibold flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-[#00F4FE]" />
                  Ranked Root-Cause Candidates
                </h2>

                <span className="text-xs text-slate-500 font-mono">
                  Evidence based
                </span>
              </div>

              <div className="space-y-3">
                {candidates.map(
                  (
                    candidate,
                    index,
                  ) => {
                    const isSelected =
                      selectedIndex ===
                      index;

                    const width =
                      maxImpact > 0
                        ? (candidate.impact_score /
                            maxImpact) *
                          100
                        : 0;

                    return (
                      <button
                        key={`${candidate.cause}-${index}`}
                        onClick={() =>
                          setSelectedIndex(
                            index,
                          )
                        }
                        className={`w-full text-left p-4 rounded-xl border transition-all ${
                          isSelected
                            ? "bg-[#181C26] border-2 border-[#00F4FE] shadow-lg shadow-[#00F4FE]/10"
                            : "bg-[#141720] hover:bg-[#1A1E29] border-white/8"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-black/40 ${severityClass(
                                  candidate.severity,
                                )}`}
                              >
                                {
                                  candidate.severity
                                }
                              </span>

                              <span className="text-[10px] uppercase font-mono text-slate-500">
                                {
                                  candidate.cause_type
                                }
                              </span>
                            </div>

                            <div className="text-sm font-bold text-white mt-2">
                              {
                                candidate.cause
                              }
                            </div>

                            <div className="text-xs text-slate-400 mt-1">
                              {
                                candidate.explanation
                              }
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-[10px] text-slate-500 uppercase font-mono">
                              Impact
                            </div>

                            <div className="text-lg font-bold text-rose-400 font-mono">
                              {candidate.impact_score.toFixed(
                                2,
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3">
                          <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-rose-500"
                              style={{
                                width: `${width}%`,
                              }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-3 text-[10px] font-mono">
                          <span className="text-slate-500">
                            Confidence
                          </span>

                          <span className="text-emerald-400 font-bold">
                            {candidate.confidence.toFixed(
                              2,
                            )}
                            %
                          </span>
                        </div>
                      </button>
                    );
                  },
                )}

                {candidates.length ===
                  0 && (
                  <div className="p-8 text-center text-xs text-slate-500 font-mono">
                    No root-cause candidates are available.
                  </div>
                )}
              </div>
            </div>

            {/* Inspector */}
            <div className="bg-[#111319] border border-white/8 rounded-xl p-5 space-y-4 flex flex-col justify-between">
              {selectedCandidate ? (
                <>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-white/6 pb-3">
                      <h3 className="text-xs uppercase font-mono tracking-wider text-slate-400 font-semibold">
                        Candidate Inspector
                      </h3>

                      <StatusBadge
                        type={toBadgeSeverity(
                          selectedCandidate.severity,
                        )}
                      />
                    </div>

                    <div>
                      <div className="text-[10px] uppercase font-mono text-slate-500">
                        Selected Candidate
                      </div>

                      <h4 className="text-base font-bold text-white mt-1">
                        {
                          selectedCandidate.cause
                        }
                      </h4>

                      <div className="text-xs font-mono text-[#00F4FE] mt-1">
                        Type:{" "}
                        {
                          selectedCandidate.cause_type
                        }
                      </div>
                    </div>

                    <div className="bg-black/40 p-3.5 rounded-lg border border-white/6 space-y-3">
                      <div className="text-[11px] font-mono text-slate-400 uppercase">
                        Evidence
                      </div>

                      {selectedCandidate.evidence?.map(
                        (
                          evidence,
                          index,
                        ) => (
                          <div
                            key={index}
                            className="flex gap-2 text-xs text-slate-300"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />

                            <span>
                              {
                                evidence
                              }
                            </span>
                          </div>
                        ),
                      )}

                      {(!selectedCandidate.evidence ||
                        selectedCandidate.evidence.length ===
                          0) && (
                        <div className="text-xs text-slate-500">
                          No supporting evidence returned.
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 font-mono text-xs">
                      <div className="flex items-center justify-between py-1.5 border-b border-white/6">
                        <span className="text-slate-400">
                          Impact Score:
                        </span>

                        <span className="font-bold text-rose-400">
                          {selectedCandidate.impact_score.toFixed(
                            2,
                          )}
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-1.5 border-b border-white/6">
                        <span className="text-slate-400">
                          Confidence:
                        </span>

                        <span className="font-bold text-emerald-400">
                          {selectedCandidate.confidence.toFixed(
                            2,
                          )}
                          %
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-1.5">
                        <span className="text-slate-400">
                          Severity:
                        </span>

                        <span className="text-slate-200 font-bold">
                          {
                            selectedCandidate.severity
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      onNavigate(
                        "decision-intelligence",
                      )
                    }
                    className="w-full py-2.5 rounded-lg bg-[#181C26] hover:bg-[#202534] border border-[#00F4FE]/30 text-[#00F4FE] text-xs font-mono font-bold flex items-center justify-center gap-2"
                  >
                    View Prescriptive Actions
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <div className="flex items-center justify-center min-h-[300px] text-slate-500 text-sm">
                  No candidate selected.
                </div>
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-[#111319] border border-[#00F4FE]/20 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#00F4FE]" />

                <h3 className="text-sm font-bold text-white font-mono">
                  Analytical Root Cause Summary
                </h3>
              </div>

              <span className="text-xs font-mono text-slate-500">
                Engine: deterministic RCA
              </span>
            </div>

            <div className="text-xs text-slate-300 leading-relaxed bg-black/40 p-4 rounded-lg border border-white/6">
              {data?.summary ??
                "No RCA summary available."}
            </div>
          </div>
        </>
      )}
    </div>
  );
};