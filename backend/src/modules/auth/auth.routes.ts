import { Router } from "express";
import { asyncHandler } from "../../common/http/async-handler.js";
import { HttpError } from "../../common/http/error.js";
import { authGuard } from "../../common/guards/auth.guard.js";
import { loginRateLimiter, refreshRateLimiter } from "./rate-limiters.js";
import {
  login,
  logoutAllDevices,
  logoutByRefreshToken,
  logoutBySessionId,
  logoutCurrentDevice,
  listActiveSessions,
  revokeSession,
  registerDevice,
  rotateRefreshToken
} from "./auth.service.js";

export const authRouter = Router();

function getParamId(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

authRouter.post(
  "/auth/login",
  loginRateLimiter,
  asyncHandler(async (req, res) => {
    const { email, password, device } = req.body ?? {};
    if (!email || !password) {
      throw new HttpError(400, "email and password are required");
    }

    const payload = await login({
      email: String(email),
      password: String(password),
      ip: req.ip || "127.0.0.1",
      device: device
        ? {
            deviceId: device.deviceId,
            platform: device.platform,
            deviceName: device.deviceName,
            pushToken: device.pushToken,
            appVersion: device.appVersion
          }
        : undefined
    });
    res.json(payload);
  })
);

authRouter.post(
  "/auth/refresh",
  refreshRateLimiter,
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body ?? {};
    if (!refreshToken) {
      throw new HttpError(400, "refreshToken is required");
    }
    const payload = await rotateRefreshToken(String(refreshToken));
    res.json(payload);
  })
);

authRouter.post(
  "/auth/logout",
  authGuard,
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body ?? {};

    if (refreshToken) {
      await logoutByRefreshToken(String(refreshToken));
      return res.json({ success: true, scope: "refresh-token" });
    }

    if (!req.authSessionId) {
      throw new HttpError(400, "Session id is missing");
    }
    await logoutBySessionId(req.authSessionId);
    return res.json({ success: true, scope: "current-session" });
  })
);

authRouter.post(
  "/devices/register",
  authGuard,
  asyncHandler(async (req, res) => {
    const userId = req.authUser!.id;
    const { platform, deviceName, pushToken, appVersion, deviceId } = req.body ?? {};
    if (!platform) {
      throw new HttpError(400, "platform is required");
    }

    const device = await registerDevice(userId, {
      platform,
      deviceName,
      pushToken,
      appVersion,
      deviceId
    });
    res.json(device);
  })
);

authRouter.post(
  "/devices/logout-current",
  authGuard,
  asyncHandler(async (req, res) => {
    const userId = req.authUser!.id;
    const bodyDeviceId = req.body?.deviceId as string | undefined;
    const deviceId = bodyDeviceId ?? req.authDeviceId;
    if (!deviceId) {
      throw new HttpError(400, "deviceId is required (or must be present in access token)");
    }

    await logoutCurrentDevice(userId, deviceId);
    res.json({ success: true, deviceId });
  })
);

authRouter.post(
  "/devices/logout-all-if-supported",
  authGuard,
  asyncHandler(async (req, res) => {
    await logoutAllDevices(req.authUser!.id);
    res.json({ success: true });
  })
);

authRouter.get(
  "/devices/sessions",
  authGuard,
  asyncHandler(async (req, res) => {
    const sessions = await listActiveSessions(req.authUser!.id);
    res.json(sessions);
  })
);

authRouter.post(
  "/devices/sessions/:id/revoke",
  authGuard,
  asyncHandler(async (req, res) => {
    const sessionId = getParamId(req.params.id);
    if (!sessionId) throw new HttpError(400, "session id is required");
    const result = await revokeSession(req.authUser!.id, sessionId);
    res.json(result);
  })
);
