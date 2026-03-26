import { Router } from "express";
import { authGuard } from "../../common/guards/auth.guard.js";
import { asyncHandler } from "../../common/http/async-handler.js";
import { HttpError } from "../../common/http/error.js";
import { createRateLimiter } from "../../common/security/rate-limit.js";
import { geocodeAddress } from "./geocode.service.js";

const geocodeRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  keyPrefix: "geocode",
  errorMessage: "Too many geocode requests. Please retry later."
});

export const geocodeRouter = Router();

geocodeRouter.post(
  "/geocode",
  authGuard,
  geocodeRateLimiter,
  asyncHandler(async (req, res) => {
    const address = req.body?.address;
    if (!address || typeof address !== "string") {
      throw new HttpError(400, "address is required");
    }

    const geocoded = await geocodeAddress(address);
    res.json(geocoded);
  })
);
