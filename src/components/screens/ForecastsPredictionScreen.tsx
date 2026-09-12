import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  TrendingUp,
  Sliders,
  Layers,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { ScreenId } from "../../types";
import { apiFetch } from "../../services/api";

interface ForecastsPredictionScreenProps {
  onNavigate: (
    screen: ScreenId,
  ) => void;
}

interface ForecastItem {
  metric: string;
  historical_points: number;
  last_actual: number;
  forecast_p50: number;
  forecast_p10: number;
  forecast_p90: number;
  trend_per_period: number;
  confidence: number;
  model: string;
  explanation: string;
}

interface ForecastResponse {
  status: string;
  metrics_forecasted: number;
  forecasts: ForecastItem[];
}

const METRIC_LABELS: Record<
  string,
  string
> = {
  revenue: "Revenue",
  orders: "Orders",
  units: "Units",
  aov: "Average Order Value",
};

function formatValue(
  metric: string,
  value: number,
): string {
  if (
    metric === "revenue" ||
    metric === "aov"
  ) {
    return `$${value.toLocaleString(
      "en-US",
      {
        maximumFractionDigits: 2,
      },
    )}`;
  }

  return value.toLocaleString(
    "en-US",
    {
      maximumFractionDigits: 2,
    },
  );
}

function formatTrend(
  metric: string,
  value: number,
): string {
  if (value === 0) {
    return "0";
  }

  const formatted =
    metric === "revenue" ||
    metric === "aov"
      ? `$${Math.abs(
          value,
        ).toLocaleString(
          "en-US",
          {
            maximumFractionDigits: 2,
          },
        )}`
      : Math.abs(value).toFixed(
          2,
        );

  return value > 0
    ? `+${formatted}`
    : `-${formatted}`;
}

export const ForecastsPredictionScreen: React.FC<
  ForecastsPredictionScreenProps
> = ({
  onNavigate,
}) => {
  const [
    forecastData,
    setForecastData,
  ] =
    useState<ForecastResponse | null>(
      null,
    );

  const [
    selectedMetric,
    setSelectedMetric,
  ] = useState("revenue");

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isRefreshing,
    setIsRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const loadForecasts =
    async (
      refresh = false,
    ) => {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setError(null);

      try {
        const response =
          await apiFetch(
            "/api/analytics/forecasts",
          );

        if (!response.ok) {
          throw new Error(
            `Forecast request failed (${response.status})`,
          );
        }

        const data =
          (await response.json()) as ForecastResponse;

        setForecastData(data);

        if (
          data.forecasts?.length >
            0 &&
          !data.forecasts.some(
            (item) =>
              item.metric ===
              selectedMetric,
          )
        ) {
          setSelectedMetric(
            data.forecasts[0].metric,
          );
        }
      } catch (
        loadError
      ) {
        setError(
          loadError instanceof
            Error
            ? loadError.message
            : "Unable to load forecasts.",
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    };

  useEffect(() => {
    void loadForecasts();
  }, []);

  const forecasts =
    forecastData?.forecasts ??
    [];

  const selectedForecast =
    forecasts.find(
      (item) =>
        item.metric ===
        selectedMetric,
    ) ??
    forecasts[0] ??
    null;

  const sortedForecasts =
    useMemo(
      () => forecasts,
      [forecasts],
    );

  const averageConfidence =
    forecasts.length > 0
      ? forecasts.reduce(
          (sum, item) =>
            sum + item.confidence,
          0,
        ) / forecasts.length
      : 0;

  const increasingMetrics =
    forecasts.filter(
      (item) =>
        item.trend_per_period > 0,
    ).length;

  const chartMax = selectedForecast
    ? Math.max(
        selectedForecast.last_actual,
        selectedForecast.forecast_p90,
      )
    : 1;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111319] border border-white/8 rounded-xl p-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-[#00F4FE]/15 border border-[#00F4FE]/30 text-[#00F4FE] text-xs font-mono font-semibold">
              FORECASTING ENGINE
            </span>

            <span className="text-xs text-slate-500 font-mono">
              Live backend forecast
            </span>
          </div>

          <h1 className="text-xl font-bold text-white tracking-tight">
            Business Metric Forecasting
          </h1>

          <p className="text-xs text-slate-400">
            Current actuals versus next-period probabilistic forecast bands.
          </p>
        </div>

        <button
          onClick={() =>
            onNavigate(
              "scenario-simulator",
            )
          }
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-[#00F4FE] to-[#3B82F6] hover:opacity-90 text-black font-bold text-xs font-mono"
        >
          <Sliders className="w-3.5 h-3.5" />
          Send to What-If Simulator
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-xs font-mono text-rose-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Controls */}
      <div className="bg-[#111319] border border-white/8 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
          <span className="text-slate-400">
            Metric:
          </span>

          {forecasts.map(
            (forecast) => (
              <button
                key={
                  forecast.metric
                }
                onClick={() =>
                  setSelectedMetric(
                    forecast.metric,
                  )
                }
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  selectedMetric ===
                  forecast.metric
                    ? "bg-[#00F4FE]/15 text-[#00F4FE] border border-[#00F4FE]/30 font-semibold"
                    : "bg-[#14171F] text-slate-400 hover:text-white border border-white/6"
                }`}
              >
                {METRIC_LABELS[
                  forecast.metric
                ] ??
                  forecast.metric}
              </button>
            ),
          )}
        </div>

        <button
          onClick={() =>
            void loadForecasts(
              true,
            )
          }
          disabled={isRefreshing}
          className="px-3 py-2 rounded-lg bg-[#181C26] hover:bg-[#202534] border border-white/10 text-slate-300"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${
              isRefreshing
                ? "animate-spin"
                : ""
            }`}
          />
        </button>
      </div>

      {isLoading ? (
        <div className="bg-[#111319] border border-white/8 rounded-xl p-10 text-center">
          <RefreshCw className="w-6 h-6 mx-auto mb-3 animate-spin text-[#00F4FE]" />

          <div className="text-xs text-slate-400 font-mono">
            Running forecast engine...
          </div>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-[#111319] border border-white/8 rounded-xl p-4">
              <div className="text-[10px] text-slate-400 uppercase font-mono">
                Metrics Forecasted
              </div>

              <div className="text-2xl font-bold text-[#00F4FE]">
                {forecastData?.metrics_forecasted ??
                  0}
              </div>

              <div className="text-xs text-slate-400 font-mono">
                Current backend model set
              </div>
            </div>

            <div className="bg-[#111319] border border-white/8 rounded-xl p-4">
              <div className="text-[10px] text-slate-400 uppercase font-mono">
                Avg Confidence
              </div>

              <div className="text-2xl font-bold text-emerald-400">
                {averageConfidence.toFixed(
                  2,
                )}
                %
              </div>

              <div className="text-xs text-slate-400 font-mono flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Model confidence
              </div>
            </div>

            <div className="bg-[#111319] border border-white/8 rounded-xl p-4">
              <div className="text-[10px] text-slate-400 uppercase font-mono">
                Increasing Metrics
              </div>

              <div className="text-2xl font-bold text-white">
                {increasingMetrics}
              </div>

              <div className="text-xs text-slate-400 font-mono">
                Positive observed trend
              </div>
            </div>

            <div className="bg-[#111319] border border-white/8 rounded-xl p-4">
              <div className="text-[10px] text-slate-400 uppercase font-mono">
                Forecast Model
              </div>

              <div className="text-lg font-bold text-white truncate">
                {selectedForecast?.model ??
                  "â€”"}
              </div>

              <div className="text-xs text-slate-400 font-mono">
                Backend selected model
              </div>
            </div>
          </div>

          {/* Forecast bands */}
          {selectedForecast && (
            <div className="bg-[#111319] border border-white/8 rounded-xl p-6 space-y-6 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/6 pb-4">
                <div>
                  <h2 className="text-base font-bold text-white">
                    {METRIC_LABELS[
                      selectedForecast.metric
                    ] ??
                      selectedForecast.metric}{" "}
                    Forecast
                  </h2>

                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Historical points:{" "}
                    {
                      selectedForecast.historical_points
                    }{" "}
                    Â· Linear trend baseline
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono">
                  <div>
                    <div className="text-[10px] text-slate-500">
                      Last Actual
                    </div>

                    <div className="text-white font-bold">
                      {formatValue(
                        selectedForecast.metric,
                        selectedForecast.last_actual,
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] text-slate-500">
                      P50
                    </div>

                    <div className="text-[#00F4FE] font-bold">
                      {formatValue(
                        selectedForecast.metric,
                        selectedForecast.forecast_p50,
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] text-slate-500">
                      Confidence
                    </div>

                    <div className="text-emerald-400 font-bold">
                      {selectedForecast.confidence.toFixed(
                        2,
                      )}
                      %
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* P10 */}
                <div className="bg-[#141720] rounded-lg border border-white/6 p-4">
                  <div className="text-[10px] uppercase text-slate-500 font-mono">
                    P10 Lower Bound
                  </div>

                  <div className="text-xl font-bold text-rose-400 mt-1">
                    {formatValue(
                      selectedForecast.metric,
                      selectedForecast.forecast_p10,
                    )}
                  </div>
                </div>

                {/* P50 */}
                <div className="bg-[#141720] rounded-lg border border-cyan-500/20 p-4">
                  <div className="text-[10px] uppercase text-slate-500 font-mono">
                    P50 Expected
                  </div>

                  <div className="text-xl font-bold text-[#00F4FE] mt-1">
                    {formatValue(
                      selectedForecast.metric,
                      selectedForecast.forecast_p50,
                    )}
                  </div>
                </div>

                {/* P90 */}
                <div className="bg-[#141720] rounded-lg border border-emerald-500/20 p-4">
                  <div className="text-[10px] uppercase text-slate-500 font-mono">
                    P90 Upper Bound
                  </div>

                  <div className="text-xl font-bold text-emerald-400 mt-1">
                    {formatValue(
                      selectedForecast.metric,
                      selectedForecast.forecast_p90,
                    )}
                  </div>
                </div>
              </div>

              {/* Visual */}
              <div className="h-72 flex items-end justify-center gap-8 px-8 pt-8 border-b border-l border-white/10 bg-black/20 rounded-lg">
                <div className="h-full flex flex-col justify-end items-center gap-2">
                  <div className="text-[10px] text-slate-500 font-mono">
                    ACTUAL
                  </div>

                  <div
                    className="w-20 bg-gradient-to-t from-[#3B82F6]/60 to-[#3B82F6] rounded-t"
                    style={{
                      height: `${Math.max(
                        30,
                        (selectedForecast.last_actual /
                          chartMax) *
                          190,
                      )}px`,
                    }}
                  />

                  <div className="text-xs text-white font-mono">
                    {formatValue(
                      selectedForecast.metric,
                      selectedForecast.last_actual,
                    )}
                  </div>
                </div>

                <div className="h-full flex flex-col justify-end items-center gap-2">
                  <div className="text-[10px] text-slate-500 font-mono">
                    P10
                  </div>

                  <div
                    className="w-20 bg-rose-500/70 rounded-t"
                    style={{
                      height: `${Math.max(
                        20,
                        (selectedForecast.forecast_p10 /
                          chartMax) *
                          190,
                      )}px`,
                    }}
                  />

                  <div className="text-xs text-rose-300 font-mono">
                    {formatValue(
                      selectedForecast.metric,
                      selectedForecast.forecast_p10,
                    )}
                  </div>
                </div>

                <div className="h-full flex flex-col justify-end items-center gap-2">
                  <div className="text-[10px] text-slate-500 font-mono">
                    P50
                  </div>

                  <div
                    className="w-20 bg-gradient-to-t from-[#00F4FE]/40 to-[#00F4FE] rounded-t"
                    style={{
                      height: `${Math.max(
                        25,
                        (selectedForecast.forecast_p50 /
                          chartMax) *
                          190,
                      )}px`,
                    }}
                  />

                  <div className="text-xs text-[#00F4FE] font-bold font-mono">
                    {formatValue(
                      selectedForecast.metric,
                      selectedForecast.forecast_p50,
                    )}
                  </div>
                </div>

                <div className="h-full flex flex-col justify-end items-center gap-2">
                  <div className="text-[10px] text-slate-500 font-mono">
                    P90
                  </div>

                  <div
                    className="w-20 bg-emerald-500/60 rounded-t"
                    style={{
                      height: `${Math.max(
                        30,
                        (selectedForecast.forecast_p90 /
                          chartMax) *
                          190,
                      )}px`,
                    }}
                  />

                  <div className="text-xs text-emerald-300 font-mono">
                    {formatValue(
                      selectedForecast.metric,
                      selectedForecast.forecast_p90,
                    )}
                  </div>
                </div>
              </div>

              {/* Explanation */}
              <div className="bg-black/30 border border-white/6 rounded-lg p-4">
                <div className="flex items-center gap-2 text-xs font-mono text-[#00F4FE] font-semibold mb-2">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Forecast Explanation
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {
                    selectedForecast.explanation
                  }
                </p>

                <div className="mt-3 pt-3 border-t border-white/6 flex flex-wrap gap-4 text-[11px] font-mono">
                  <span className="text-slate-400">
                    Trend:
                    {" "}
                    <strong
                      className={
                        selectedForecast.trend_per_period >=
                        0
                          ? "text-emerald-400"
                          : "text-rose-400"
                      }
                    >
                      {formatTrend(
                        selectedForecast.metric,
                        selectedForecast.trend_per_period,
                      )}
                      / period
                    </strong>
                  </span>

                  <span className="text-slate-400">
                    Range:
                    {" "}
                    <strong className="text-white">
                      {formatValue(
                        selectedForecast.metric,
                        selectedForecast.forecast_p10,
                      )}
                      {" "}
                      â†’
                      {" "}
                      {formatValue(
                        selectedForecast.metric,
                        selectedForecast.forecast_p90,
                      )}
                    </strong>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* All metrics */}
          <div className="bg-[#111319] border border-white/8 rounded-xl p-5 space-y-4">
            <h3 className="text-xs uppercase font-mono tracking-wider text-slate-400 font-semibold flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-[#00F4FE]" />
              Forecast Portfolio
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sortedForecasts.map(
                (forecast) => (
                  <button
                    key={
                      forecast.metric
                    }
                    onClick={() =>
                      setSelectedMetric(
                        forecast.metric,
                      )
                    }
                    className={`text-left p-4 rounded-lg border transition-colors ${
                      selectedMetric ===
                      forecast.metric
                        ? "border-[#00F4FE]/40 bg-[#00F4FE]/5"
                        : "border-white/6 bg-[#141720] hover:border-white/15"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">
                        {
                          METRIC_LABELS[
                            forecast
                              .metric
                          ] ??
                            forecast.metric}
                      </span>

                      <span className="text-[10px] font-mono text-slate-500">
                        {
                          forecast.model
                        }
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-3 font-mono">
                      <div>
                        <div className="text-[9px] text-slate-500">
                          P10
                        </div>
                        <div className="text-xs text-rose-300">
                          {formatValue(
                            forecast.metric,
                            forecast.forecast_p10,
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="text-[9px] text-slate-500">
                          P50
                        </div>
                        <div className="text-xs text-[#00F4FE] font-bold">
                          {formatValue(
                            forecast.metric,
                            forecast.forecast_p50,
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="text-[9px] text-slate-500">
                          P90
                        </div>
                        <div className="text-xs text-emerald-300">
                          {formatValue(
                            forecast.metric,
                            forecast.forecast_p90,
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ),
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};