import React, { useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Filter,
  Download,
  Sparkles,
  Layers,
  Calendar,
  ChevronDown,
  Table as TableIcon,
  PieChart,
  SlidersHorizontal,
  ArrowUpRight,
} from "lucide-react";
import { ScreenId } from "../../types";

interface AnalyticsExplorerScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

export const AnalyticsExplorerScreen: React.FC<AnalyticsExplorerScreenProps> = ({
  onNavigate,
}) => {
  const [selectedMetric, setSelectedMetric] = useState("Net ARR");
  const [selectedDimension, setSelectedDimension] = useState("Region");
  const [selectedGranularity, setSelectedGranularity] = useState("Monthly");
  const [chartType, setChartType] = useState<"bar" | "line" | "table">("bar");

  const metrics = [
    { key: "Net ARR", value: "$42.84M", delta: "+14.8%", isPos: true },
    { key: "Gross Margin", value: "68.4%", delta: "+2.1%", isPos: true },
    { key: "Customer LTV", value: "$18,450", delta: "+8.4%", isPos: true },
    { key: "CAC Payback", value: "7.2 Mo", delta: "-1.1 Mo", isPos: true },
    { key: "Churn Rate", value: "1.42%", delta: "-0.18%", isPos: true },
    { key: "Gateway Latency", value: "142ms", delta: "+34ms", isPos: false },
  ];

  const dimensions = ["Region", "Customer Tier", "Product Category", "Acquisition Channel", "Payment Gateway"];

  // Multi-dimensional breakdown data
  const breakdownData: Record<string, { label: string; current: number; previous: number; share: string; growth: string }[]> = {
    Region: [
      { label: "North America (US/CA)", current: 24200000, previous: 20400000, share: "56.5%", growth: "+18.6%" },
      { label: "EMEA (UK/DE/FR)", current: 11600000, previous: 10320000, share: "27.1%", growth: "+12.4%" },
      { label: "APAC (JP/SG/AU)", current: 5400000, previous: 5630000, share: "12.6%", growth: "-4.1%" },
      { label: "LATAM / Global", current: 1640000, previous: 1335000, share: "3.8%", growth: "+22.8%" },
    ],
    "Customer Tier": [
      { label: "Enterprise (> $100k)", current: 25800000, previous: 21800000, share: "60.2%", growth: "+18.3%" },
      { label: "Mid-Market ($25k-$100k)", current: 12400000, previous: 11200000, share: "28.9%", growth: "+10.7%" },
      { label: "Growth / SMB (< $25k)", current: 4640000, previous: 4685000, share: "10.9%", growth: "-1.0%" },
    ],
    "Product Category": [
      { label: "Core BI & AI Studio", current: 21400000, previous: 18200000, share: "50.0%", growth: "+17.6%" },
      { label: "Decision Engine Add-on", current: 12800000, previous: 9800000, share: "29.9%", growth: "+30.6%" },
      { label: "Real-time Telemetry Lake", current: 8640000, previous: 9685000, share: "20.1%", growth: "-10.8%" },
    ],
  };

  const activeBreakdown = breakdownData[selectedDimension] || breakdownData["Region"];
  const maxVal = Math.max(...activeBreakdown.map((b) => b.current));

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header & Export Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111319] border border-white/8 rounded-xl p-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-[#00F4FE]/15 border border-[#00F4FE]/30 text-[#00F4FE] text-xs font-mono font-semibold">
              EXPLORER & DATA SLICING
            </span>
            <span className="text-xs text-slate-500 font-mono">Semantic Gold Mart Layer</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Multi-Dimensional Business Analytics
          </h1>
          <p className="text-xs text-slate-400">
            Slice, dice, and cross-filter enterprise metrics with sub-second execution across Snowflake, BigQuery, and ClickHouse.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => onNavigate("ai-analyst")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-[#00F4FE] text-xs font-mono font-medium transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ask AI About This Metric</span>
          </button>
          <button
            onClick={() => alert("Exporting current dimension cohort to CSV/Parquet...")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#181B24] hover:bg-[#202532] border border-white/10 text-slate-300 text-xs font-mono transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Metric Selector Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {metrics.map((m) => {
          const isSelected = selectedMetric === m.key;
          return (
            <button
              key={m.key}
              onClick={() => setSelectedMetric(m.key)}
              className={`p-3 rounded-xl text-left transition-all ${
                isSelected
                  ? "bg-[#161C26] border-2 border-[#00F4FE] shadow-lg shadow-[#00F4FE]/10"
                  : "bg-[#111319] hover:bg-[#151822] border border-white/8"
              }`}
            >
              <div className="text-[11px] font-mono text-slate-400 uppercase truncate">
                {m.key}
              </div>
              <div className="text-lg font-bold font-mono text-white mt-1">
                {m.value}
              </div>
              <div
                className={`text-[11px] font-mono mt-1 ${
                  m.isPos ? "text-[#00F4FE]" : "text-rose-400"
                }`}
              >
                {m.delta}
              </div>
            </button>
          );
        })}
      </div>

      {/* Controls Bar: Dimension + Granularity + Chart Switcher */}
      <div className="bg-[#111319] border border-white/8 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-400 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-[#00F4FE]" /> Dimension:
          </span>
          {dimensions.map((dim) => (
            <button
              key={dim}
              onClick={() => setSelectedDimension(dim)}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                selectedDimension === dim
                  ? "bg-[#00F4FE]/15 text-[#00F4FE] border border-[#00F4FE]/30 font-semibold"
                  : "bg-[#14171F] text-slate-400 hover:text-white border border-white/6"
              }`}
            >
              {dim}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#14171F] rounded-lg p-0.5 border border-white/8">
            <button
              onClick={() => setChartType("bar")}
              className={`p-1.5 rounded ${
                chartType === "bar"
                  ? "bg-[#00F4FE]/20 text-[#00F4FE]"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Bar Chart"
            >
              <BarChart3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setChartType("line")}
              className={`p-1.5 rounded ${
                chartType === "line"
                  ? "bg-[#00F4FE]/20 text-[#00F4FE]"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Line Chart"
            >
              <TrendingUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setChartType("table")}
              className={`p-1.5 rounded ${
                chartType === "table"
                  ? "bg-[#00F4FE]/20 text-[#00F4FE]"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Table View"
            >
              <TableIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Visualization Canvas */}
      <div className="bg-[#111319] border border-white/8 rounded-xl p-6 space-y-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/6 pb-4">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              {selectedMetric} breakdown by {selectedDimension}
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Filtered for past 90 days • Currency USD • 100% Data Freshness
            </p>
          </div>
          <div className="text-right font-mono">
            <div className="text-xs text-slate-400">Total Analyzed</div>
            <div className="text-lg font-bold text-[#00F4FE]">$42,840,000</div>
          </div>
        </div>

        {/* Visual Bar Breakdown */}
        {chartType === "bar" && (
          <div className="space-y-4">
            {activeBreakdown.map((item) => {
              const widthPct = Math.max(8, (item.current / maxVal) * 100);
              return (
                <div key={item.label} className="space-y-1.5 font-mono">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200">{item.label}</span>
                      <span className="text-[10px] text-slate-500 bg-white/5 px-1.5 py-0.2 rounded">
                        {item.share} of total
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-white font-bold">
                        ${(item.current / 1000000).toFixed(2)}M
                      </span>
                      <span
                        className={`text-xs ${
                          item.growth.startsWith("+")
                            ? "text-emerald-400"
                            : "text-rose-400 font-bold"
                        }`}
                      >
                        {item.growth}
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-black/40 h-3 rounded-full overflow-hidden p-0.5 border border-white/6">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        item.growth.startsWith("-")
                          ? "bg-gradient-to-r from-amber-500 to-rose-500"
                          : "bg-gradient-to-r from-[#00F4FE] to-[#3B82F6]"
                      }`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Line / Comparison Graph */}
        {chartType === "line" && (
          <div className="py-6 space-y-4">
            <div className="h-48 flex items-end justify-between gap-3 px-4 pt-4 border-b border-l border-white/10 bg-black/20 rounded-lg">
              {[45, 52, 58, 64, 72, 80, 88, 96, 102, 114, 120, 138].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="text-[10px] font-mono text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    ${(h * 0.31).toFixed(1)}M
                  </div>
                  <div
                    className="w-full bg-gradient-to-t from-[#3B82F6]/40 to-[#00F4FE] rounded-t hover:brightness-125 transition-all cursor-pointer"
                    style={{ height: `${h}px` }}
                  />
                  <span className="text-[10px] font-mono text-slate-500">
                    Wk {i + 1}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-center text-xs font-mono text-slate-500">
              Trailing 12 Weeks Cohort Progression • P50 Trendline Overlay
            </p>
          </div>
        )}

        {/* Tabular View */}
        {chartType === "table" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0C0E14] text-slate-400 uppercase text-[10px] border-b border-white/8">
                <tr>
                  <th className="py-2.5 px-3">{selectedDimension}</th>
                  <th className="py-2.5 px-3 text-right">Current Period</th>
                  <th className="py-2.5 px-3 text-right">Previous Period</th>
                  <th className="py-2.5 px-3 text-right">Revenue Share</th>
                  <th className="py-2.5 px-3 text-right">Period Growth</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {activeBreakdown.map((b) => (
                  <tr key={b.label} className="hover:bg-white/4">
                    <td className="py-2.5 px-3 font-semibold text-slate-200">{b.label}</td>
                    <td className="py-2.5 px-3 text-right text-white font-bold">
                      ${(b.current / 1000000).toFixed(2)}M
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-400">
                      ${(b.previous / 1000000).toFixed(2)}M
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#00F4FE]">{b.share}</td>
                    <td
                      className={`py-2.5 px-3 text-right font-bold ${
                        b.growth.startsWith("+") ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {b.growth}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* AI Insight Box */}
        <div className="bg-[#151923] border border-[#00F4FE]/20 rounded-lg p-4 flex items-start gap-3">
          <Sparkles className="w-4 h-4 text-[#00F4FE] shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <span className="font-bold text-white font-mono uppercase tracking-wider">
              Autonomous Correlation Insight:
            </span>
            <p className="text-slate-300 leading-relaxed">
              North America accounts for <strong>56.5%</strong> of Net ARR and grew at <strong>+18.6%</strong>, outperforming historical seasonal benchmarks by 3.2σ. Conversely, APAC contraction (-4.1%) is correlated with third-party payment gateway TLS latency issues in the Tokyo PoP.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
