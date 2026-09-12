import React, {
  useEffect,
  useState,
} from "react";

import {
  getAaplLatestPrice,
  getAuthenticatedUser,
  AuthMeResponse,
} from "../services/api";

interface TestResult {
  status:
    | "IDLE"
    | "TESTING"
    | "PASS"
    | "FAIL";
  message: string;
}

export const ApiConnectionTest: React.FC = () => {
  const [
    aaplResult,
    setAaplResult,
  ] = useState<TestResult>({
    status: "TESTING",
    message: "Testing market API...",
  });

  const [
    aaplValue,
    setAaplValue,
  ] = useState<number | null>(
    null,
  );

  const [
    authResult,
    setAuthResult,
  ] = useState<TestResult>({
    status: "IDLE",
    message:
      "Authentication test not run.",
  });

  const [
    authUser,
    setAuthUser,
  ] = useState<AuthMeResponse | null>(
    null,
  );

  const [
    isAuthTesting,
    setIsAuthTesting,
  ] = useState(false);

  const testMarketApi =
    async () => {
      setAaplResult({
        status: "TESTING",
        message:
          "Testing market API...",
      });

      try {
        const data =
          await getAaplLatestPrice();

        setAaplValue(
          data.price ?? null,
        );

        setAaplResult({
          status: "PASS",
          message:
            "AAPL market API connected.",
        });
      } catch (
        error
      ) {
        setAaplResult({
          status: "FAIL",
          message:
            error instanceof Error
              ? error.message
              : "Market API request failed.",
        });

        setAaplValue(null);
      }
    };

  const testAuthentication =
    async () => {
      setIsAuthTesting(true);

      setAuthResult({
        status: "TESTING",
        message:
          "Validating Supabase session...",
      });

      setAuthUser(null);

      try {
        const user =
          await getAuthenticatedUser();

        setAuthUser(user);

        setAuthResult({
          status: "PASS",
          message:
            "Bearer token accepted by backend.",
        });
      } catch (
        error
      ) {
        setAuthResult({
          status: "FAIL",
          message:
            error instanceof Error
              ? error.message
              : "Authentication request failed.",
        });
      } finally {
        setIsAuthTesting(false);
      }
    };

  useEffect(() => {
    void testMarketApi();
  }, []);

  const statusClass = (
    status: TestResult["status"],
  ) => {
    switch (status) {
      case "PASS":
        return "text-emerald-400";

      case "FAIL":
        return "text-rose-400";

      case "TESTING":
        return "text-amber-400";

      default:
        return "text-slate-400";
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-white/10 bg-[#111319] p-5 text-slate-100">
      <div>
        <h2 className="text-sm font-semibold text-white">
          NXUS API Connection Tests
        </h2>

        <p className="mt-1 text-xs text-slate-500">
          Backend connectivity and authenticated session verification.
        </p>
      </div>

      {/* ---------------------------------------------------
          Market API
          --------------------------------------------------- */}

      <div className="rounded-lg border border-white/8 bg-black/20 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider font-mono text-slate-500">
              Market API
            </div>

            <div
              className={`mt-1 text-xs font-mono ${statusClass(
                aaplResult.status,
              )}`}
            >
              {aaplResult.message}
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              void testMarketApi()
            }
            className="rounded-lg border border-white/10 bg-[#161922] px-3 py-1.5 text-xs font-mono text-slate-300 hover:bg-white/5 transition-colors"
          >
            Test Market API
          </button>
        </div>

        {aaplValue !== null && (
          <div className="mt-3 rounded-lg border border-white/6 bg-black/20 px-3 py-2">
            <div className="text-[10px] uppercase font-mono text-slate-500">
              AAPL
            </div>

            <div className="mt-1 text-lg font-bold font-mono text-white">
              $
              {aaplValue.toFixed(2)}
            </div>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------
          Authentication
          --------------------------------------------------- */}

      <div className="rounded-lg border border-[#00F4FE]/15 bg-[#00F4FE]/5 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider font-mono text-slate-500">
              Authentication
            </div>

            <div
              className={`mt-1 text-xs font-mono ${statusClass(
                authResult.status,
              )}`}
            >
              {authResult.message}
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              void testAuthentication()
            }
            disabled={
              isAuthTesting
            }
            className="rounded-lg bg-gradient-to-r from-[#00F4FE] to-[#3B82F6] px-3 py-1.5 text-xs font-mono font-semibold text-black disabled:opacity-50"
          >
            {isAuthTesting
              ? "Testing..."
              : "Test Authentication"}
          </button>
        </div>

        {authUser && (
          <div className="mt-3 space-y-2 rounded-lg border border-white/6 bg-black/20 p-3">
            <div>
              <div className="text-[10px] uppercase font-mono text-slate-500">
                User ID
              </div>

              <div className="mt-0.5 break-all text-xs font-mono text-slate-200">
                {authUser.user_id}
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-mono text-slate-500">
                Email
              </div>

              <div className="mt-0.5 break-all text-xs font-mono text-slate-200">
                {authUser.email ??
                  "Not provided"}
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-mono text-slate-500">
                Role
              </div>

              <div className="mt-0.5 text-xs font-mono text-slate-200">
                {authUser.role ??
                  "Not provided"}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};