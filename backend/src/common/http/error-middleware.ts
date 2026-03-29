import type { NextFunction, Request, Response } from "express";
import { HttpError } from "./error.js";
import { toPgHttpError } from "./pg-error.js";

function normalizeDatabaseError(err: unknown) {
  const normalized = toPgHttpError(err);
  if (!normalized) return null;
  return {
    statusCode: normalized.statusCode,
    message: normalized.message
  };
}

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({
      error: err.message,
      message: err.message,
      details: err.details ?? null
    });
  }

  const normalizedDbError = normalizeDatabaseError(err);
  if (normalizedDbError) {
    return res.status(normalizedDbError.statusCode).json({
      error: normalizedDbError.message,
      message: normalizedDbError.message,
      details: null
    });
  }

  console.error("[error]", err);
  return res.status(500).json({ error: "Internal server error", message: "Internal server error", details: null });
}
