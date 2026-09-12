import React, {
  useState,
  useEffect,
} from "react";

import { Header } from "./components/layout/Header";
import { Sidebar } from "./components/layout/Sidebar";
import { CommandPalette } from "./components/modals/CommandPalette";
import { LoginScreen } from "./components/auth/LoginScreen";
import { useAuth } from "./auth/AuthContext";
import { recordSecurityEvent } from "./services/api";

// Screen Components
import { CommandCenterScreen } from "./components/screens/CommandCenterScreen";
import { LiveIntelligenceScreen } from "./components/screens/LiveIntelligenceScreen";
import { AnalyticsExplorerScreen } from "./components/screens/AnalyticsExplorerScreen";
import { AnomalyCenterScreen } from "./components/screens/AnomalyCenterScreen";
import { RootCauseAnalysisScreen } from "./components/screens/RootCauseAnalysisScreen";
import { ForecastsPredictionScreen } from "./components/screens/ForecastsPredictionScreen";
import { AIAnalystScreen } from "./components/screens/AIAnalystScreen";
import { EvidenceLineageScreen } from "./components/screens/EvidenceLineageScreen";
import { NLtoSQLScreen } from "./components/screens/NLtoSQLScreen";
import { KnowledgeRAGScreen } from "./components/screens/KnowledgeRAGScreen";
import { DecisionIntelligenceScreen } from "./components/screens/DecisionIntelligenceScreen";
import { ScenarioSimulatorScreen } from "./components/screens/ScenarioSimulatorScreen";
import { AlertsIncidentsScreen } from "./components/screens/AlertsIncidentsScreen";
import { ActionsOutcomesScreen } from "./components/screens/ActionsOutcomesScreen";
import { SystemHealthScreen } from "./components/screens/SystemHealthScreen";

import {
  AnomalyItem,
  PrescriptiveAction,
  ScreenId,
} from "./types";

export default function App() {
  const {
    isLoading: isAuthLoading,
    isAuthenticated,
    isDemoMode,
    enterDemoMode,
    exitDemoMode,
  } = useAuth();

  const [
    currentScreen,
    setCurrentScreen,
  ] = useState<ScreenId>(
    "command-center",
  );

  const [
    isSidebarCollapsed,
    setIsSidebarCollapsed,
  ] = useState(false);

  const [
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
  ] = useState(false);

  const [
    timeRange,
    setTimeRange,
  ] = useState("Last 24h");

  const [
    environment,
    setEnvironment,
  ] = useState(
    "Production (US-East-1)",
  );

  const [
    isRefreshing,
    setIsRefreshing,
  ] = useState(false);

  // ---------------------------------------------------------
  // Cross-screen communication
  // ---------------------------------------------------------

  const [
    selectedAnomalyForRca,
    setSelectedAnomalyForRca,
  ] = useState<AnomalyItem | null>(
    null,
  );

  const [
    executedActions,
    setExecutedActions,
  ] = useState<
    PrescriptiveAction[]
  >([]);

  const [
    activeIncidentTitle,
    setActiveIncidentTitle,
  ] = useState<string>(
    "APAC Checkout Gateway Latency & Conversion Dip (Incident #1092)",
  );

  // Shared Scenario Simulator context
  const [
    selectedScenarioDriver,
    setSelectedScenarioDriver,
  ] = useState<string | null>(
    null,
  );

  const handleNavigate = (
    screen: ScreenId,
  ) => {
    setCurrentScreen(screen);

    void recordSecurityEvent(
      "FEATURE_USED",
      {
        feature: screen,
        action: "screen_navigation",
      },
    ).catch(() => {
      // Activity logging must never block navigation.
    });
  };

  const handleOpenScenario = (
    driver?: string,
  ) => {
    const cleanedDriver =
      driver?.trim();

    if (cleanedDriver) {
      setSelectedScenarioDriver(
        cleanedDriver,
      );
    }

    setCurrentScreen(
      "scenario-simulator",
    );
  };

  const handleSelectAnomalyForRca = (
    anomaly: AnomalyItem,
  ) => {
    setSelectedAnomalyForRca(
      anomaly,
    );

    setActiveIncidentTitle(
      `${anomaly.title} (Incident #1092)`,
    );

    setCurrentScreen(
      "root-cause-analysis",
    );
  };

  const handleExecuteAction = (
    action: PrescriptiveAction,
  ) => {
    setExecutedActions(
      (prev) => [
        action,
        ...prev,
      ],
    );
  };

  // ---------------------------------------------------------
  // Global keyboard shortcut:
  // Cmd+K / Ctrl+K Ã¢â€ â€™ Command Palette
  // ---------------------------------------------------------

  useEffect(() => {
    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (
        (event.metaKey ||
          event.ctrlKey) &&
        event.key.toLowerCase() ===
          "k"
      ) {
        event.preventDefault();

        setIsCommandPaletteOpen(
          (prev) => !prev,
        );
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);

    window.setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  // ---------------------------------------------------------
  // Authentication gate
  // ---------------------------------------------------------

  if (isAuthLoading) {
    return (
      <div className="min-h-screen w-full bg-[#090A0C] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 rounded-xl bg-[#00F4FE]/10 border border-[#00F4FE]/25 flex items-center justify-center mx-auto mb-4">
            <div className="w-4 h-4 rounded-full border-2 border-[#00F4FE]/30 border-t-[#00F4FE] animate-spin" />
          </div>

          <div className="text-sm font-semibold">
            NXUS BI
          </div>

          <div className="text-xs font-mono text-slate-500 mt-1">
            Restoring secure session...
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !isDemoMode) {
    return (
      <LoginScreen
        onDemoMode={
          enterDemoMode
        }
      />
    );
  }

  // ---------------------------------------------------------
  // Authenticated application
  // ---------------------------------------------------------

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#090A0C] text-slate-100 antialiased font-sans">
      {isDemoMode && (
        <div className="fixed top-2 right-2 z-[100] flex items-center gap-2 rounded-lg border border-amber-400/25 bg-amber-400/10 px-3 py-1.5 text-[10px] font-mono text-amber-200 shadow-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse" />
          DEMO MODE
          <button
            type="button"
            onClick={
              exitDemoMode
            }
            className="ml-1 rounded border border-amber-300/20 px-1.5 py-0.5 hover:bg-amber-300/10"
          >
            Exit
          </button>
        </div>
      )}
      {/* Global Command Palette */}
      <CommandPalette
        isOpen={
          isCommandPaletteOpen
        }
        onClose={() =>
          setIsCommandPaletteOpen(
            false,
          )
        }
        onNavigate={(
          screen,
        ) => {
          setCurrentScreen(
            screen,
          );

          setIsCommandPaletteOpen(
            false,
          );
        }}
      />

      {/* Primary Navigation */}
      <Sidebar
        currentScreen={
          currentScreen
        }
        onNavigate={
          handleNavigate
        }
        collapsed={
          isSidebarCollapsed
        }
        onToggleCollapse={() =>
          setIsSidebarCollapsed(
            (prev) => !prev,
          )
        }
        activeAnomaliesCount={1}
        activeIncidentsCount={1}
      />

      {/* Main Application Canvas */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#090A0C]">
        {/* Top Header */}
        <Header
          currentScreen={
            currentScreen
          }
          onNavigate={
            handleNavigate
          }
          onOpenCommandPalette={() =>
            setIsCommandPaletteOpen(
              true,
            )
          }
          activeAlertCount={1}
          timeRange={
            timeRange
          }
          setTimeRange={
            setTimeRange
          }
          env={environment}
          setEnv={
            setEnvironment
          }
          onRefresh={
            handleRefresh
          }
          isRefreshing={
            isRefreshing
          }
        />

        {/* Work Area */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
          <div className="max-w-[1600px] mx-auto w-full">
            {/* Command Center */}
            {currentScreen ===
              "command-center" && (
              <CommandCenterScreen
                onNavigate={
                  handleNavigate
                }
              />
            )}

            {/* Live Intelligence */}
            {currentScreen ===
              "live-intelligence" && (
              <LiveIntelligenceScreen />
            )}

            {/* Analytics Explorer */}
            {currentScreen ===
              "analytics-explorer" && (
              <AnalyticsExplorerScreen
                onNavigate={
                  handleNavigate
                }
              />
            )}

            {/* Anomaly Center */}
            {currentScreen ===
              "anomaly-center" && (
              <AnomalyCenterScreen
                onNavigate={
                  handleNavigate
                }
                onSelectAnomalyForRca={
                  handleSelectAnomalyForRca
                }
              />
            )}

            {/* Root Cause Analysis */}
            {currentScreen ===
              "root-cause-analysis" && (
              <RootCauseAnalysisScreen
                onNavigate={
                  handleNavigate
                }
                selectedIncidentTitle={
                  activeIncidentTitle
                }
              />
            )}

            {/* Forecasts & Prediction */}
            {currentScreen ===
              "forecasts-prediction" && (
              <ForecastsPredictionScreen
                onNavigate={
                  handleNavigate
                }
              />
            )}

            {/* AI Analyst */}
            {currentScreen ===
              "ai-analyst" && (
              <AIAnalystScreen
                onNavigate={
                  handleNavigate
                }
                onOpenScenario={
                  handleOpenScenario
                }
              />
            )}

            {/* Evidence & Lineage */}
            {currentScreen ===
              "evidence-lineage" && (
              <EvidenceLineageScreen
                onNavigate={
                  handleNavigate
                }
              />
            )}

            {/* NL Ã¢â€ â€™ SQL */}
            {currentScreen ===
              "nl-to-sql" && (
              <NLtoSQLScreen
                onNavigate={
                  handleNavigate
                }
              />
            )}

            {/* Knowledge & RAG */}
            {currentScreen ===
              "knowledge-rag" && (
              <KnowledgeRAGScreen
                onNavigate={
                  handleNavigate
                }
              />
            )}

            {/* Decision Intelligence */}
            {currentScreen ===
              "decision-intelligence" && (
              <DecisionIntelligenceScreen
                onNavigate={
                  handleNavigate
                }
                onExecuteAction={
                  handleExecuteAction
                }
              />
            )}

            {/* Scenario Simulator */}
            {currentScreen ===
              "scenario-simulator" && (
              <ScenarioSimulatorScreen
                onNavigate={
                  handleNavigate
                }
                initialDriver={
                  selectedScenarioDriver
                }
                onDriverContextConsumed={() => {
                  setSelectedScenarioDriver(
                    null,
                  );
                }}
              />
            )}

            {/* Alerts & Incidents */}
            {currentScreen ===
              "alerts-incidents" && (
              <AlertsIncidentsScreen
                onNavigate={
                  handleNavigate
                }
              />
            )}

            {/* Actions & Outcomes */}
            {currentScreen ===
              "actions-outcomes" && (
              <ActionsOutcomesScreen
                onNavigate={
                  handleNavigate
                }
              />
            )}

            {/* System Health */}
            {currentScreen ===
              "system-health" && (
              <SystemHealthScreen
                onNavigate={
                  handleNavigate
                }
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}




