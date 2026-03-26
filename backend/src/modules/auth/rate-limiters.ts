import { createRateLimiter } from "../../common/security/rate-limit.js";

export const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyPrefix: "login",
  errorMessage: "Too many login requests. Try again later."
});

export const refreshRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 40,
  keyPrefix: "refresh",
  errorMessage: "Too many refresh requests. Try again later."
});
