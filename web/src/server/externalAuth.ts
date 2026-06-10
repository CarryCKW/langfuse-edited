import { type Session } from "next-auth";
import { prisma } from "@langfuse/shared/src/db";
import { logger } from "@langfuse/shared/src/server";
import { encode } from "next-auth/jwt";
import type { NextApiResponse } from "next";
import { createProjectMembershipsOnSignup } from "@/src/features/auth/lib/createProjectMembershipsOnSignup";
import { env } from "@/src/env.mjs";
import { getCookieName, getCookieOptions } from "@/src/server/utils/cookies";
import { buildAppSessionForEmail } from "@/src/server/appSession";

const externalAuthValidateResponseSchema = {
  parse(body: unknown): { userId: string; userName: string } {
    if (typeof body !== "object" || body === null) {
      throw new Error("Invalid validate response");
    }
    const { userId, userName } = body as Record<string, unknown>;
    if (typeof userId !== "string" || typeof userName !== "string") {
      throw new Error("Invalid validate response shape");
    }
    return { userId, userName };
  },
};

export function isExternalAuthEnabled(): boolean {
  return env.EXTERNAL_AUTH_ENABLED === "true";
}

export function isExternalAuthPerRequest(): boolean {
  return (
    isExternalAuthEnabled() &&
    env.EXTERNAL_AUTH_VALIDATION_MODE === "per_request"
  );
}

const validateSessionCache = new Map<
  string,
  { session: Session; expiresAt: number }
>();

function isValidateCacheEnabled(): boolean {
  return env.EXTERNAL_AUTH_VALIDATE_CACHE_TTL_SECONDS > 0;
}

function getCachedSession(accessToken: string): Session | null {
  if (!isValidateCacheEnabled()) {
    return null;
  }

  const ttlMs = env.EXTERNAL_AUTH_VALIDATE_CACHE_TTL_SECONDS * 1000;
  const cached = validateSessionCache.get(accessToken);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    validateSessionCache.delete(accessToken);
    return null;
  }
  return cached.session;
}

function setCachedSession(accessToken: string, session: Session): void {
  if (!isValidateCacheEnabled()) {
    return;
  }

  const ttlMs = env.EXTERNAL_AUTH_VALIDATE_CACHE_TTL_SECONDS * 1000;
  validateSessionCache.set(accessToken, {
    session,
    expiresAt: Date.now() + ttlMs,
  });
}

function invalidateCachedSession(accessToken: string): void {
  validateSessionCache.delete(accessToken);
}

/**
 * Per-request auth: validate accessToken with aiops and build a Langfuse Session.
 * Used by getServerAuthSession (tRPC) and GET /api/auth/external-session (UI).
 */
export async function resolveSessionFromExternalAuth(
  cookieHeader: string | undefined,
): Promise<Session | null> {
  console.log("[EXTERNAL AUTH] resolveSessionFromExternalAuth called");
  console.log("[EXTERNAL AUTH] isExternalAuthPerRequest:", isExternalAuthPerRequest());
  console.log("[EXTERNAL AUTH] EXTERNAL_AUTH_ENABLED:", env.EXTERNAL_AUTH_ENABLED);
  console.log("[EXTERNAL AUTH] EXTERNAL_AUTH_VALIDATION_MODE:", env.EXTERNAL_AUTH_VALIDATION_MODE);

  if (!isExternalAuthPerRequest()) {
    console.log("[EXTERNAL AUTH] SKIPPED - not per_request mode");
    return null;
  }

  const accessToken = extractAccessTokenFromCookie(cookieHeader);
  console.log("[EXTERNAL AUTH] accessToken found:", !!accessToken);

  if (!accessToken) {
    console.log("[EXTERNAL AUTH] SKIPPED - no accessToken in cookie");
    return null;
  }

  const cached = getCachedSession(accessToken);
  if (cached) {
    return cached;
  }

  const validation = await validateExternalAuth(accessToken);
  if (!validation.ok) {
    invalidateCachedSession(accessToken);
    return null;
  }

  const user = await findOrCreateExternalUser({
    externalUserId: validation.userId,
    userName: validation.userName,
  });

  // validate 只返回 userId/userName；Langfuse 用合成 email 作唯一键（见 buildExternalUserEmail）
  const sessionEmail =
    user.email ?? buildExternalUserEmail(validation.userId);

  const session = await buildAppSessionForEmail(sessionEmail);
  if (!session?.user) {
    return null;
  }

  setCachedSession(accessToken, session);
  return session;
}

function parseCookieHeader(cookieHeader: string): Record<string, string> {
  return cookieHeader.split(";").reduce<Record<string, string>>((acc, part) => {
    const [rawKey, ...rest] = part.trim().split("=");
    if (!rawKey) return acc;
    acc[rawKey] = decodeURIComponent(rest.join("=") || "");
    return acc;
  }, {});
}

export function extractAccessTokenFromCookie(
  cookieHeader: string | undefined,
): string | null {
  if (!cookieHeader) return null;

  const cookies = parseCookieHeader(cookieHeader);
  const cookieName = env.EXTERNAL_AUTH_ACCESS_TOKEN_COOKIE;
  const token = cookies[cookieName];
  return token && token.length > 0 ? token : null;
}

function buildExternalUserEmail(externalUserId: string): string {
  const normalizedId = externalUserId
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "_");
  return `${normalizedId}@external.local`;
}

export async function validateExternalAuth(
  accessToken: string,
): Promise<
  | { ok: true; userId: string; userName: string }
  | { ok: false; reason: "unauthorized" | "misconfigured" | "error" }
> {
  if (!env.EXTERNAL_AUTH_VALIDATE_URL) {
    logger.error("EXTERNAL_AUTH_VALIDATE_URL is not configured");
    return { ok: false, reason: "misconfigured" };
  }

  // 后端验证请求接口

  const validateUrl = new URL(env.EXTERNAL_AUTH_VALIDATE_URL);
  const urlStr = validateUrl.toString();
  console.log("Sending validate request to:", urlStr);

  validateUrl.searchParams.set("access_token", accessToken);

  try {
    const response = await fetch(validateUrl.toString(), {
      method: "GET",
      headers: {
        accept: "*/*",
      },
    });

    console.log("validate response", response);
    console.log("Validate response status:", response.status);
    console.log("Validate response ok:", response.ok);


    if (response.status === 401) {
      return { ok: false, reason: "unauthorized" };
    }

    if (!response.ok) {
      logger.error("External auth validate request failed", {
        status: response.status,
      });
      return { ok: false, reason: "error" };
    }

    const body: unknown = await response.json();
    const { userId, userName } = externalAuthValidateResponseSchema.parse(body);
    return { ok: true, userId, userName };
  } catch (error) {
    logger.error("External auth validate request errored", error);
    return { ok: false, reason: "error" };
  }
}

async function findOrCreateExternalUser({
  externalUserId,
  userName,
}: {
  externalUserId: string;
  userName: string;
}) {
  const email = buildExternalUserEmail(externalUserId);

  let user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name: userName,
        emailVerified: new Date(),
      },
    });
    await createProjectMembershipsOnSignup(user);
  } else if (user.name !== userName && userName.length > 0) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { name: userName },
    });
  }

  return user;
}

export async function setLangfuseSessionCookie(
  res: NextApiResponse,
  user: { id: string; email: string; name: string | null },
): Promise<void> {
  if (!env.NEXTAUTH_SECRET) {
    throw new Error("NEXTAUTH_SECRET is required for external auth bridge");
  }

  const maxAge = env.AUTH_SESSION_MAX_AGE * 60;
  const sessionToken = await encode({
    token: {
      name: user.name,
      email: user.email,
      sub: user.id,
    },
    secret: env.NEXTAUTH_SECRET,
    maxAge,
  });

  const cookieName = getCookieName("next-auth.session-token");
  const cookieOptions = getCookieOptions();
  const cookieParts = [
    `${cookieName}=${encodeURIComponent(sessionToken)}`,
    `Path=${cookieOptions.path}`,
    "HttpOnly",
    `SameSite=${cookieOptions.sameSite}`,
    `Max-Age=${maxAge}`,
  ];

  if (cookieOptions.secure) {
    cookieParts.push("Secure");
  }
  if (cookieOptions.domain) {
    cookieParts.push(`Domain=${cookieOptions.domain}`);
  }

  res.setHeader("Set-Cookie", cookieParts.join("; "));
}

export type ExternalAuthBridgeResult =
  | {
      ok: true;
      user: { id: string; email: string; name: string | null };
    }
  | {
      ok: false;
      status: 401 | 500;
      error: "unauthorized" | "misconfigured" | "missing_token" | "error";
    };

export async function bridgeExternalAuth(
  cookieHeader: string | undefined,
): Promise<ExternalAuthBridgeResult> {
  if (!isExternalAuthEnabled()) {
    return { ok: false, status: 500, error: "misconfigured" };
  }

  const accessToken = extractAccessTokenFromCookie(cookieHeader);
  if (!accessToken) {
    return { ok: false, status: 401, error: "missing_token" };
  }

  const validation = await validateExternalAuth(accessToken);
  if (!validation.ok) {
    if (validation.reason === "unauthorized") {
      return { ok: false, status: 401, error: "unauthorized" };
    }
    if (validation.reason === "misconfigured") {
      return { ok: false, status: 500, error: "misconfigured" };
    }
    return { ok: false, status: 500, error: "error" };
  }

  const user = await findOrCreateExternalUser({
    externalUserId: validation.userId,
    userName: validation.userName,
  });

  const sessionEmail =
    user.email ?? buildExternalUserEmail(validation.userId);

  return {
    ok: true,
    user: {
      id: user.id,
      email: sessionEmail,
      name: user.name,
    },
  };
}
