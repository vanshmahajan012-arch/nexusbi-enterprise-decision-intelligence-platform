import React, {
  FormEvent,
  useState,
} from "react";

import {
  Lock,
  Mail,
  Loader2,
  AlertCircle,
  ShieldCheck,
  UserPlus,
  PlayCircle,
} from "lucide-react";

import { supabase } from "../../lib/supabase";

import {
  recordSecurityEvent,
} from "../../services/api";

interface LoginScreenProps {
  onDemoMode?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onDemoMode,
}) => {
  const [
    email,
    setEmail,
  ] = useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    mode,
    setMode,
  ] = useState<"signin" | "signup">(
    "signin",
  );

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const handleSubmit =
    async (
      event: FormEvent,
    ) => {
      event.preventDefault();

      const normalizedEmail =
        email.trim();

      if (
        !normalizedEmail ||
        !password
      ) {
        setError(
          "Email and password are required.",
        );
        return;
      }

      if (password.length < 8) {
        setError(
          "Password must be at least 8 characters.",
        );
        return;
      }

      setIsSubmitting(true);
      setError(null);

      try {
        if (mode === "signup") {
          const {
            data,
            error: signUpError,
          } =
            await supabase.auth.signUp({
              email:
                normalizedEmail,
              password,
            });

          if (signUpError) {
            throw signUpError;
          }

          /*
           * Record successful signup.
           *
           * This is intentionally done directly after
           * Supabase signup because the current Supabase
           * AuthStateChange event union does not expose
           * SIGNED_UP in this project's TypeScript types.
           */
          try {
            await recordSecurityEvent(
              "SIGNUP",
              {
                email:
                  normalizedEmail,
              },
            );
          } catch {
            /*
             * Audit logging must never prevent the
             * account creation flow from completing.
             */
          }

          if (data.session) {
            setError(null);
          } else {
            setError(
              "Account created. Check your email to confirm the account, then sign in.",
            );

            setMode("signin");
          }
        } else {
          const {
            error: signInError,
          } =
            await supabase.auth.signInWithPassword(
              {
                email:
                  normalizedEmail,
                password,
              },
            );

          if (signInError) {
            throw signInError;
          }
        }
      } catch (
        submitError
      ) {
        setError(
          submitError instanceof
            Error
            ? submitError.message
            : mode === "signup"
              ? "Unable to create account."
              : "Unable to sign in.",
        );
      } finally {
        setIsSubmitting(false);
      }
    };

  return (
    <div className="min-h-screen w-full bg-[#090A0C] text-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-[#111319] border border-white/10 rounded-2xl p-7 shadow-2xl shadow-black/40">
          <div className="flex items-center gap-3 mb-7">
            <div className="w-10 h-10 rounded-xl bg-[#00F4FE]/10 border border-[#00F4FE]/25 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-[#00F4FE]" />
            </div>

            <div>
              <div className="text-lg font-bold text-white">
                NXUS BI
              </div>

              <div className="text-[11px] font-mono text-slate-500">
                Decision Intelligence Platform
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h1 className="text-xl font-bold text-white">
              Sign in
            </h1>

            <p className="text-xs text-slate-400 mt-1">
              Authenticate to access the NXUS enterprise workspace.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-2.5 text-xs text-rose-200 flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />

              <span>
                {error}
              </span>
            </div>
          )}

          <form
            onSubmit={
              handleSubmit
            }
            className="space-y-4"
          >
            <div>
              <label
                htmlFor="email"
                className="block text-[11px] font-mono uppercase text-slate-500 mb-1.5"
              >
                Email
              </label>

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />

                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(
                    event,
                  ) =>
                    setEmail(
                      event.target.value,
                    )
                  }
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-10 py-2.5 text-sm text-white outline-none focus:border-[#00F4FE]/40"
                  placeholder="you@company.com"
                  disabled={
                    isSubmitting
                  }
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-[11px] font-mono uppercase text-slate-500 mb-1.5"
              >
                Password
              </label>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />

                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(
                    event,
                  ) =>
                    setPassword(
                      event.target.value,
                    )
                  }
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-10 py-2.5 text-sm text-white outline-none focus:border-[#00F4FE]/40"
                  placeholder="••••••••"
                  disabled={
                    isSubmitting
                  }
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={
                isSubmitting
              }
              className="w-full mt-2 rounded-lg bg-gradient-to-r from-[#00F4FE] to-[#3B82F6] text-black font-bold text-sm py-2.5 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />

                  {mode === "signup"
                    ? "Creating account..."
                    : "Signing in..."}
                </>
              ) : mode === "signup" ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  Create NXUS Account
                </>
              ) : (
                "Sign in to NXUS"
              )}
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() =>
                setMode(
                  mode === "signin"
                    ? "signup"
                    : "signin",
                )
              }
              className="w-full mt-2 rounded-lg border border-white/10 bg-[#181B24] hover:bg-[#202532] text-slate-200 font-mono text-xs py-2.5 disabled:opacity-60"
            >
              {mode === "signin"
                ? "New here? Create an account"
                : "Already have an account? Sign in"}
            </button>

            {onDemoMode && (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={onDemoMode}
                className="w-full rounded-lg border border-emerald-400/20 bg-emerald-400/5 hover:bg-emerald-400/10 text-emerald-300 font-mono text-xs py-2.5 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <PlayCircle className="w-4 h-4" />
                Explore Demo Mode
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};