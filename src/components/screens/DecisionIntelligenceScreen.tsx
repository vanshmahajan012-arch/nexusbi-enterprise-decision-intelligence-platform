import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Zap,
  Play,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  TrendingUp,
  TrendingDown,
  History,
  Sliders,
  DollarSign,
  Activity,
  ShieldCheck,
  Target,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { ScreenId } from "../../types";
import { apiFetch } from "../../services/api";

interface DecisionIntelligenceScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onExecuteAction: (action: any) => void;
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

interface DecisionsResponse {
  status: string;
  decision_count: number;
  critical_count: number;
  high_priority_count: number;
  decisions: DecisionItem[];
  summary: string;
}

const PRIORITY_FILTERS = [
  "ALL",
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
];

function priorityClass(
  priority: string,
): string {
  switch (priority) {
    case "CRITICAL":
      return "text-rose-300 border-rose-400/25 bg-rose-400/10";

    case "HIGH":
      return "text-orange-300 border-orange-400/25 bg-orange-400/10";

    case "MEDIUM":
      return "text-amber-300 border-amber-400/25 bg-amber-400/10";

    default:
      return "text-slate-400 border-white/10 bg-white/[0.03]";
  }
}

function riskClass(
  risk: string,
): string {
  switch (risk) {
    case "HIGH":
      return "text-rose-300";

    case "MEDIUM":
      return "text-amber-300";

    default:
      return "text-emerald-300";
  }
}

function decisionIcon(
  decisionType: string,
  direction?: string,
) {
  if (
    decisionType ===
    "ANOMALY_RESPONSE"
  ) {
    return (
      <ShieldAlert className="w-4 h-4 text-rose-300" />
    );
  }

  if (direction === "DOWN") {
    return (
      <TrendingDown className="w-4 h-4 text-rose-300" />
    );
  }

  if (direction === "UP") {
    return (
      <TrendingUp className="w-4 h-4 text-emerald-300" />
    );
  }

  return (
    <Target className="w-4 h-4 text-[#00F4FE]" />
  );
}

export const DecisionIntelligenceScreen: React.FC<
  DecisionIntelligenceScreenProps
> = ({
  onNavigate,
}) => {
  const [data, setData] =
    useState<DecisionsResponse | null>(
      null,
    );

  const [selectedPriority, setSelectedPriority] =
    useState("ALL");

  const [selectedDecision, setSelectedDecision] =
    useState<DecisionItem | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const loadDecisions = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiFetch(
        "/api/decisions",
      );

      if (!response.ok) {
        throw new Error(
          `Decision API failed (${response.status})`,
        );
      }

      const result =
        (await response.json()) as DecisionsResponse;

      setData(result);

      setSelectedDecision(
        (current) => {
          if (
            current &&
            result.decisions.some(
              (decision) =>
                decision.event_group ===
                current.event_group,
            )
          ) {
            return (
              result.decisions.find(
                (decision) =>
                  decision.event_group ===
                  current.event_group,
              ) ?? null
            );
          }

          return (
            result.decisions[0] ?? null
          );
        },
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load decision intelligence.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadDecisions();
  }, []);

  const filteredDecisions =
    useMemo(() => {
      if (!data) {
        return [];
      }

      if (
        selectedPriority === "ALL"
      ) {
        return data.decisions;
      }

      return data.decisions.filter(
        (decision) =>
          decision.priority ===
          selectedPriority,
      );
    }, [
      data,
      selectedPriority,
    ]);

  const pendingCount =
    filteredDecisions.filter(
      (decision) =>
        decision.priority ===
          "CRITICAL" ||
        decision.priority ===
          "HIGH",
    ).length;

  const handleReviewScenario = () => {
    onNavigate(
      "scenario-simulator",
    );
  };

  const handleReviewRootCause = () => {
    onNavigate(
      "root-cause-analysis",
    );
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111319] border border-white/8 rounded-xl p-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" />
              PRESCRIPTIVE DECISION INTELLIGENCE
            </span>

            <span className="text-xs text-slate-500 font-mono">
              Backend decision engine
            </span>
          </div>

          <h1 className="text-xl font-bold text-white tracking-tight">
            Decision Intelligence
          </h1>

          <p className="text-xs text-slate-400">
            Evidence-backed business decisions ranked by priority, risk, impact and confidence.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              void loadDecisions()
            }
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#181B24] hover:bg-[#202532] border border-white/10 text-slate-300 font-mono text-xs transition-colors disabled:opacity-40"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                isLoading
                  ? "animate-spin"
                  : ""
              }`}
            />
            Refresh
          </button>

          <button
            onClick={() =>
              onNavigate(
                "actions-outcomes",
              )
            }
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#181B24] hover:bg-[#202532] border border-white/10 text-slate-300 font-mono text-xs transition-colors"
          >
            <History className="w-3.5 h-3.5 text-[#00F4FE]" />
            <span>Audit Outcomes</span>
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-xs text-rose-200 font-mono">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="bg-[#111319] border border-white/8 rounded-xl p-8 text-center">
          <Sparkles className="w-6 h-6 mx-auto text-[#00F4FE] animate-spin mb-3" />

          <div className="text-xs font-mono text-slate-400">
            Loading NXUS decision intelligence...
          </div>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="bg-[#111319] border border-white/8 rounded-xl p-4">
              <div className="text-[10px] text-slate-500 uppercase font-mono">
                Total Decisions
              </div>

              <div className="text-2xl font-bold text-white mt-1">
                {data?.decision_count ??
                  0}
              </div>
            </div>

            <div className="bg-[#111319] border border-rose-400/10 rounded-xl p-4">
              <div className="text-[10px] text-slate-500 uppercase font-mono">
                Critical
              </div>

              <div className="text-2xl font-bold text-rose-300 mt-1">
                {data?.critical_count ??
                  0}
              </div>
            </div>

            <div className="bg-[#111319] border border-orange-400/10 rounded-xl p-4">
              <div className="text-[10px] text-slate-500 uppercase font-mono">
                High Priority
              </div>

              <div className="text-2xl font-bold text-orange-300 mt-1">
                {data?.high_priority_count ??
                  0}
              </div>
            </div>

            <div className="bg-[#111319] border border-[#00F4FE]/10 rounded-xl p-4">
              <div className="text-[10px] text-slate-500 uppercase font-mono">
                Needs Attention
              </div>

              <div className="text-2xl font-bold text-[#00F4FE] mt-1">
                {pendingCount}
              </div>
            </div>
          </div>

          {/* Summary */}
          {data?.summary && (
            <div className="bg-[#111319] border border-[#00F4FE]/15 rounded-xl p-4">
              <div className="flex items-center gap-2 text-[10px] font-mono tracking-wider text-[#00F4FE] font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                EXECUTIVE DECISION SUMMARY
              </div>

              <p className="text-xs text-slate-300 leading-relaxed mt-2">
                {data.summary}
              </p>
            </div>
          )}

          {/* Priority Filters */}
          <div className="flex items-center justify-between flex-wrap gap-3 bg-[#111319] border border-white/8 rounded-xl p-3 text-xs font-mono">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-400">
                Priority:
              </span>

              {PRIORITY_FILTERS.map(
                (priority) => (
                  <button
                    key={priority}
                    onClick={() =>
                      setSelectedPriority(
                        priority,
                      )
                    }
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      selectedPriority ===
                      priority
                        ? "bg-[#00F4FE]/15 text-[#00F4FE] border border-[#00F4FE]/30 font-semibold"
                        : "bg-[#14171F] text-slate-400 hover:text-white border border-white/6"
                    }`}
                  >
                    {priority}
                  </button>
                ),
              )}
            </div>

            <div className="text-slate-400">
              {filteredDecisions.length} visible
            </div>
          </div>

          {/* Main */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Decision list */}
            <div className="lg:col-span-2 space-y-4">
              {filteredDecisions.length ===
              0 ? (
                <div className="bg-[#111319] border border-white/8 rounded-xl p-8 text-center">
                  <ShieldCheck className="w-8 h-8 mx-auto text-emerald-300 mb-3" />

                  <div className="text-sm font-bold text-white">
                    No decisions in this filter
                  </div>

                  <div className="text-xs text-slate-500 font-mono mt-1">
                    NXUS has no active decisions matching the selected priority.
                  </div>
                </div>
              ) : (
                filteredDecisions.map(
                  (decision) => {
                    const isSelected =
                      selectedDecision
                        ?.event_group ===
                      decision.event_group;

                    const direction =
                      decision.related_metrics?.includes(
                        "units",
                      )
                        ? "DOWN"
                        : undefined;

                    return (
                      <div
                        key={
                          decision.event_group
                        }
                        onClick={() =>
                          setSelectedDecision(
                            decision,
                          )
                        }
                        className={`bg-[#111319] rounded-xl p-5 border transition-all cursor-pointer space-y-3 ${
                          isSelected
                            ? "border-2 border-[#00F4FE] shadow-xl shadow-[#00F4FE]/10"
                            : "border-white/8 hover:border-white/16"
                        }`}
                      >
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/6 pb-3">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-black/30 border border-white/8 flex items-center justify-center shrink-0">
                              {decisionIcon(
                                decision.decision_type,
                                direction,
                              )}
                            </div>

                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[9px] uppercase tracking-wider font-mono text-slate-500">
                                  {
                                    decision.decision_type
                                  }
                                </span>

                                <span
                                  className={`px-2 py-0.5 rounded border text-[10px] font-mono font-bold ${priorityClass(
                                    decision.priority,
                                  )}`}
                                >
                                  {
                                    decision.priority
                                  }
                                </span>
                              </div>

                              <h3 className="text-sm font-bold text-white tracking-tight mt-1">
                                {decision.title}
                              </h3>
                            </div>
                          </div>

                          <div
                            className={`text-[10px] px-2 py-1 rounded border font-mono font-bold ${riskClass(
                              decision.risk_level,
                            )}`}
                          >
                            {decision.risk_level} RISK
                          </div>
                        </div>

                        {/* Rationale */}
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {
                            decision.rationale
                          }
                        </p>

                        {/* Metrics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 font-mono text-xs">
                          <div className="bg-black/30 p-2.5 rounded border border-white/5">
                            <div className="text-[10px] text-slate-500 uppercase">
                              Confidence
                            </div>

                            <div className="font-bold text-[#00F4FE] mt-0.5">
                              {
                                decision.confidence
                              }
                              %
                            </div>
                          </div>

                          <div className="bg-black/30 p-2.5 rounded border border-white/5">
                            <div className="text-[10px] text-slate-500 uppercase">
                              Risk
                            </div>

                            <div
                              className={`font-bold mt-0.5 ${riskClass(
                                decision.risk_level,
                              )}`}
                            >
                              {
                                decision.risk_level
                              }
                            </div>
                          </div>

                          <div className="bg-black/30 p-2.5 rounded border border-white/5">
                            <div className="text-[10px] text-slate-500 uppercase">
                              Metrics
                            </div>

                            <div className="font-bold text-slate-200 mt-0.5">
                              {
                                decision
                                  .related_metrics
                                  .length
                              }
                            </div>
                          </div>

                          <div className="bg-black/30 p-2.5 rounded border border-white/5">
                            <div className="text-[10px] text-slate-500 uppercase">
                              Evidence
                            </div>

                            <div className="font-bold text-slate-200 mt-0.5">
                              {
                                decision
                                  .evidence
                                  .length
                              }
                            </div>
                          </div>
                        </div>

                        {/* Expected impact */}
                        <div className="flex items-start gap-2 pt-2 border-t border-white/6">
                          <DollarSign className="w-3.5 h-3.5 text-[#00F4FE] mt-0.5 shrink-0" />

                          <div className="text-[11px] text-slate-400">
                            <span className="text-slate-300 font-semibold">
                              Expected Impact:
                            </span>{" "}
                            {
                              decision.expected_impact
                            }
                          </div>
                        </div>

                        {/* Related metrics */}
                        <div className="flex items-center justify-between gap-3 pt-2">
                          <div className="flex flex-wrap gap-1.5">
                            {decision.related_metrics.map(
                              (metric) => (
                                <span
                                  key={metric}
                                  className="px-2 py-0.5 rounded bg-[#00F4FE]/5 border border-[#00F4FE]/15 text-[10px] text-[#00F4FE] font-mono"
                                >
                                  {metric}
                                </span>
                              ),
                            )}
                          </div>

                          <span className="text-[9px] text-slate-600 font-mono">
                            {
                              decision.event_group
                            }
                          </span>
                        </div>
                      </div>
                    );
                  },
                )
              )}
            </div>

            {/* Inspector */}
            <div className="bg-[#111319] border border-white/8 rounded-xl p-5 space-y-5 flex flex-col shadow-xl">
              {selectedDecision ? (
                <>
                  <div className="flex items-center justify-between border-b border-white/6 pb-3">
                    <h3 className="text-xs uppercase font-mono tracking-wider text-slate-400 font-semibold">
                      Decision Evidence Inspector
                    </h3>

                    <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Evidence Grounded
                    </span>
                  </div>

                  <div>
                    <div className="text-[10px] font-mono uppercase text-slate-500">
                      Selected Decision
                    </div>

                    <h4 className="text-sm font-bold text-white mt-1">
                      {
                        selectedDecision.title
                      }
                    </h4>

                    <div
                      className={`text-xs font-mono mt-1 ${riskClass(
                        selectedDecision.risk_level,
                      )}`}
                    >
                      {
                        selectedDecision.priority
                      } Priority ·{" "}
                      {
                        selectedDecision.risk_level
                      } Risk
                    </div>
                  </div>

                  {/* Rationale */}
                  <div className="bg-black/40 p-3.5 rounded-lg border border-white/6 space-y-2">
                    <div className="text-[11px] text-slate-400 uppercase font-mono">
                      Rationale
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {
                        selectedDecision.rationale
                      }
                    </p>
                  </div>

                  {/* Evidence */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 uppercase font-mono">
                      <Activity className="w-3.5 h-3.5 text-[#00F4FE]" />
                      Evidence
                    </div>

                    <div className="space-y-2">
                      {selectedDecision.evidence.map(
                        (
                          evidence,
                          index,
                        ) => (
                          <div
                            key={`${evidence}-${index}`}
                            className="flex items-start gap-2 text-xs text-slate-300"
                          >
                            <div className="w-5 h-5 rounded-md bg-[#00F4FE]/10 border border-[#00F4FE]/20 text-[#00F4FE] flex items-center justify-center text-[9px] font-mono shrink-0">
                              {index + 1}
                            </div>

                            <span className="leading-relaxed pt-0.5">
                              {
                                evidence
                              }
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  </div>

                  {/* Expected impact */}
                  <div className="bg-[#00F4FE]/5 border border-[#00F4FE]/10 p-3 rounded-lg">
                    <div className="text-[10px] uppercase text-[#00F4FE] font-mono">
                      Expected Impact
                    </div>

                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      {
                        selectedDecision.expected_impact
                      }
                    </p>
                  </div>

                  {/* Decision controls */}
                  <div className="space-y-2 mt-auto">
                    <button
                      onClick={
                        handleReviewScenario
                      }
                      className="w-full py-2.5 rounded-lg bg-[#181C26] hover:bg-[#202534] border border-[#00F4FE]/30 text-[#00F4FE] text-xs font-mono font-bold flex items-center justify-center gap-2 transition-colors"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      Simulate Business Impact
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={
                        handleReviewRootCause
                      }
                      className="w-full py-2.5 rounded-lg bg-[#181C26] hover:bg-[#202534] border border-white/10 text-slate-300 text-xs font-mono font-bold flex items-center justify-center gap-2 transition-colors"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Investigate Root Cause
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-center">
                  <div>
                    <ShieldCheck className="w-8 h-8 mx-auto text-emerald-300 mb-3" />

                    <div className="text-sm font-bold text-white">
                      No decision selected
                    </div>

                    <div className="text-xs text-slate-500 font-mono mt-1">
                      Select a decision to inspect its evidence and implications.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};