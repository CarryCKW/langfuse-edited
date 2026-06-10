/**
 * Enhanced session hook with retry logic
 *
 * TODO: Remove retry workaround once /api/auth/session reliability is fixed.
 * This hook exists to mitigate exceptions on the /api/auth/session endpoint which
 * cause the session to be unauthenticated even though the user is signed in.
 */

import {
  useSession,
  getSession,
  type SessionContextValue,
} from "next-auth/react";
import { type Session } from "next-auth";
import { useState, useEffect, useCallback } from "react";
import { env } from "@/src/env.mjs";

const MAX_RETRIES = 2;

function isPerRequestExternalAuth(): boolean {
  return (
    env.NEXT_PUBLIC_EXTERNAL_AUTH_ENABLED === "true" &&
    env.NEXT_PUBLIC_EXTERNAL_AUTH_VALIDATION_MODE === "per_request"
  );
}

function usePerRequestExternalAuthSession(
  enabled: boolean,
): SessionContextValue {
  const [status, setStatus] = useState<
    "loading" | "authenticated" | "unauthenticated"
  >(enabled ? "loading" : "unauthenticated");
  const [data, setData] = useState<Session | null>(null);

  const loadSession = useCallback(async () => {
    if (!enabled) return;
    setStatus("loading");
    const basePath = env.NEXT_PUBLIC_BASE_PATH ?? "";
    try {
      const response = await fetch(`${basePath}/api/auth/external-session`, {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        const session = (await response.json()) as Session;
        setData(session);
        setStatus(session.user ? "authenticated" : "unauthenticated");
        return;
      }

      setData(null);
      setStatus("unauthenticated");
    } catch {
      setData(null);
      setStatus("unauthenticated");
    }
  }, [enabled]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  return {
    data,
    status,
    update: loadSession,
  };
}

function useNextAuthSessionWithRetry(enabled: boolean): SessionContextValue {
  const [retryCount, setRetryCount] = useState(0);
  const session = useSession();

  useEffect(() => {
    if (!enabled) return;

    if (session.status === "unauthenticated" && retryCount < MAX_RETRIES) {
      const fetchSession = async () => {
        try {
          await getSession({ broadcast: true });
        } catch (error) {
          console.error("Error fetching session:", error);
        }
        setRetryCount((prevCount) => prevCount + 1);
      };
      void fetchSession();
    }

    if (session.status === "authenticated" && retryCount > 0) {
      setRetryCount(0);
    }
  }, [enabled, session.status, retryCount]);

  if (!enabled) {
    return {
      data: null,
      status: "unauthenticated",
      update: async () => undefined,
    };
  }

  return session.status !== "unauthenticated" || retryCount >= MAX_RETRIES
    ? session
    : { ...session, status: "loading" as const };
}

/**
 * Session hook: NextAuth by default; per_request external auth validates
 * accessToken via GET /api/auth/external-session on each load.
 */
export function useAuthSession(): SessionContextValue {
  const perRequest = isPerRequestExternalAuth();
  const perRequestSession = usePerRequestExternalAuthSession(perRequest);
  const nextAuthSession = useNextAuthSessionWithRetry(!perRequest);
  return perRequest ? perRequestSession : nextAuthSession;
}
