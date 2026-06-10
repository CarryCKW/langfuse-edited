import type { NextApiRequest, NextApiResponse } from "next";
import {
  isExternalAuthPerRequest,
  resolveSessionFromExternalAuth,
} from "@/src/server/externalAuth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate",
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  if (!isExternalAuthPerRequest()) {
    return res.status(404).json({ ok: false, error: "not_enabled" });
  }

  const session = await resolveSessionFromExternalAuth(req.headers.cookie);

  if (!session?.user) {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }

  return res.status(200).json(session);
}
