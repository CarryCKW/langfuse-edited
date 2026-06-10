import { useEffect, useRef, useState } from "react";
import { getSession, type SessionContextValue } from "next-auth/react";
import { useRouter } from "next/router";
import { env } from "@/src/env.mjs";

export type ExternalAuthBridgeState =
  | { status: "disabled" }
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success" }
  | { status: "failed"; redirectUrl: string };

function isPerRequestExternalAuth(): boolean {
  return (
    env.NEXT_PUBLIC_EXTERNAL_AUTH_ENABLED === "true" &&
    env.NEXT_PUBLIC_EXTERNAL_AUTH_VALIDATION_MODE === "per_request"
  );
}

function getExternalAuthLoginRedirectUrl(): string {
  const basePath = env.NEXT_PUBLIC_BASE_PATH ?? "";
  return (
    env.NEXT_PUBLIC_EXTERNAL_AUTH_LOGIN_REDIRECT_URL
  );
}

export function useExternalAuthBridge(
  session: SessionContextValue,
): ExternalAuthBridgeState {
  const router = useRouter();
  const [state, setState] = useState<ExternalAuthBridgeState>(() =>
    env.NEXT_PUBLIC_EXTERNAL_AUTH_ENABLED === "true"
      ? { status: "idle" }
      : { status: "disabled" },
  );
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (env.NEXT_PUBLIC_EXTERNAL_AUTH_ENABLED !== "true") {
      return;
    }

    // per_request mode: session is resolved on every request via useAuthSession
    if (isPerRequestExternalAuth()) {
      setState({ status: "disabled" });
      return;
    }

    if (session.status === "loading") {
      return;
    }

    if (session.status === "authenticated") {
      setState({ status: "success" });
      return;
    }

    if (attemptedRef.current) {
      return;
    }

    const isUnauthPath = router.pathname.startsWith("/auth/");
    const isPublicPath = router.pathname.startsWith("/public/");
    if (isUnauthPath || isPublicPath) {
      return;
    }

    attemptedRef.current = true;
    setState({ status: "loading" });

    const basePath = env.NEXT_PUBLIC_BASE_PATH ?? "";
    void fetch(`${basePath}/api/auth/external-bridge`, {
      method: "POST",
      credentials: "include",
    })
      .then(async (response) => {
        if (response.ok) {
          await getSession({ broadcast: true });
          setState({ status: "success" });
          return;
        }

        setState({
          status: "failed",
          redirectUrl: getExternalAuthLoginRedirectUrl(),
        });
      })
      .catch(() => {
        setState({
          status: "failed",
          redirectUrl: getExternalAuthLoginRedirectUrl(),
        });
      });
  }, [session.status, router.pathname]);

  return state;
}
