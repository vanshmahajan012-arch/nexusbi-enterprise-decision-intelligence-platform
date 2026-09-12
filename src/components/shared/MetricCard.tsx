import React from "react";
import { Sparkline } from "./Sparkline";
import { ArrowUpRight, ArrowDownRight, AlertTriangle, ShieldCheck } from "lucide-react";
import { MetricSummary } from "../../types";

interface MetricCardProps {
  metric: MetricSummary;
  onClick?: () => void;
  highlight?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  metric,
  onClick,
  highlight = false,
}) => {
  const isPositiveChange = metric.changeIsPositive;
  const strokeColor = metric.anomalyDetected
    ? "#EF4444"
    : isPositiveChange
    ? "#00F4FE"
    : "#F59E0B";

  return (
    <div
      onClick={onClick}
      className={`group relative rounded-xl p-4 transition-all duration-200 cursor-pointer ${
        highlight
          ? "ai-glow-card"
          : "bg-[#111318]/90 hover:bg-[#161922] border border-white/8 hover:border-white/16 shadow-lg shadow-black/40"
      }`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400 font-mono">
          {metric.title}
        </span>
        {metric.anomalyDetected ? (
          <span className="flex items-center gap-1 text-[11px] font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 animate-pulse">
            <AlertTriangle className="w-3 h-3" />
            ANOMALY
          </span>
        ) : (
          <span className="text-slate-600 group-hover:text-slate-400 transition-colors">
            <ShieldCheck className="w-3.5 h-3.5" />
          </span>
        )}
      </div>

      {/* Value & Sparkline */}
      <div className="flex items-baseline justify-between gap-3 my-1">
        <div className="text-2xl lg:text-3xl font-bold tracking-tight text-white font-mono">
          {metric.value}
        </div>
        <div className="shrink-0 pt-1">
          <Sparkline
            data={metric.sparklineData}
            color={strokeColor}
            width={90}
            height={32}
          />
        </div>
      </div>

      {/* Delta & Meta */}
      <div className="flex items-center justify-between text-xs mt-3 pt-2 border-t border-white/6">
        <div className="flex items-center gap-1">
          <span
            className={`inline-flex items-center font-mono font-medium ${
              metric.changePct >= 0
                ? isPositiveChange
                  ? "text-[#00F4FE]"
                  : "text-rose-400"
                : isPositiveChange
                ? "text-emerald-400"
                : "text-rose-400"
            }`}
          >
            {metric.changePct >= 0 ? (
              <ArrowUpRight className="w-3.5 h-3.5 inline mr-0.5" />
            ) : (
              <ArrowDownRight className="w-3.5 h-3.5 inline mr-0.5" />
            )}
            {Math.abs(metric.changePct)}%
          </span>
          <span className="text-slate-400 text-[11px]">{metric.timeframe}</span>
        </div>

        {metric.targetValue && (
          <span className="text-[11px] text-slate-400 font-mono">
            Target: <span className="text-slate-200">{metric.targetValue}</span>
          </span>
        )}
      </div>
    </div>
  );
};
