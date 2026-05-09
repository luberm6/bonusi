import { Router } from "express";
import { asyncHandler } from "../../common/http/async-handler.js";
import { getSpbWeather } from "./weather.service.js";

export const weatherRouter = Router();

// Public endpoint — погода кэшируется 3 часа на backend, auth не нужен
weatherRouter.get(
  "/weather/spb",
  asyncHandler(async (_req, res) => {
    const weather = await getSpbWeather();
    res.json(weather);
  })
);
