import { useEffect, useState } from "react";
import {
  AaplHistoryResponse,
  AaplMarketSnapshot,
  getAaplHistory,
  getAaplMarketSnapshot,
} from "../services/api";
import { toAaplMetricSummary } from "../services/marketAdapter";
import { MetricSummary } from "../types";
import {
  LiveMarketEvent,
  useLiveMarketSocket,
} from "./useLiveMarketSocket";

const SNAPSHOT_REFRESH_INTERVAL_MS = 60_000;
const HISTORY_REFRESH_INTERVAL_MS = 60_000;
const FRESHNESS_REFRESH_INTERVAL_MS = 1_000;

/*
 * Market feed freshness policy.
 *
 * We intentionally allow a reasonable gap between live ticks.
 * A small delay does not automatically mean the upstream feed
 * is broken.
 */
const LIVE_THRESHOLD_SECONDS = 15;
const DELAYED_THRESHOLD_SECONDS = 45;

export type LiveFeedState =
  | "CONNECTING"
  | "CONNECTED"
  | "LIVE"
  | "DELAYED"
  | "STALE"
  | "PRE_MARKET"
  | "POST_MARKET"
  | "MARKET_CLOSED"
  | "OFFLINE";

export type MarketSession =
  | "PRE_MARKET"
  | "REGULAR"
  | "POST_MARKET"
  | "CLOSED";

function getNasdaqSession(
  now = new Date(),
): MarketSession {
  const parts = new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone: "America/New_York",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      weekday: "short",
    },
  ).formatToParts(now);

  const weekday =
    parts.find(
      (part) => part.type === "weekday",
    )?.value ?? "Sun";

  const hour = Number(
    parts.find(
      (part) => part.type === "hour",
    )?.value ?? "0",
  );

  const minute = Number(
    parts.find(
      (part) => part.type === "minute",
    )?.value ?? "0",
  );

  const totalMinutes =
    hour * 60 + minute;

  const isWeekday =
    !["Sat", "Sun"].includes(
      weekday,
    );

  if (!isWeekday) {
    return "CLOSED";
  }

  if (
    totalMinutes >= 4 * 60 &&
    totalMinutes < 9 * 60 + 30
  ) {
    return "PRE_MARKET";
  }

  if (
    totalMinutes >= 9 * 60 + 30 &&
    totalMinutes < 16 * 60
  ) {
    return "REGULAR";
  }

  if (
    totalMinutes >= 16 * 60 &&
    totalMinutes < 20 * 60
  ) {
    return "POST_MARKET";
  }

  return "CLOSED";
}

export function useAaplLatestPrice() {
  const [data, setData] =
    useState<MetricSummary | null>(null);

  const [rawData, setRawData] =
    useState<AaplMarketSnapshot | null>(null);

  const [history, setHistory] =
    useState<AaplHistoryResponse | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [lastLiveTickAt, setLastLiveTickAt] =
    useState<number | null>(null);

  const [freshnessSeconds, setFreshnessSeconds] =
    useState<number | null>(null);

  const {
    liveEvent,
    connected: socketConnected,
    error: socketError,
  } = useLiveMarketSocket("AAPL");

  const loadSnapshot = async () => {
    try {
      const [snapshot, historyResult] =
        await Promise.all([
          getAaplMarketSnapshot(),
          getAaplHistory(30),
        ]);

      setRawData(snapshot);
      setHistory(historyResult);

      setData(
        toAaplMetricSummary(
          snapshot,
          historyResult,
        ),
      );

      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load AAPL market data",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadInitialData = async () => {
      if (cancelled) {
        return;
      }

      await loadSnapshot();
    };

    loadInitialData();

    const snapshotInterval =
      window.setInterval(
        loadSnapshot,
        SNAPSHOT_REFRESH_INTERVAL_MS,
      );

    const historyInterval =
      window.setInterval(
        async () => {
          try {
            const historyResult =
              await getAaplHistory(30);

            if (cancelled) {
              return;
            }

            setHistory(historyResult);

            setData((current) => {
              if (!current) {
                return current;
              }

              return {
                ...current,
                sparklineData:
                  historyResult.points.map(
                    (point) => point.price,
                  ),
              };
            });
          } catch {
            // Keep the existing history if refresh fails.
          }
        },
        HISTORY_REFRESH_INTERVAL_MS,
      );

    return () => {
      cancelled = true;
      window.clearInterval(snapshotInterval);
      window.clearInterval(historyInterval);
    };
    // Initial load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!liveEvent) {
      return;
    }

    const now = Date.now();

    setLastLiveTickAt(now);
    setFreshnessSeconds(0);

    setRawData((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        price: liveEvent.price,
        feed_age_seconds: 0,
        received_at:
          liveEvent.received_at ??
          new Date().toISOString(),
        source_timestamp:
          liveEvent.source_timestamp,
      };
    });

    setData((current) => {
      if (!current) {
        return current;
      }

      const existing =
        current.sparklineData ?? [];

      const updatedSparkline = [
        ...existing.slice(-29),
        liveEvent.price,
      ];

      return {
        ...current,
        value: `${liveEvent.currency ?? "USD"} ${liveEvent.price.toFixed(2)}`,
        numericValue: liveEvent.price,
        sparklineData: updatedSparkline,
      };
    });
  }, [liveEvent]);

  useEffect(() => {
    const intervalId =
      window.setInterval(() => {
        if (lastLiveTickAt === null) {
          setFreshnessSeconds(null);
          return;
        }

        const age =
          (Date.now() - lastLiveTickAt) / 1000;

        setFreshnessSeconds(age);
      }, FRESHNESS_REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [lastLiveTickAt]);

  const marketSession =
    getNasdaqSession();

  const feedState: LiveFeedState = (() => {
    /*
     * The WebSocket transport is not connected.
     */
    if (!socketConnected) {
      return "OFFLINE";
    }

    /*
     * During regular market hours, use tick freshness
     * to distinguish LIVE / CONNECTED / DELAYED / STALE.
     */
    if (marketSession === "REGULAR") {
      if (freshnessSeconds === null) {
        return "CONNECTED";
      }

      if (
        freshnessSeconds <
        LIVE_THRESHOLD_SECONDS
      ) {
        return "LIVE";
      }

      if (
        freshnessSeconds <=
        DELAYED_THRESHOLD_SECONDS
      ) {
        return "DELAYED";
      }

      return "STALE";
    }

    /*
     * Outside the regular session, expose the actual
     * exchange session instead of incorrectly reporting
     * every non-regular period as MARKET_CLOSED.
     */
    if (
      marketSession ===
      "PRE_MARKET"
    ) {
      return "PRE_MARKET";
    }

    if (
      marketSession ===
      "POST_MARKET"
    ) {
      return "POST_MARKET";
    }

    return "MARKET_CLOSED";
  })();

  const combinedError =
    error ?? socketError;

  return {
    data,
    rawData,
    history,
    isLoading,
    error: combinedError,
    socketConnected,
    liveEvent:
      liveEvent as LiveMarketEvent | null,
    feedState,
    marketSession,
    freshnessSeconds,
  };
}