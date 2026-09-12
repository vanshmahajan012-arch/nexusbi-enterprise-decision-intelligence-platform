import React, { useState } from "react";
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  Plus,
  ShieldAlert,
  ArrowRight,
  GitFork,
  Radio,
  Sliders,
  Sparkles,
} from "lucide-react";
import { StatusBadge } from "../shared/StatusBadge";
import { ScreenId } from "../../types";

interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: string;
  severity: "CRITICAL" | "MAJOR" | "MINOR";
  channel: string;
  enabled: boolean;
  lastTriggered: string;
}

interface AlertsIncidentsScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

export const AlertsIncidentsScreen: React.FC<AlertsIncidentsScreenProps> = ({
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<"incidents" | "rules">("incidents");

  const [incidents, setIncidents] = useState([
    {
      id: "INC-1092",
      title: "APAC Checkout Gateway Latency Spike & Conversion Drop",
      severity: "CRITICAL" as const,
      status: "ACTIVE" as const,
      openedAt: "Today, 14:18 UTC",
      assignedTo: "SecOps / Payment Infra On-Call",
      impact: "-$48,200/hr Gross GMV",
      leadHypothesis: "Tokyo Edge TLS Certificate Renegotiation & Gateway Timeout",
    },
    {
      id: "INC-1088",
      title: "Silver Layer stg_orders CDC Replication Lag > 5 minutes",
      severity: "MAJOR" as const,
      status: "RESOLVED" as const,
      openedAt: "Yesterday, 22:45 UTC",
      assignedTo: "Data Engineering (Auto-Healed)",
      impact: "15 min delayed reporting on Gold Marts",
      leadHypothesis: "Database checkpoint contention during bulk migration",
    },
    {
      id: "INC-1074",
      title: "Enterprise Churn Probability Alert: FinTech Global Corp",
      severity: "MINOR" as const,
      status: "INVESTIGATING" as const,
      openedAt: "2 days ago",
      assignedTo: "Customer Success (Sarah Jenkins)",
      impact: "$340k ARR Contract Renewal at Risk",
      leadHypothesis: "Executive sponsor departure identified in CRM telemetry",
    },
  ]);

  const [rules, setRules] = useState<AlertRule[]>([
    {
      id: "RULE-01",
      name: "Checkout Conversion Rate Anomaly (Statistical σ > 3)",
      metric: "fct_orders.conversion_rate",
      condition: "z_score < -3.0 OR drop > 15%",
      severity: "CRITICAL",
      channel: "PagerDuty #infra-sev1, Slack #exec-alerts",
      enabled: true,
      lastTriggered: "14:18 UTC Today",
    },
    {
      id: "RULE-02",
      name: "API Gateway P99 Latency Breach (> 800ms)",
      metric: "telemetry.api_latency_p99",
      condition: "p99_latency > 800ms for 2 consecutive 1m windows",
      severity: "CRITICAL",
      channel: "PagerDuty #infra-sev1",
      enabled: true,
      lastTriggered: "14:18 UTC Today",
    },
    {
      id: "RULE-03",
      name: "dbt Gold Mart SLA Freshness Lag (> 60m)",
      metric: "dbt.gold_marts.freshness_seconds",
      condition: "lag_seconds > 3600",
      severity: "MAJOR",
      channel: "Slack #data-platform-oncall",
      enabled: true,
      lastTriggered: "Yesterday",
    },
    {
      id: "RULE-04",
      name: "Enterprise Account Usage Velocity Drop (> 40%)",
      metric: "customer.daily_active_tokens",
      condition: "trailing_7d_avg < 0.60 * baseline",
      severity: "MINOR",
      channel: "Slack #cs-early-warning, Salesforce Task",
      enabled: true,
      lastTriggered: "2 days ago",
    },
  ]);

  const toggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111319] border border-white/8 rounded-xl p-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-mono font-semibold flex items-center gap-1">
              <Bell className="w-3.5 h-3.5" />
              INCIDENTS & AUTOMATED ALERTING
            </span>
            <span className="text-xs text-slate-500 font-mono">
              SLO & Escalation Management
            </span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Enterprise Alerting Rules & Live Incidents
          </h1>
          <p className="text-xs text-slate-400">
            Intelligent thresholding with noise de-duplication, automated root cause linkage, and PagerDuty/Slack routing.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => onNavigate("anomaly-center")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#181B24] hover:bg-[#202532] border border-white/10 text-slate-300 font-mono text-xs transition-colors"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>View Anomaly Radar</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/8 pb-2 text-xs font-mono">
        <button
          onClick={() => setActiveTab("incidents")}
          className={`px-4 py-2 rounded-lg font-bold transition-all ${
            activeTab === "incidents"
              ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Active Incidents ({incidents.filter((i) => i.status === "ACTIVE").length})
        </button>
        <button
          onClick={() => setActiveTab("rules")}
          className={`px-4 py-2 rounded-lg font-bold transition-all ${
            activeTab === "rules"
              ? "bg-[#00F4FE]/15 text-[#00F4FE] border border-[#00F4FE]/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Alert Rules & Policies ({rules.length})
        </button>
      </div>

      {/* Tab 1: Incidents Feed */}
      {activeTab === "incidents" && (
        <div className="space-y-4">
          {incidents.map((inc) => (
            <div
              key={inc.id}
              className="bg-[#111319] border border-white/8 hover:border-white/16 rounded-xl p-5 space-y-4 transition-all shadow-lg"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/6 pb-3">
                <div className="flex items-center gap-2.5">
                  <StatusBadge type={inc.severity} />
                  <span className="text-xs font-mono text-slate-400">{inc.id}</span>
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    {inc.title}
                  </h3>
                </div>
                <div className="flex items-center gap-3 font-mono text-xs">
                  <span className="text-slate-400">{inc.openedAt}</span>
                  <StatusBadge type={inc.status} size="sm" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
                <div className="bg-black/30 p-3 rounded-lg border border-white/5 space-y-1">
                  <div className="text-[10px] text-slate-500 uppercase">Estimated Impact</div>
                  <div className="text-rose-400 font-bold">{inc.impact}</div>
                </div>
                <div className="bg-black/30 p-3 rounded-lg border border-white/5 space-y-1">
                  <div className="text-[10px] text-slate-500 uppercase">Assigned Escalation</div>
                  <div className="text-slate-200">{inc.assignedTo}</div>
                </div>
                <div className="bg-black/30 p-3 rounded-lg border border-white/5 space-y-1">
                  <div className="text-[10px] text-slate-500 uppercase">AI Hypothesis</div>
                  <div className="text-amber-300 truncate">{inc.leadHypothesis}</div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/6">
                <span className="text-[11px] font-mono text-slate-400">
                  Linked to Causal DAG & Telemetry Stream
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onNavigate("root-cause-analysis")}
                    className="px-3.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <GitFork className="w-3.5 h-3.5" />
                    <span>Launch Root Cause Analysis</span>
                  </button>
                  <button
                    onClick={() => onNavigate("decision-intelligence")}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>Execute Playbook</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Rules Config */}
      {activeTab === "rules" && (
        <div className="space-y-4">
          <div className="bg-[#111319] border border-white/8 rounded-xl overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0C0E14] text-slate-400 uppercase text-[10px] border-b border-white/8">
                <tr>
                  <th className="py-3 px-4">Rule Name</th>
                  <th className="py-3 px-4">Evaluated Metric</th>
                  <th className="py-3 px-4">Threshold Logic</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Notification Channels</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-white/4 transition-colors">
                    <td className="py-3 px-4 font-bold text-white">{rule.name}</td>
                    <td className="py-3 px-4 text-[#00F4FE]">{rule.metric}</td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {rule.condition}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge type={rule.severity} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">{rule.channel}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => toggleRule(rule.id)}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold transition-colors ${
                          rule.enabled
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : "bg-slate-800 text-slate-500 border border-white/10"
                        }`}
                      >
                        {rule.enabled ? "ENABLED" : "DISABLED"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
