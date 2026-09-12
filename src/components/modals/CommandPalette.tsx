import React, { useState, useEffect } from "react";
import {
  Search,
  Sparkles,
  Command,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  GitFork,
  Sliders,
  Terminal,
  Layers,
  History,
  Server,
  BookOpen,
  Activity,
  Zap,
} from "lucide-react";
import { ScreenId } from "../../types";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (screen: ScreenId) => void;
}

interface PaletteItem {
  id: string;
  category: "Navigation" | "Actions" | "Diagnostics" | "AI Inquiries";
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  screen: ScreenId;
  shortcut?: string;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const items: PaletteItem[] = [
    {
      id: "nav-command-center",
      category: "Navigation",
      title: "Executive Command Center",
      subtitle: "Executive KPIs, Anomaly Radar, Prescriptive Actions",
      icon: <Activity className="w-4 h-4 text-[#00F4FE]" />,
      screen: "command-center",
      shortcut: "⌘1",
    },
    {
      id: "nav-live",
      category: "Navigation",
      title: "Live Telemetry & CDC Event Stream",
      subtitle: "Real-time Kafka ingestion, latency monitors, streaming buffer",
      icon: <TrendingUp className="w-4 h-4 text-emerald-400" />,
      screen: "live-intelligence",
    },
    {
      id: "nav-explorer",
      category: "Navigation",
      title: "Analytics Explorer & Multi-Dimension Slicing",
      subtitle: "Drill down across regions, cohorts, and customer tiers",
      icon: <Layers className="w-4 h-4 text-blue-400" />,
      screen: "analytics-explorer",
    },
    {
      id: "diag-rca",
      category: "Diagnostics",
      title: "Investigate Incident #1092 (APAC Checkout Dip)",
      subtitle: "Open Causal Directed Acyclic Graph & attribution engine",
      icon: <GitFork className="w-4 h-4 text-rose-400" />,
      screen: "root-cause-analysis",
    },
    {
      id: "nav-anomalies",
      category: "Diagnostics",
      title: "Anomaly Command Center",
      subtitle: "View active statistical z-score breaches and hypotheses",
      icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
      screen: "anomaly-center",
    },
    {
      id: "ai-analyst",
      category: "AI Inquiries",
      title: "Ask AI Analyst (Gemini Enterprise)",
      subtitle: "Interactive conversational business intelligence with dbt grounding",
      icon: <Sparkles className="w-4 h-4 text-[#00F4FE]" />,
      screen: "ai-analyst",
    },
    {
      id: "nav-forecasts",
      category: "Actions",
      title: "Probabilistic Forecasts & Revenue Horizon",
      subtitle: "P10/P50/P90 Bayesian envelope projections for Q3/Q4",
      icon: <TrendingUp className="w-4 h-4 text-purple-400" />,
      screen: "forecasts-prediction",
    },
    {
      id: "act-simulate",
      category: "Actions",
      title: "What-If Scenario Simulator",
      subtitle: "Adjust price elasticity, churn mitigation, and headcount sliders",
      icon: <Sliders className="w-4 h-4 text-[#00F4FE]" />,
      screen: "scenario-simulator",
    },
    {
      id: "act-decision",
      category: "Actions",
      title: "Prescriptive Decision Matrix",
      subtitle: "Approve automated mitigations and executive playbooks",
      icon: <Zap className="w-4 h-4 text-emerald-400" />,
      screen: "decision-intelligence",
    },
    {
      id: "act-nl2sql",
      category: "Navigation",
      title: "NL -> SQL Studio",
      subtitle: "Convert natural language queries to partition-optimized SQL",
      icon: <Terminal className="w-4 h-4 text-emerald-400" />,
      screen: "nl-to-sql",
    },
    {
      id: "nav-lineage",
      category: "Navigation",
      title: "Evidence & Calculation Lineage",
      subtitle: "Audit dbt transformations and provenance DAG",
      icon: <Layers className="w-4 h-4 text-blue-400" />,
      screen: "evidence-lineage",
    },
    {
      id: "nav-rag",
      category: "Navigation",
      title: "Enterprise Knowledge Base & Vector RAG",
      subtitle: "Search post-mortems, SOP runbooks, and QBR slides",
      icon: <BookOpen className="w-4 h-4 text-purple-400" />,
      screen: "knowledge-rag",
    },
    {
      id: "nav-health",
      category: "Navigation",
      title: "System Health & Infrastructure",
      subtitle: "Snowflake, ClickHouse, Kafka, and dbt cluster diagnostics",
      icon: <Server className="w-4 h-4 text-slate-300" />,
      screen: "system-health",
    },
  ];

  const filtered = items.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.subtitle?.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Handle keyboard arrow navigation and Enter
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          onNavigate(filtered[selectedIndex].screen);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filtered, selectedIndex, onNavigate, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-[#111319] border border-white/14 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/8 bg-[#0C0E14]">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, metric, screen name, or ask AI..."
            className="flex-1 bg-transparent border-none text-sm text-white placeholder-slate-500 font-mono focus:outline-none"
          />
          <kbd className="px-2 py-0.5 rounded bg-black/40 text-[10px] font-mono text-slate-400 border border-white/10">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs font-mono text-slate-500">
              No matching actions or navigation targets found for "{query}".
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => onNavigate(item.screen)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-[#181C26] text-white border border-[#00F4FE]/30"
                      : "text-slate-300 hover:bg-white/4 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-black/40 border border-white/6 shrink-0">
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-mono truncate">
                          {item.title}
                        </span>
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-white/5 text-slate-400">
                          {item.category}
                        </span>
                      </div>
                      {item.subtitle && (
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pl-2">
                    {item.shortcut && (
                      <kbd className="text-[10px] font-mono text-slate-400 bg-black/40 px-1.5 py-0.5 rounded border border-white/6">
                        {item.shortcut}
                      </kbd>
                    )}
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-[#0C0E14] border-t border-white/8 flex items-center justify-between text-[11px] font-mono text-slate-500">
          <div className="flex items-center gap-3">
            <span>↑↓ to navigate</span>
            <span>↵ to select</span>
            <span>ESC to dismiss</span>
          </div>
          <span className="text-[#00F4FE]">NXUS BI Command Engine</span>
        </div>
      </div>
    </div>
  );
};
