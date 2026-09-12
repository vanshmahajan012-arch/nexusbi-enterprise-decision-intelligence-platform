import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Sliders,
  Play,
  RotateCcw,
  Sparkles,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Layers,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Activity,
} from "lucide-react";

import { ScreenId } from "../../types";
import {
  apiFetch,
  recordSecurityEvent,
} from "../../services/api";

interface ScenarioSimulatorScreenProps {
  onNavigate: (
    screen: ScreenId,
  ) => void;

  initialDriver?: string | null;

  onDriverContextConsumed?: () => void;
}

interface Driver {
  driver_type: string;
  driver: string;
  current_value: number;
  previous_value: number;
  absolute_change: number;
  percentage_change: number | null;
  contribution_share_pct: number;
  direction: string;
  significance: string;
}

interface ScenarioPoint {
  change_pct: number;
  scenario_value: number;
  absolute_impact: number;
  impact_pct: number;
  direction: string;
  risk_level: string;
  priority: string;
  decision: string;
  confidence: number;
}

interface ScenarioMatrixEntry {
  driver: string;
  driver_type: string;
  baseline_value: number;
  scenarios: ScenarioPoint[];
}

interface ScenarioOverviewResponse {
  status: string;

  baseline: {
    revenue: number;
    periods?: Record<
      string,
      string
    > | null;
  };

  available_drivers: Driver[];

  scenario_changes: number[];

  scenario_matrix: ScenarioMatrixEntry[];
}

const CHANGE_OPTIONS = [
  -20,
  -10,
  0,
  10,
  20,
];

function formatCurrency(
  value: number,
): string {
  return `$${value.toLocaleString(
    undefined,
    {
      maximumFractionDigits: 0,
    },
  )}`;
}

function formatSignedPct(
  value: number,
): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function riskClass(
  risk: string,
): string {
  switch (risk) {
    case "HIGH":
      return "text-rose-300 border-rose-400/20 bg-rose-400/10";

    case "MEDIUM":
      return "text-amber-300 border-amber-400/20 bg-amber-400/10";

    default:
      return "text-emerald-300 border-emerald-400/20 bg-emerald-400/10";
  }
}

function priorityClass(
  priority: string,
): string {
  switch (priority) {
    case "CRITICAL":
      return "text-rose-300";

    case "HIGH":
      return "text-orange-300";

    case "MEDIUM":
      return "text-amber-300";

    default:
      return "text-slate-400";
  }
}

export const ScenarioSimulatorScreen: React.FC<
  ScenarioSimulatorScreenProps
> = ({
  onNavigate,
  initialDriver,
  onDriverContextConsumed,
}) => {
  const [overview, setOverview] =
    useState<ScenarioOverviewResponse | null>(
      null,
    );

  const [
    selectedDriver,
    setSelectedDriver,
  ] = useState<string>("");

  const [
    selectedChange,
    setSelectedChange,
  ] = useState<number>(-20);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isSimulating,
    setIsSimulating,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const loadOverview = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiFetch(
        "/api/scenarios/overview",
      );

      if (!response.ok) {
        throw new Error(
          `Scenario overview failed (${response.status})`,
        );
      }

      const data =
        (await response.json()) as ScenarioOverviewResponse;

      setOverview(data);

      /*
       * IMPORTANT:
       * Do not blindly reset selectedDriver to the
       * first backend driver after every refresh.
       *
       * Priority:
       * 1. Driver passed from AI Analyst
       * 2. Currently selected driver
       * 3. First available driver
       */

      const requestedDriver =
        initialDriver?.trim();

      const requestedMatch =
        requestedDriver
          ? data.available_drivers.find(
              (driver) =>
                driver.driver.toLowerCase() ===
                requestedDriver.toLowerCase(),
            )
          : undefined;

      const currentMatch =
        selectedDriver
          ? data.available_drivers.find(
              (driver) =>
                driver.driver.toLowerCase() ===
                selectedDriver.toLowerCase(),
            )
          : undefined;

      const nextDriver =
        requestedMatch?.driver ??
        currentMatch?.driver ??
        data.available_drivers[0]
          ?.driver ??
        "";

      setSelectedDriver(
        nextDriver,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load scenario data.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  /*
   * Initial load only.
   *
   * We intentionally do NOT reload the overview every
   * time selectedDriver changes, because changing the
   * dropdown is purely a client-side selection.
   */
  useEffect(() => {
    void loadOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDriver]);

  /*
   * Consume driver context coming from AI Analyst.
   */
  useEffect(() => {
    if (!overview || !initialDriver) {
      return;
    }

    const requestedDriver =
      initialDriver.trim();

    if (!requestedDriver) {
      return;
    }

    const matchedDriver =
      overview.available_drivers.find(
        (driver) =>
          driver.driver.toLowerCase() ===
          requestedDriver.toLowerCase(),
      );

    if (matchedDriver) {
      setSelectedDriver(
        matchedDriver.driver,
      );

      onDriverContextConsumed?.();
    }
  }, [
    initialDriver,
    overview,
    onDriverContextConsumed,
  ]);

  const selectedEntry =
    useMemo<ScenarioMatrixEntry | null>(
      () => {
        if (!overview) {
          return null;
        }

        return (
          overview.scenario_matrix.find(
            (entry) =>
              entry.driver ===
              selectedDriver,
          ) ?? null
        );
      },
      [
        overview,
        selectedDriver,
      ],
    );

  const selectedScenario =
    useMemo(() => {
      if (!selectedEntry) {
        return null;
      }

      const point =
        selectedEntry.scenarios.find(
          (scenario) =>
            scenario.change_pct ===
            selectedChange,
        );

      if (!point) {
        return null;
      }

      return {
        target:
          selectedEntry.driver,

        changePct:
          selectedChange,

        point,

        baselineDriverValue:
          selectedEntry.baseline_value,
      };
    }, [
      selectedEntry,
      selectedChange,
    ]);

  const baselineRevenue =
    overview?.baseline.revenue ?? 0;

  const scenarioRevenue =
    selectedScenario
      ? baselineRevenue +
        selectedScenario.point
          .absolute_impact
      : baselineRevenue;

  const scenarioRevenueDelta =
    selectedScenario
      ? selectedScenario.point
          .absolute_impact
      : 0;

  const handleRunScenario =
    async () => {
      if (!selectedDriver) {
        return;
      }

      setIsSimulating(true);
      setError(null);

      /*
       * Preserve the selected driver before the API call.
       * The overview refresh must never switch the user
       * to EAST just because EAST is the first driver.
       */
      const driverBeingSimulated =
        selectedDriver;

      try {
        const response =
          await apiFetch(
            `/api/scenarios/decision?target=${encodeURIComponent(
              driverBeingSimulated,
            )}&change_pct=${encodeURIComponent(
              selectedChange,
            )}`,
          );

        if (!response.ok) {
          throw new Error(
            `Scenario decision failed (${response.status})`,
          );
        }

        await response.json();

        void recordSecurityEvent(
          "FEATURE_USED",
          {
            feature: "scenario-simulator",
            action: "scenario_executed",
            driver: driverBeingSimulated,
            change_pct: selectedChange,
          },
        ).catch(() => {
          // Activity logging must never block scenario execution.
        });

        /*
         * Refresh matrix data, but preserve the driver
         * that the user actually simulated.
         */
        await loadOverview();

        setSelectedDriver(
          driverBeingSimulated,
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Scenario evaluation failed.",
        );
      } finally {
        setIsSimulating(false);
      }
    };

  const handleReset = () => {
    setSelectedChange(0);

    const firstDriver =
      overview?.available_drivers[0]
        ?.driver;

    if (firstDriver) {
      setSelectedDriver(
        firstDriver,
      );
    }

    setError(null);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111319] border border-white/8 rounded-xl p-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-[#00F4FE]/15 border border-[#00F4FE]/30 text-[#00F4FE] text-xs font-mono font-semibold flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5" />
              NXUS WHAT-IF SCENARIO ENGINE
            </span>

            <span className="text-xs text-slate-500 font-mono">
              Backend-driven scenario intelligence
            </span>
          </div>

          <h1 className="text-xl font-bold text-white tracking-tight">
            Scenario Simulator
          </h1>

          <p className="text-xs text-slate-400">
            Model driver-level revenue changes and immediately see business impact, risk, priority, and recommended action.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={
              handleReset
            }
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#181B24] hover:bg-[#202532] border border-white/10 text-slate-300 font-mono text-xs transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <button
            onClick={() =>
              void handleRunScenario()
            }
            disabled={
              isSimulating ||
              !selectedDriver
            }
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-[#00F4FE] to-[#3B82F6] hover:opacity-90 disabled:opacity-40 text-black font-bold text-xs font-mono transition-all shadow-md shadow-[#00F4FE]/20 cursor-pointer"
          >
            <Play
              className={`w-3.5 h-3.5 ${
                isSimulating
                  ? "animate-spin"
                  : ""
              }`}
            />

            <span>
              {isSimulating
                ? "Evaluating..."
                : "Run Scenario"}
            </span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-xs text-rose-200 font-mono">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="bg-[#111319] border border-white/8 rounded-xl p-8 text-center">
          <Sparkles className="w-6 h-6 mx-auto text-[#00F4FE] animate-spin mb-3" />

          <div className="text-xs font-mono text-slate-400">
            Loading NXUS scenario intelligence...
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT */}
          <div className="bg-[#111319] border border-white/8 rounded-xl p-6 space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/6 pb-3">
              <h2 className="text-xs uppercase font-mono tracking-wider text-slate-400 font-semibold flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-[#00F4FE]" />
                Scenario Controls
              </h2>

              <span className="text-xs font-mono text-slate-500">
                Backend Driven
              </span>
            </div>

            {/* Baseline */}
            <div className="rounded-xl bg-[#151923] border border-white/6 p-4">
              <div className="text-[10px] text-slate-500 uppercase font-mono tracking-wider">
                Current Revenue Baseline
              </div>

              <div className="mt-1 text-2xl font-bold text-[#00F4FE]">
                {formatCurrency(
                  baselineRevenue,
                )}
              </div>
            </div>

            {/* Target Driver */}
            <div className="space-y-2">
              <label className="text-xs text-slate-200 font-semibold font-mono">
                Target Driver
              </label>

              <select
                value={
                  selectedDriver
                }
                onChange={(
                  event,
                ) =>
                  setSelectedDriver(
                    event.target
                      .value,
                  )
                }
                className="w-full bg-black/40 border border-white/8 rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#00F4FE]/50"
              >
                {overview?.available_drivers.map(
                  (driver) => (
                    <option
                      key={
                        driver.driver
                      }
                      value={
                        driver.driver
                      }
                    >
                      {driver.driver} Ã¢â‚¬â€{" "}
                      {
                        driver.driver_type
                      }
                    </option>
                  ),
                )}
              </select>
            </div>

            {/* Driver Context */}
            {selectedEntry && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#151923] rounded-xl border border-white/6 p-3">
                  <div className="text-[10px] text-slate-500 uppercase font-mono">
                    Driver Baseline
                  </div>

                  <div className="mt-1 text-lg font-bold text-white">
                    {formatCurrency(
                      selectedEntry.baseline_value,
                    )}
                  </div>
                </div>

                <div className="bg-[#151923] rounded-xl border border-white/6 p-3">
                  <div className="text-[10px] text-slate-500 uppercase font-mono">
                    Contribution
                  </div>

                  <div className="mt-1 text-lg font-bold text-[#00F4FE]">
                    {
                      overview?.available_drivers.find(
                        (
                          driver,
                        ) =>
                          driver.driver ===
                          selectedDriver,
                      )
                        ?.contribution_share_pct
                    }
                    %
                  </div>
                </div>
              </div>
            )}

            {/* Driver Change */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-200 font-semibold font-mono">
                  Driver Change
                </span>

                <span
                  className={`font-bold font-mono ${
                    selectedChange >
                    0
                      ? "text-emerald-400"
                      : selectedChange <
                        0
                        ? "text-rose-400"
                        : "text-slate-400"
                  }`}
                >
                  {formatSignedPct(
                    selectedChange,
                  )}
                </span>
              </div>

              <input
                type="range"
                min="-20"
                max="20"
                step="10"
                value={
                  selectedChange
                }
                onChange={(
                  event,
                ) =>
                  setSelectedChange(
                    Number(
                      event.target
                        .value,
                    ),
                  )
                }
                className="w-full h-2 bg-black/40 rounded-lg appearance-none cursor-pointer accent-[#00F4FE]"
              />

              <div className="grid grid-cols-5 gap-1">
                {CHANGE_OPTIONS.map(
                  (change) => (
                    <button
                      key={
                        change
                      }
                      onClick={() =>
                        setSelectedChange(
                          change,
                        )
                      }
                      className={`py-1.5 rounded-md border text-[10px] font-mono transition-colors ${
                        selectedChange ===
                        change
                          ? "bg-[#00F4FE]/15 border-[#00F4FE]/40 text-[#00F4FE]"
                          : "bg-black/20 border-white/8 text-slate-400 hover:text-white"
                      }`}
                    >
                      {change > 0
                        ? `+${change}%`
                        : `${change}%`}
                    </button>
                  ),
                )}
              </div>
            </div>

            {/* Scenario Matrix */}
            <div className="space-y-3">
              <div className="text-xs uppercase font-mono tracking-wider text-slate-400 font-semibold">
                Scenario Matrix
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {selectedEntry?.scenarios.map(
                  (
                    scenario,
                  ) => (
                    <button
                      key={
                        scenario.change_pct
                      }
                      onClick={() =>
                        setSelectedChange(
                          scenario.change_pct,
                        )
                      }
                      className={`w-full flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                        selectedChange ===
                        scenario.change_pct
                          ? "border-[#00F4FE]/30 bg-[#00F4FE]/8"
                          : "border-white/6 bg-black/20 hover:bg-white/[0.03]"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {scenario.change_pct >
                        0 ? (
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                        ) : scenario.change_pct <
                          0 ? (
                          <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                        ) : (
                          <Activity className="w-3.5 h-3.5 text-slate-400" />
                        )}

                        <span className="text-xs text-white font-mono">
                          {formatSignedPct(
                            scenario.change_pct,
                          )}
                        </span>
                      </div>

                      <div className="text-right">
                        <div className="text-xs text-slate-300 font-mono">
                          {formatCurrency(
                            scenario.scenario_value,
                          )}
                        </div>

                        <div
                          className={`text-[10px] font-mono ${priorityClass(
                            scenario.priority,
                          )}`}
                        >
                          {
                            scenario.priority
                          }
                        </div>
                      </div>
                    </button>
                  ),
                )}
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="bg-[#111319] border border-white/8 rounded-xl p-6 space-y-6 flex flex-col shadow-xl">
            <div className="flex items-center justify-between border-b border-white/6 pb-3">
              <h2 className="text-xs uppercase font-mono tracking-wider text-slate-400 font-semibold">
                Scenario Impact
              </h2>

              <span className="text-xs font-mono text-[#00F4FE] flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Deterministic What-If
              </span>
            </div>

            {/* Revenue */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-[#151923] p-4 rounded-xl border border-white/6 font-mono">
                <div className="text-[10px] text-slate-400 uppercase">
                  Baseline Revenue
                </div>

                <div className="text-2xl font-bold text-white mt-1">
                  {formatCurrency(
                    baselineRevenue,
                  )}
                </div>
              </div>

              <div className="bg-[#151923] p-4 rounded-xl border border-[#00F4FE]/20 font-mono">
                <div className="text-[10px] text-slate-400 uppercase">
                  Scenario Revenue
                </div>

                <div className="text-2xl font-bold text-[#00F4FE] mt-1">
                  {formatCurrency(
                    scenarioRevenue,
                  )}
                </div>

                <div
                  className={`text-xs font-semibold mt-1 ${
                    scenarioRevenueDelta >=
                    0
                      ? "text-emerald-400"
                      : "text-rose-400"
                  }`}
                >
                  {formatCurrency(
                    scenarioRevenueDelta,
                  )}{" "}
                  vs Base
                </div>
              </div>
            </div>

            {/* Scenario Details */}
            {selectedScenario && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-black/30 rounded-xl border border-white/6 p-4">
                    <div className="text-[10px] text-slate-500 uppercase font-mono">
                      Revenue Impact
                    </div>

                    <div
                      className={`text-xl font-bold font-mono mt-1 ${
                        selectedScenario
                          .point
                          .absolute_impact >=
                        0
                          ? "text-emerald-400"
                          : "text-rose-400"
                      }`}
                    >
                      {formatCurrency(
                        selectedScenario
                          .point
                          .absolute_impact,
                      )}
                    </div>
                  </div>

                  <div className="bg-black/30 rounded-xl border border-white/6 p-4">
                    <div className="text-[10px] text-slate-500 uppercase font-mono">
                      Impact %
                    </div>

                    <div
                      className={`text-xl font-bold font-mono mt-1 ${
                        selectedScenario
                          .point
                          .impact_pct >=
                        0
                          ? "text-emerald-400"
                          : "text-rose-400"
                      }`}
                    >
                      {formatSignedPct(
                        selectedScenario
                          .point
                          .impact_pct,
                      )}
                    </div>
                  </div>
                </div>

                {/* Decision */}
                <div className="rounded-xl border border-white/8 bg-black/30 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-[#00F4FE]" />

                      <span className="text-xs font-mono font-bold text-white">
                        Decision Implication
                      </span>
                    </div>

                    <span
                      className={`px-2 py-1 rounded-md border text-[10px] font-mono font-bold ${riskClass(
                        selectedScenario
                          .point
                          .risk_level,
                      )}`}
                    >
                      {
                        selectedScenario
                          .point
                          .risk_level
                      }{" "}
                      RISK
                    </span>
                  </div>

                  <div className="flex items-start gap-3">
                    <Layers className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />

                    <div>
                      <div className="text-sm font-semibold text-white">
                        {
                          selectedScenario
                            .point
                            .decision
                        }
                      </div>

                      <div className="text-[11px] text-slate-400 font-mono mt-1">
                        Priority:{" "}
                        <span
                          className={priorityClass(
                            selectedScenario
                              .point
                              .priority,
                          )}
                        >
                          {
                            selectedScenario
                              .point
                              .priority
                          }
                        </span>{" "}
                        Ã‚Â· Confidence:{" "}
                        {
                          selectedScenario
                            .point
                            .confidence
                        }
                        %
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Disclaimer */}
            <div className="mt-auto rounded-xl border border-amber-400/15 bg-amber-400/5 p-3 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-300 mt-0.5 shrink-0" />

              <p className="text-[10px] leading-relaxed text-slate-400 font-mono">
                This is a deterministic what-if simulation. It assumes other drivers remain unchanged and should not be interpreted as a statistical forecast.
              </p>
            </div>

            <button
              onClick={() =>
                onNavigate(
                  "decision-intelligence",
                )
              }
              className="w-full py-2.5 rounded-lg bg-[#181C26] hover:bg-[#202534] border border-[#00F4FE]/30 text-[#00F4FE] text-xs font-mono font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span>
                Convert Scenario to Prescriptive Playbook
              </span>

              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

