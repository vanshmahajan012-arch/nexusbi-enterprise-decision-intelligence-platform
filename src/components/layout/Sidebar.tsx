import React from "react";
import {
  LayoutDashboard,
  Activity,
  BarChart3,
  AlertTriangle,
  GitFork,
  TrendingUp,
  Sparkles,
  Network,
  Terminal,
  BookOpen,
  Crosshair,
  Sliders,
  AlertOctagon,
  CheckCircle2,
  Server,
  Zap,
  ChevronLeft,
  ChevronRight,
  Shield,
} from "lucide-react";
import { ScreenId, NavItem } from "../../types";

interface SidebarProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeAnomaliesCount: number;
  activeIncidentsCount: number;
}

export const NAV_ITEMS: NavItem[] = [
  // EXECUTIVE
  {
    id: "command-center",
    label: "Command Center",
    category: "EXECUTIVE",
    iconName: "LayoutDashboard",
  },
  {
    id: "decision-intelligence",
    label: "Decision Intelligence",
    category: "EXECUTIVE",
    iconName: "Crosshair",
    badge: "4 Recs",
    badgeType: "cyan",
  },
  {
    id: "scenario-simulator",
    label: "Scenario Simulator",
    category: "EXECUTIVE",
    iconName: "Sliders",
  },
  {
    id: "actions-outcomes",
    label: "Actions & Outcomes",
    category: "EXECUTIVE",
    iconName: "CheckCircle2",
    badge: "Learning",
    badgeType: "emerald",
  },

  // ANALYTICS & AI
  {
    id: "live-intelligence",
    label: "Live Intelligence",
    category: "ANALYTICS & AI",
    iconName: "Activity",
    badge: "Live",
    badgeType: "emerald",
  },
  {
    id: "analytics-explorer",
    label: "Analytics Explorer",
    category: "ANALYTICS & AI",
    iconName: "BarChart3",
  },
  {
    id: "forecasts-prediction",
    label: "Forecasts & Prediction",
    category: "ANALYTICS & AI",
    iconName: "TrendingUp",
  },
  {
    id: "ai-analyst",
    label: "AI Analyst",
    category: "ANALYTICS & AI",
    iconName: "Sparkles",
    badge: "Gemini",
    badgeType: "cyan",
  },

  // DIAGNOSTICS & RCA
  {
    id: "anomaly-center",
    label: "Anomaly Center",
    category: "DIAGNOSTICS & RCA",
    iconName: "AlertTriangle",
    badge: 3,
    badgeType: "rose",
  },
  {
    id: "root-cause-analysis",
    label: "Root Cause (RCA)",
    category: "DIAGNOSTICS & RCA",
    iconName: "GitFork",
    badge: "DAG",
    badgeType: "amber",
  },
  {
    id: "alerts-incidents",
    label: "Alerts & Incidents",
    category: "DIAGNOSTICS & RCA",
    iconName: "AlertOctagon",
    badge: 1,
    badgeType: "rose",
  },

  // DATA & PLATFORM
  {
    id: "nl-to-sql",
    label: "NL -> SQL Engine",
    category: "DATA & PLATFORM",
    iconName: "Terminal",
  },
  {
    id: "knowledge-rag",
    label: "Knowledge & RAG",
    category: "DATA & PLATFORM",
    iconName: "BookOpen",
  },
  {
    id: "evidence-lineage",
    label: "Evidence & Lineage",
    category: "DATA & PLATFORM",
    iconName: "Network",
  },
  {
    id: "system-health",
    label: "System Health",
    category: "DATA & PLATFORM",
    iconName: "Server",
    badge: "99.98%",
    badgeType: "blue",
  },
];

const renderIcon = (name: string, active: boolean) => {
  const className = `w-4 h-4 shrink-0 transition-colors ${
    active ? "text-[#00F4FE]" : "text-slate-400 group-hover:text-slate-200"
  }`;
  switch (name) {
    case "LayoutDashboard":
      return <LayoutDashboard className={className} />;
    case "Activity":
      return <Activity className={className} />;
    case "BarChart3":
      return <BarChart3 className={className} />;
    case "AlertTriangle":
      return <AlertTriangle className={className} />;
    case "GitFork":
      return <GitFork className={className} />;
    case "TrendingUp":
      return <TrendingUp className={className} />;
    case "Sparkles":
      return <Sparkles className={className} />;
    case "Network":
      return <Network className={className} />;
    case "Terminal":
      return <Terminal className={className} />;
    case "BookOpen":
      return <BookOpen className={className} />;
    case "Crosshair":
      return <Crosshair className={className} />;
    case "Sliders":
      return <Sliders className={className} />;
    case "AlertOctagon":
      return <AlertOctagon className={className} />;
    case "CheckCircle2":
      return <CheckCircle2 className={className} />;
    case "Server":
      return <Server className={className} />;
    default:
      return <Zap className={className} />;
  }
};

export const Sidebar: React.FC<SidebarProps> = ({
  currentScreen,
  onNavigate,
  collapsed,
  onToggleCollapse,
  activeAnomaliesCount,
  activeIncidentsCount,
}) => {
  const categories: ("EXECUTIVE" | "ANALYTICS & AI" | "DIAGNOSTICS & RCA" | "DATA & PLATFORM")[] = [
    "EXECUTIVE",
    "ANALYTICS & AI",
    "DIAGNOSTICS & RCA",
    "DATA & PLATFORM",
  ];

  return (
    <aside
      className={`bg-[#0C0E12] border-r border-white/8 flex flex-col justify-between transition-all duration-300 z-40 select-none shrink-0 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Brand Header */}
      <div className="h-14 flex items-center justify-between px-3.5 border-b border-white/8">
        {!collapsed ? (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00F4FE] to-[#3B82F6] flex items-center justify-center shadow-md shadow-[#00F4FE]/20">
              <Zap className="w-4 h-4 text-black font-black" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-bold text-sm tracking-wider font-mono text-white">
                <span>NXUS</span>
                <span className="text-[#00F4FE]">BI</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-white/10 text-slate-300">
                  v2.4
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">Enterprise AI Engine</p>
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 mx-auto rounded-lg bg-gradient-to-br from-[#00F4FE] to-[#3B82F6] flex items-center justify-center">
            <Zap className="w-4 h-4 text-black font-black" />
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {categories.map((cat) => {
          const items = NAV_ITEMS.filter((i) => i.category === cat);
          return (
            <div key={cat} className="space-y-1">
              {!collapsed && (
                <div className="px-3 py-1 text-[10px] uppercase font-mono tracking-wider text-slate-400 font-semibold">
                  {cat}
                </div>
              )}
              {items.map((item) => {
                const isActive = currentScreen === item.id;
                // Dynamic overrides for live counts
                let badgeVal = item.badge;
                let badgeType = item.badgeType;
                if (item.id === "anomaly-center" && activeAnomaliesCount > 0) {
                  badgeVal = activeAnomaliesCount;
                  badgeType = "rose";
                }
                if (item.id === "alerts-incidents" && activeIncidentsCount > 0) {
                  badgeVal = activeIncidentsCount;
                  badgeType = "rose";
                }

                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    title={collapsed ? item.label : undefined}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all group ${
                      isActive
                        ? "bg-[#161C26] text-white font-semibold border-l-2 border-[#00F4FE] shadow-sm shadow-black/30"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/4"
                    } ${collapsed ? "justify-center px-0" : ""}`}
                  >
                    {renderIcon(item.iconName, isActive)}
                    {!collapsed && (
                      <span className="flex-1 text-left truncate">{item.label}</span>
                    )}

                    {!collapsed && badgeVal && (
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${
                          badgeType === "rose"
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            : badgeType === "cyan"
                            ? "bg-cyan-500/15 text-[#00F4FE] border border-cyan-500/30"
                            : badgeType === "amber"
                            ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                            : badgeType === "emerald"
                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                            : "bg-blue-500/15 text-blue-300 border border-blue-500/30"
                        }`}
                      >
                        {badgeVal}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Footer Profile / Tenant */}
      <div className="p-3 border-t border-white/8 bg-[#090A0D]">
        {!collapsed ? (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-slate-800 border border-white/12 flex items-center justify-center text-xs font-mono text-[#00F4FE] font-bold">
              NX
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-slate-200 truncate">Acme Global Corp</div>
              <div className="text-[10px] text-slate-400 font-mono truncate flex items-center gap-1">
                <Shield className="w-2.5 h-2.5 text-emerald-400 inline" /> SOC-2 Type II
              </div>
            </div>
          </div>
        ) : (
          <div className="w-7 h-7 mx-auto rounded-full bg-slate-800 border border-white/12 flex items-center justify-center text-xs font-mono text-[#00F4FE]">
            NX
          </div>
        )}
      </div>
    </aside>
  );
};
