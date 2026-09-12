import React, { useState } from "react";

import {
  Search,
  Sparkles,
  ChevronDown,
  AlertOctagon,
  RefreshCw,
  Clock,
  Layers,
  LogOut,
} from "lucide-react";

import { ScreenId } from "../../types";
import { useAuth } from "../../auth/AuthContext";

interface HeaderProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  onOpenCommandPalette: () => void;
  activeAlertCount: number;
  timeRange: string;
  setTimeRange: (range: string) => void;
  env: string;
  setEnv: (env: string) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

const SCREEN_TITLES: Record<
  ScreenId,
  {
    category: string;
    title: string;
  }
> = {
  "command-center": {
    category: "Executive Suite",
    title: "Command Center",
  },
  "live-intelligence": {
    category: "Analytics & AI",
    title: "Live Intelligence Stream",
  },
  "analytics-explorer": {
    category: "Analytics & AI",
    title: "Analytics Explorer",
  },
  "anomaly-center": {
    category: "Diagnostics & RCA",
    title: "Anomaly Center",
  },
  "root-cause-analysis": {
    category: "Diagnostics & RCA",
    title: "Root Cause Analysis (RCA)",
  },
  "forecasts-prediction": {
    category: "Analytics & AI",
    title: "Forecasts & Prediction Engine",
  },
  "ai-analyst": {
    category: "Analytics & AI",
    title: "AI Analyst (Gemini Enterprise)",
  },
  "evidence-lineage": {
    category: "Data & Platform",
    title: "Evidence & Data Lineage",
  },
  "nl-to-sql": {
    category: "Data & Platform",
    title: "Natural Language -> SQL Engine",
  },
  "knowledge-rag": {
    category: "Data & Platform",
    title: "Knowledge Base & RAG Grounding",
  },
  "decision-intelligence": {
    category: "Executive Suite",
    title: "Decision Intelligence Matrix",
  },
  "scenario-simulator": {
    category: "Executive Suite",
    title: "What-If Scenario Simulator",
  },
  "alerts-incidents": {
    category: "Diagnostics & RCA",
    title: "Alerts & Incident Management",
  },
  "actions-outcomes": {
    category: "Executive Suite",
    title: "Actions & Outcomes Feedback",
  },
  "system-health": {
    category: "Data & Platform",
    title: "System Health & Observability",
  },
};

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  onNavigate,
  onOpenCommandPalette,
  activeAlertCount,
  timeRange,
  setTimeRange,
  env,
  setEnv,
  onRefresh,
  isRefreshing = false,
}) => {
  const { user, signOut } = useAuth();

  const [
    showTimeMenu,
    setShowTimeMenu,
  ] = useState(false);

  const [
    showEnvMenu,
    setShowEnvMenu,
  ] = useState(false);

  const [
    showUserMenu,
    setShowUserMenu,
  ] = useState(false);

  const [
    isSigningOut,
    setIsSigningOut,
  ] = useState(false);

  const screenMeta =
    SCREEN_TITLES[currentScreen] ?? {
      category: "NXUS BI",
      title: "Operating System",
    };

  const timeRanges = [
    "Last 15m",
    "Last 1h",
    "Last 24h",
    "Last 7d",
    "Last 30d",
    "Q3 2026",
  ];

  const environments = [
    "Production (US-East-1)",
    "Staging (EU-Central)",
    "Sandbox (Local-CDC)",
  ];

  const userEmail =
    user?.email ?? "Authenticated User";

  const userInitial =
    userEmail.trim().charAt(0).toUpperCase() || "U";

  const handleSignOut = async () => {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);

    try {
      await signOut();
    } catch (error) {
      console.error(
        "Sign out failed:",
        error,
      );
    } finally {
      setIsSigningOut(false);
      setShowUserMenu(false);
    }
  };

  return (
    <header className="h-14 bg-[#090A0C]/90 backdrop-blur-md border-b border-white/8 px-4 flex items-center justify-between z-30 shrink-0 select-none">
      {/* Left */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-400 min-w-0">
          <button
            type="button"
            className="hover:text-slate-200 transition-colors"
            onClick={() =>
              onNavigate("command-center")
            }
          >
            NXUS BI
          </button>

          <span className="text-slate-600">
            /
          </span>

          <span className="text-slate-400">
            {screenMeta.category}
          </span>

          <span className="text-slate-600">
            /
          </span>

          <span className="text-[#00F4FE] font-semibold truncate max-w-[260px]">
            {screenMeta.title}
          </span>
        </div>

        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>AUTHENTICATED</span>
        </div>
      </div>

      {/* Center */}
      <div className="flex-1 max-w-md mx-4 hidden xl:block">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#14171F] hover:bg-[#1A1E29] border border-white/10 text-xs text-slate-400 transition-all hover:border-[#00F4FE]/40 group"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#00F4FE]" />

            <span>
              Search metrics, tables, causal graphs, or ask AI...
            </span>
          </div>

          <kbd className="px-1.5 py-0.5 rounded bg-black/40 text-[10px] font-mono text-slate-400 border border-white/10">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2">
        {/* Critical incident */}
        {activeAlertCount > 0 && (
          <button
            type="button"
            onClick={() =>
              onNavigate("alerts-incidents")
            }
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-mono font-medium transition-colors"
          >
            <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />

            <span>
              {activeAlertCount} Critical Incident
            </span>
          </button>
        )}

        {/* AI Analyst */}
        <button
          type="button"
          onClick={() =>
            onNavigate("ai-analyst")
          }
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-[#00F4FE] text-xs font-mono font-medium transition-all"
        >
          <Sparkles className="w-3.5 h-3.5" />

          <span className="hidden sm:inline">
            Ask AI Analyst
          </span>
        </button>

        {/* Time Range */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowTimeMenu(
                (previous) => !previous,
              );
              setShowEnvMenu(false);
              setShowUserMenu(false);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#14171F] hover:bg-[#1A1E29] border border-white/10 text-xs text-slate-300 font-mono transition-colors"
          >
            <Clock className="w-3.5 h-3.5 text-slate-400" />

            <span className="hidden sm:inline">
              {timeRange}
            </span>

            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showTimeMenu && (
            <div className="absolute right-0 mt-1.5 w-36 bg-[#161922] border border-white/12 rounded-lg shadow-2xl py-1 z-50">
              {timeRanges.map(
                (range) => (
                  <button
                    type="button"
                    key={range}
                    onClick={() => {
                      setTimeRange(range);
                      setShowTimeMenu(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs font-mono transition-colors ${
                      timeRange === range
                        ? "text-[#00F4FE] bg-[#00F4FE]/10 font-medium"
                        : "text-slate-300 hover:bg-white/5"
                    }`}
                  >
                    {range}
                  </button>
                ),
              )}
            </div>
          )}
        </div>

        {/* Environment */}
        <div className="relative hidden md:block">
          <button
            type="button"
            onClick={() => {
              setShowEnvMenu(
                (previous) => !previous,
              );
              setShowTimeMenu(false);
              setShowUserMenu(false);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#14171F] hover:bg-[#1A1E29] border border-white/10 text-xs text-slate-300 font-mono transition-colors"
          >
            <Layers className="w-3.5 h-3.5 text-slate-400" />

            <span>
              {env.split(" ")[0]}
            </span>

            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showEnvMenu && (
            <div className="absolute right-0 mt-1.5 w-52 bg-[#161922] border border-white/12 rounded-lg shadow-2xl py-1 z-50">
              <div className="px-3 py-1 text-[10px] uppercase font-mono tracking-wider text-slate-400 border-b border-white/8">
                Target Cluster
              </div>

              {environments.map(
                (environment) => (
                  <button
                    type="button"
                    key={environment}
                    onClick={() => {
                      setEnv(environment);
                      setShowEnvMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs font-mono transition-colors ${
                      env === environment
                        ? "text-[#00F4FE] bg-[#00F4FE]/10 font-medium"
                        : "text-slate-300 hover:bg-white/5"
                    }`}
                  >
                    {environment}
                  </button>
                ),
              )}
            </div>
          )}
        </div>

        {/* Refresh */}
        <button
          type="button"
          onClick={onRefresh}
          title="Refresh real-time pipeline state"
          className="p-1.5 rounded-md bg-[#14171F] hover:bg-[#1A1E29] border border-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${
              isRefreshing
                ? "animate-spin text-[#00F4FE]"
                : ""
            }`}
          />
        </button>

        {/* User */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowUserMenu(
                (previous) => !previous,
              );
              setShowTimeMenu(false);
              setShowEnvMenu(false);
            }}
            className="flex items-center gap-2 px-2 py-1 rounded-lg bg-[#14171F] hover:bg-[#1A1E29] border border-white/10 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#00F4FE]/30 to-[#3B82F6]/30 border border-[#00F4FE]/30 flex items-center justify-center text-[11px] font-bold text-[#00F4FE]">
              {userInitial}
            </div>

            <div className="hidden lg:block max-w-[150px] text-left">
              <div className="text-[10px] text-slate-500 font-mono">
                AUTHENTICATED
              </div>

              <div className="text-xs text-slate-200 truncate">
                {userEmail}
              </div>
            </div>

            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-1.5 w-64 bg-[#161922] border border-white/12 rounded-xl shadow-2xl overflow-hidden z-50">
              <div className="p-3 border-b border-white/8">
                <div className="text-[10px] uppercase tracking-wider font-mono text-slate-500">
                  Authenticated Account
                </div>

                <div className="text-sm text-white mt-1 break-all">
                  {userEmail}
                </div>
              </div>

              <div className="p-2">
                <div className="px-2 py-1.5 text-[10px] font-mono text-emerald-400">
                  Secure Supabase session active
                </div>

                <button
                  type="button"
                  onClick={() => {
                    void handleSignOut();
                  }}
                  disabled={isSigningOut}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-mono text-rose-300 hover:bg-rose-500/10 transition-colors disabled:opacity-50"
                >
                  <LogOut className="w-3.5 h-3.5" />

                  <span>
                    {isSigningOut
                      ? "Signing out..."
                      : "Sign out"}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};