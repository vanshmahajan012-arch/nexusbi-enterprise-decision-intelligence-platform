import { supabase } from "../lib/supabase";

const API_BASE_URL =
  "http://127.0.0.1:8000";

/* =========================================================
   Generic authenticated / demo API
   ========================================================= */

export async function apiFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const {
    data,
  } = await supabase.auth.getSession();

  const accessToken =
    data.session?.access_token;

  const headers = new Headers(
    options.headers,
  );

  if (
    options.body &&
    !headers.has("Content-Type")
  ) {
    headers.set(
      "Content-Type",
      "application/json",
    );
  }
  const isDemoMode =
    window.localStorage.getItem(
      "nxus_demo_mode",
    ) === "true";

  if (isDemoMode) {
    headers.delete(
      "Authorization",
    );

    headers.set(
      "X-NXUS-Demo",
      "true",
    );
  } else if (accessToken) {
    headers.set(
      "Authorization",
      `Bearer ${accessToken}`,
    );
  }

  return fetch(
    `${API_BASE_URL}${path}`,
    {
      ...options,
      headers,
    },
  );
}

async function getJson<T>(
  path: string,
): Promise<T> {
  const response =
    await apiFetch(path);

  if (!response.ok) {
    let message =
      `API request failed (${response.status})`;

    try {
      const body =
        (await response.json()) as {
          detail?: string;
          message?: string;
        };

      if (body.detail) {
        message = body.detail;
      } else if (body.message) {
        message = body.message;
      }
    } catch {
      // Keep the default error message.
    }

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

/* =========================================================
   AAPL Market Types
   ========================================================= */

export interface AaplHistoryPoint {
  timestamp: string;
  price: number;
  volume?: number | null;
}

export interface AaplHistoryResponse {
  symbol: string;
  currency?: string | null;
  points: AaplHistoryPoint[];
}

export interface AaplMarketIntelligence {
  day_range_pct?: number | null;
  range_position_pct?: number | null;
  tick_volatility_pct?: number | null;
  volume?: number | null;
}

export interface AaplMarketSnapshot {
  symbol: string;
  price: number;
  currency?: string | null;
  change?: number | null;
  percent_change?: number | null;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  volume?: number | null;
  fifty_two_week_low?: number | null;
  fifty_two_week_high?: number | null;
  exchange?: string | null;
  mic_code?: string | null;
  is_market_open?: boolean;
  status: string;
  feed_age_seconds?: number | null;
  received_at?: string | null;
  source_timestamp?: string | null;
  market_intelligence?: AaplMarketIntelligence | null;
}

/* =========================================================
   Market API
   ========================================================= */

export async function getAaplMarketSnapshot(): Promise<AaplMarketSnapshot> {
  return getJson<AaplMarketSnapshot>(
    "/api/market/aapl/snapshot",
  );
}

export async function getAaplHistory(
  limit = 30,
): Promise<AaplHistoryResponse> {
  return getJson<AaplHistoryResponse>(
    `/api/market/aapl/history?limit=${limit}`,
  );
}

export async function getAaplLatestPrice(): Promise<AaplMarketSnapshot> {
  return getAaplMarketSnapshot();
}

/* =========================================================
   Auth
   ========================================================= */

export interface AuthMeResponse {
  status: string;
  user_id: string;
  email: string | null;
  role: string | null;
}

export async function getAuthenticatedUser(): Promise<AuthMeResponse> {
  return getJson<AuthMeResponse>(
    "/api/auth/me",
  );
}

/* =========================================================
   Security / Lifecycle Events
   ========================================================= */

export async function recordSecurityEvent(
  eventType:
    | "SIGNUP"
    | "LOGIN"
    | "LOGOUT"
    | "DEMO_SESSION_START"
    | "DEMO_SESSION_END"
    | "FEATURE_USED",
  metadata: Record<string, unknown> = {},
): Promise<void> {
  const response = await apiFetch(
    "/api/security/events",
    {
      method: "POST",
      body: JSON.stringify({
        event_type: eventType,
        metadata,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Security event recording failed (${response.status})`,
    );
  }
}

