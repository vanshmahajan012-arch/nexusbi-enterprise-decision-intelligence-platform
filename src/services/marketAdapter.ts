import { MetricSummary } from "../types";
import {
  AaplHistoryResponse,
  AaplMarketSnapshot,
} from "./api";

export function toAaplMetricSummary(
  snapshot: AaplMarketSnapshot,
  history: AaplHistoryResponse,
): MetricSummary {
  const prices = history.points.map(
    (point) => point.price,
  );

  const latestPrice =
    snapshot.price ??
    prices[prices.length - 1] ??
    0;

  const changePct =
    snapshot.percent_change ??
    0;

  const direction =
    changePct > 0
      ? "up"
      : changePct < 0
        ? "down"
        : "neutral";

  return {
    id: "aapl-latest-price",
    title: "AAPL Latest Price",

    value: `${snapshot.currency ?? "USD"} ${latestPrice.toFixed(2)}`,

    numericValue: latestPrice,

    changePct: Math.abs(changePct),

    changeDirection: direction,

    changeIsPositive: changePct > 0,

    timeframe: snapshot.is_market_open
      ? "Live market session"
      : "Market closed",

    sparklineData:
      prices.length > 1
        ? prices
        : [latestPrice],

    anomalyDetected:
      snapshot.status !== "HEALTHY",
  };
}