import type { NextApiRequest, NextApiResponse } from "next";
import {
  bridgeExternalAuth,
  isExternalAuthEnabled,
  setLangfuseSessionCookie,
} from "@/src/server/externalAuth";
import { getServerAuthSession } from "@/src/server/auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate",
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  if (!isExternalAuthEnabled()) {
    return res.status(404).json({ ok: false, error: "not_enabled" });
  }

  const existingSession = await getServerAuthSession({ req, res });
  if (existingSession?.user?.id) {
    return res.status(200).json({ ok: true, userId: existingSession.user.id });
  }

  const bridgeResult = await bridgeExternalAuth(req.headers.cookie);

  if (!bridgeResult.ok) {
    return res.status(bridgeResult.status).json({
      ok: false,
      error: bridgeResult.error,
    });
  }

  await setLangfuseSessionCookie(res, bridgeResult.user);

  return res.status(200).json({ ok: true, userId: bridgeResult.user.id });
}
