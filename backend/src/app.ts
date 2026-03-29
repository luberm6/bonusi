import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./common/config/env.js";
import { errorMiddleware } from "./common/http/error-middleware.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { bonusSettingsRouter } from "./modules/bonus-settings/bonus-settings.routes.js";
import { bonusesRouter } from "./modules/bonuses/bonuses.routes.js";
import { branchesRouter } from "./modules/branches/branches.routes.js";
import { filesRouter } from "./modules/attachments/files.routes.js";
import { chatRouter } from "./modules/chat/chat.routes.js";
import { geocodeRouter } from "./modules/geocoding/geocode.routes.js";
import { healthRouter } from "./modules/health/health.route.js";
import { servicesRouter } from "./modules/services/services.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";
import { visitsRouter } from "./modules/visits/visits.routes.js";

export function buildApp() {
  const app = express();
  const trustProxyValue = env.trustProxy === "false" ? false : env.trustProxy === "true" ? true : env.trustProxy;
  app.set("trust proxy", trustProxyValue);

  app.use((req, res, next) => {
    const startedAt = Date.now();
    res.on("finish", () => {
      const ms = Date.now() - startedAt;
      console.log(`[http] ${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`);
    });
    next();
  });

  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (env.corsOrigins.includes("*")) {
          callback(null, true);
          return;
        }
        if (!origin) {
          callback(null, true);
          return;
        }
        if (env.corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error(`CORS origin denied: ${origin}`));
      },
      credentials: true
    })
  );
  app.use(express.json({ limit: "30mb" }));

  app.get("/", (_req, res) => {
    res.json({ service: "autoservice-backend", status: "ok" });
  });

  app.use("/api/v1", healthRouter);
  app.use("/api/v1", authRouter);
  app.use("/api/v1", bonusSettingsRouter);
  app.use("/api/v1", usersRouter);
  app.use("/api/v1", branchesRouter);
  app.use("/api/v1", filesRouter);
  app.use("/api/v1", chatRouter);
  app.use("/api/v1", geocodeRouter);
  app.use("/api/v1", servicesRouter);
  app.use("/api/v1", visitsRouter);
  app.use("/api/v1", bonusesRouter);
  app.use(errorMiddleware);

  return app;
}
