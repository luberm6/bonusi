import type { Request } from "express";
import rateLimit from "express-rate-limit";
import { getClientIp } from "./client-ip.js";

type RateLimitOptions = {
  windowMs: number;
  max: number;
  errorMessage: string;
  keyPrefix: string;
};

export function createRateLimiter(options: RateLimitOptions) {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => `${options.keyPrefix}:${getClientIp(req)}`,
    message: { error: options.errorMessage }
  });
}
