import type { NextFunction, Request, Response } from "express";
import { HttpError } from "./error.js";

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({
      error: err.message,
      details: err.details ?? null
    });
  }

  console.error("[error]", err);
  return res.status(500).json({ error: "Internal server error" });
}
