import React, { useState, useEffect } from "react";
import {
  Search,
  Zap,
  Sparkles,
  Sliders,
  GitFork,
  Terminal,
  Activity,
  AlertOctagon,
  ArrowRight,
  X,
} from "lucide-react";
import { ScreenId } from "../../types";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (screen: ScreenId) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(); // parent handles toggle
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const quickActions = [
    {
      id: "ai-analyst",
      screen: "ai-analyst" as ScreenId,
      title: "Ask AI Analyst: Why did APAC checkout conversion dip?",
      category: "AI Query",
      icon: Sparkles,
      color: "text-[#00F4FE]",
    },
    {
      id: "rca",
      screen: "root-cause-analysis" as ScreenId,
      title: "Investigate Active Root Cause: Incident #1092 (Gateway 504s)",
      category: "RCA Investigation",
      icon: GitFork,
      color: "text-amber-400",
    },
    {
      id: "simulator",
      screen: "scenario-simulator" as ScreenId,
      title: "Simulate: Price Increase +10% vs Churn Elasticity",
      category: "Scenario Playground",
      icon: Sliders,
      color: "text-purple-400",
    },
    {
      id: "nl2sql",
      screen: "nl-to-sql" as ScreenId,
      title: "Run SQL: Top 20 failed checkout sessions in past 48h",
      category: "Data Query",
      icon: Terminal,
      color: "text-emerald-400",
    },
    {
      id: "live",
      screen: "live-intelligence" as ScreenId,
      title: "Inspect Real-time Event Ingestion & Telemetry Stream",
      category: "Live Stream",
      icon: Activity,
      color: "text-blue-400",
    },
    {
      id: "alerts",
      screen: "alerts-incidents" as ScreenId,
      title: "Triage Active Incident Queue (1 P1, 1 P2 active)",
      category: "Alerts & SRE",
      icon: AlertOctagon,
      color: "text-rose-400",
    },
  ];

  const filtered = quickActions.filter((a) =>
    a.title.toLowerCase().includes(query.toLowerCase()) ||
    a.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-[#12141C] border border-white/14 rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-white/10 gap-3">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="Type a command, search metrics, query data marts, or ask AI..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none font-mono"
          />
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          <div className="px-3 py-1 text-[10px] uppercase font-mono tracking-wider text-slate-500">
            Suggested Actions & Navigation
          </div>
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 font-mono">
              No matching commands. Press Enter to search AI semantic index.
            </div>
          ) : (
            filtered.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => {
                    onNavigate(action.screen);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-white/6 text-left transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-1.5 rounded-md bg-white/5 group-hover:bg-white/10 shrink-0">
                      <Icon className={`w-4 h-4 ${action.color}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-200 group-hover:text-[#00F4FE] transition-colors truncate">
                        {action.title}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {action.category}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-300 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-white/8 bg-[#0C0E14] flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1 py-0.5 rounded bg-white/10 text-slate-300">↑↓</kbd> navigate
            </span>
            <span>
              <kbd className="px-1 py-0.5 rounded bg-white/10 text-slate-300">↵</kbd> select
            </span>
            <span>
              <kbd className="px-1 py-0.5 rounded bg-white/10 text-slate-300">esc</kbd> close
            </span>
          </div>
          <span className="text-[#00F4FE]">NXUS BI v2.4 Enterprise</span>
        </div>
      </div>
    </div>
  );
};
