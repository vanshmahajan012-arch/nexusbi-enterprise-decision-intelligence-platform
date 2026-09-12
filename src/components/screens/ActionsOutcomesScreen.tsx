import React, { useState } from "react";
import {
  History,
  TrendingUp,
  CheckCircle2,
  DollarSign,
  ArrowUpRight,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { StatusBadge } from "../shared/StatusBadge";
import { ScreenId } from "../../types";

interface ActionOutcome {
  id: string;
  actionTitle: string;
  category: string;
  executedAt: string;
  executedBy: string;
  baselineMetric: string;
  postActionMetric: string;
  netGain: string;
  status: "VERIFIED" | "MONITORING" | "ROLLED_BACK";
  aiVerificationNote: string;
}

interface ActionsOutcomesScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

export const ActionsOutcomesScreen: React.FC<ActionsOutcomesScreenProps> = ({
  onNavigate,
}) => {
  const [outcomes, setOutcomes] = useState<ActionOutcome[]>([
    {
      id: "OUT-301",
      actionTitle: "Dynamic Adyen Fallback Gateway Routing for APAC Cluster",
      category: "INFRASTRUCTURE",
      executedAt: "Today, 14:32 UTC (28m ago)",
      executedBy: "Autonomous Decision Policy #3 (Auto-Approved)",
      baselineMetric: "Checkout Failure Rate: 8.4% • Latency: 2,410ms",
      postActionMetric: "Checkout Failure Rate: 0.8% • Latency: 165ms",
      netGain: "+$42,800/hr Protected GMV",
      status: "VERIFIED",
      aiVerificationNote: "Statistical t-test confirms 99.8% recovery of checkout conversion. Zero synthetic rollback triggers.",
    },
    {
      id: "OUT-298",
      actionTitle: "Automated Renewal Discount Tier (+15% credits) for At-Risk FinTech Segment",
      category: "SALES",
      executedAt: "Yesterday, 11:20 UTC",
      executedBy: "VP of Revenue (Human-in-the-Loop Approval)",
      baselineMetric: "Segment Renewal Probability: 42%",
      postActionMetric: "Segment Renewal Probability: 88% (2 Contracts Signed)",
      netGain: "+$680,000 Net Retained ARR",
      status: "VERIFIED",
      aiVerificationNote: "Customer telemetry indicates 34% increase in daily API tokens following contract extension.",
    },
    {
      id: "OUT-280",
      actionTitle: "Self-Serve Upgrade Modal Optimization in High-Consumption Tier",
      category: "MARKETING",
      executedAt: "3 days ago",
      executedBy: "Growth Product Team",
      baselineMetric: "Trial-to-Paid Conversion: 3.4%",
      postActionMetric: "Trial-to-Paid Conversion: 5.1%",
      netGain: "+$120,000 New MRR / Month",
      status: "MONITORING",
      aiVerificationNote: "Cohort tracking in Gold Mart is 48 hours into 7-day statistical holdout validation.",
    },
  ]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111319] border border-white/8 rounded-xl p-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold flex items-center gap-1">
              <History className="w-3.5 h-3.5" />
              CLOSED-LOOP ACTIONS & IMPACT AUDITING
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Statistical Outcome Verification
            </span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Historical Decisions & ROI Ledger
          </h1>
          <p className="text-xs text-slate-400">
            Audit the real-world financial, operational, and latency impact of automated and human-approved actions over time.
          </p>
        </div>

        <div className="flex items-center gap-2.5 font-mono text-xs">
          <div className="px-3 py-2 rounded-lg bg-black/40 border border-white/8 text-slate-300">
            Net Value Realized (30d): <strong className="text-emerald-400 font-bold">+$1.48M</strong>
          </div>
          <div className="px-3 py-2 rounded-lg bg-black/40 border border-white/8 text-slate-300">
            Verification SLA: <strong className="text-[#00F4FE] font-bold">100%</strong>
          </div>
        </div>
      </div>

      {/* Outcomes Cards */}
      <div className="space-y-4">
        {outcomes.map((out) => (
          <div
            key={out.id}
            className="bg-[#111319] border border-white/8 rounded-xl p-5 space-y-4 shadow-xl"
          >
            {/* Top row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/6 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-mono text-slate-400">{out.id}</span>
                <span className="px-2 py-0.5 rounded bg-black/40 text-[#00F4FE] text-[10px] font-mono border border-[#00F4FE]/20">
                  {out.category}
                </span>
                <h3 className="text-sm font-bold text-white tracking-tight">
                  {out.actionTitle}
                </h3>
              </div>

              <div className="flex items-center gap-3 font-mono text-xs">
                <span className="text-slate-400">{out.executedAt}</span>
                <StatusBadge type={out.status} size="sm" />
              </div>
            </div>

            {/* Metrics Comparison & Net Gain */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
              <div className="bg-black/30 p-3 rounded-lg border border-white/5 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase">Pre-Execution Baseline</div>
                <div className="text-rose-400 font-semibold">{out.baselineMetric}</div>
              </div>
              <div className="bg-black/30 p-3 rounded-lg border border-white/5 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase">Post-Execution Observed</div>
                <div className="text-emerald-400 font-semibold">{out.postActionMetric}</div>
              </div>
              <div className="bg-black/30 p-3 rounded-lg border border-white/5 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase">Net Realized Value</div>
                <div className="text-white font-bold text-sm">{out.netGain}</div>
              </div>
            </div>

            {/* AI Verification Note */}
            <div className="bg-[#151923] p-3 rounded-lg border border-[#00F4FE]/20 flex items-start gap-2.5 text-xs">
              <Sparkles className="w-4 h-4 text-[#00F4FE] shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-mono text-[#00F4FE] font-bold">
                  Autonomous Verification Audit:
                </span>
                <p className="text-slate-300 font-sans leading-relaxed">
                  {out.aiVerificationNote}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1 border-t border-white/6">
              <span>{out.executedBy}</span>
              <button
                onClick={() => onNavigate("analytics-explorer")}
                className="text-[#00F4FE] hover:underline flex items-center gap-1"
              >
                <span>Inspect in Semantic Explorer</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
