import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  Session,
  User,
} from "@supabase/supabase-js";

import { supabase } from "../lib/supabase";

import {
  recordSecurityEvent,
} from "../services/api";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isDemoMode: boolean;
  enterDemoMode: () => void;
  exitDemoMode: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext =
  createContext<
    AuthContextValue | undefined
  >(undefined);

export const AuthProvider: React.FC<{
  children: React.ReactNode;
}> = ({
  children,
}) => {
  const [
    session,
    setSession,
  ] = useState<Session | null>(
    null,
  );

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isDemoMode,
    setIsDemoMode,
  ] = useState(false);

  useEffect(() => {
    let mounted = true;

    const storedDemoMode =
      window.localStorage.getItem(
        "nxus_demo_mode",
      ) === "true";

    if (storedDemoMode) {
      setIsDemoMode(true);
      setIsLoading(false);

      return () => {
        mounted = false;
      };
    }

    const loadSession =
      async () => {
        const {
          data,
          error,
        } =
          await supabase.auth.getSession();

        if (!mounted) {
          return;
        }

        if (error) {
          console.error(
            "Failed to restore Supabase session:",
            error,
          );

          setSession(null);
        } else {
          setSession(
            data.session,
          );
        }

        setIsLoading(false);
      };

    void loadSession();

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        (
          event,
          nextSession,
        ) => {
          if (!mounted) {
            return;
          }

          setSession(
            nextSession,
          );
          setIsLoading(false);

          /*
           * Only SIGNED_IN is handled here.
           * SIGNUP is recorded directly after a successful
           * supabase.auth.signUp() call in LoginScreen.
           */
          if (
            event === "SIGNED_IN"
          ) {
            window.setTimeout(() => {
              void recordSecurityEvent(
                "LOGIN",
              ).catch(() => {
                // Audit logging must not break authentication.
              });
            }, 0);
          }
        },
      );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const enterDemoMode =
    () => {
      window.localStorage.setItem(
        "nxus_demo_mode",
        "true",
      );

      setSession(null);
      setIsDemoMode(true);

      window.setTimeout(() => {
        void recordSecurityEvent(
          "DEMO_SESSION_START",
        ).catch(() => {
          // Audit logging must not break demo access.
        });
      }, 0);
    };

  const exitDemoMode =
    async () => {
      try {
        /*
         * Keep demo mode enabled while the audit request
         * is sent so apiFetch attaches X-NXUS-Demo.
         */
        window.localStorage.setItem(
          "nxus_demo_mode",
          "true",
        );

        await recordSecurityEvent(
          "DEMO_SESSION_END",
          {
            source: "frontend_demo_exit",
            timestamp:
              new Date().toISOString(),
          },
        );

        console.log(
          "[NXUS BI] DEMO_SESSION_END recorded successfully",
        );
      } catch (error) {
        console.error(
          "[NXUS BI] DEMO_SESSION_END failed:",
          error,
        );
      } finally {
        window.localStorage.removeItem(
          "nxus_demo_mode",
        );

        setIsDemoMode(false);
      }
    };

  const signOut =
    async () => {
      try {
        await recordSecurityEvent(
          "LOGOUT",
        );
      } catch {
        // Audit logging must not block sign out.
      }

      await supabase.auth.signOut();

      window.localStorage.removeItem(
        "nxus_demo_mode",
      );

      setSession(null);
      setIsDemoMode(false);
    };

  const user =
    session?.user ?? null;

  const isAuthenticated =
    Boolean(session) &&
    !isDemoMode;

  const contextValue =
    useMemo<AuthContextValue>(
      () => ({
        user,
        session,
        isLoading,
        isAuthenticated,
        isDemoMode,
        enterDemoMode,
        exitDemoMode,
        signOut,
      }),
      [
        user,
        session,
        isLoading,
        isAuthenticated,
        isDemoMode,
      ],
    );

  return (
    <AuthContext.Provider
      value={contextValue}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth =
  (): AuthContextValue => {
    const context =
      useContext(AuthContext);

    if (!context) {
      throw new Error(
        "useAuth must be used within an AuthProvider",
      );
    }

    return context;
  };
