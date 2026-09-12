import { useEffect, useRef, useState } from "react";

export interface LiveMarketEvent {
  event: "market-price";
  symbol: string;
  price: number;
  currency: string | null;
  exchange: string | null;
  mic_code: string | null;
  day_volume: number;
  source_timestamp: string;
  received_at: string | null;
}

const WS_BASE_URL =
  window.location.protocol === "https:"
    ? "wss://127.0.0.1:8000"
    : "ws://127.0.0.1:8000";

const MARKET_WS_URL = `${WS_BASE_URL}/ws/market`;

export function useLiveMarketSocket(symbol = "AAPL") {
  const [liveEvent, setLiveEvent] =
    useState<LiveMarketEvent | null>(null);

  const [connected, setConnected] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const socketRef =
    useRef<WebSocket | null>(null);

  useEffect(() => {
    let cancelled = false;
    let reconnectTimer: number | null = null;

    const connect = () => {
      if (cancelled) {
        return;
      }

      const socket = new WebSocket(MARKET_WS_URL);
      socketRef.current = socket;

      socket.onopen = () => {
        if (cancelled) {
          return;
        }

        setConnected(true);
        setError(null);

        // Keep the backend WebSocket alive.
        socket.send("client-ready");
      };

      socket.onmessage = (event) => {
        if (cancelled) {
          return;
        }

        try {
          const payload =
            JSON.parse(event.data) as LiveMarketEvent;

          if (
            payload.event === "market-price" &&
            payload.symbol === symbol
          ) {
            setLiveEvent(payload);
          }
        } catch {
          // Ignore malformed messages rather than
          // breaking the live connection.
        }
      };

      socket.onerror = () => {
        if (!cancelled) {
          setError("Live market connection error");
        }
      };

      socket.onclose = () => {
        if (cancelled) {
          return;
        }

        setConnected(false);

        reconnectTimer = window.setTimeout(
          connect,
          3000,
        );
      };
    };

    connect();

    return () => {
      cancelled = true;

      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
      }

      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [symbol]);

  return {
    liveEvent,
    connected,
    error,
  };
}