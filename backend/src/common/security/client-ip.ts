import type { Request } from "express";

function firstCsvValue(raw: string | string[] | undefined): string | null {
  if (!raw) return null;
  const text = Array.isArray(raw) ? raw[0] : raw;
  if (!text) return null;
  return text.split(",")[0]?.trim() ?? null;
}

export function getClientIp(req: Request): string {
  const cf = firstCsvValue(req.headers["cf-connecting-ip"] as string | string[] | undefined);
  if (cf) return cf;
  const xff = firstCsvValue(req.headers["x-forwarded-for"] as string | string[] | undefined);
  if (xff) return xff;
  return req.ip || "127.0.0.1";
}
