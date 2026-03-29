import { Router } from "express";
import { authGuard } from "../../common/guards/auth.guard.js";
import { requireRoles } from "../../common/guards/role.guard.js";
import { asyncHandler } from "../../common/http/async-handler.js";
import { parseBonusSettingsDto } from "./bonus-settings.dto.js";
import { getBonusSettings, updateBonusSettings } from "./bonus-settings.service.js";

export const bonusSettingsRouter = Router();

bonusSettingsRouter.get(
  "/bonus-settings",
  authGuard,
  requireRoles("admin", "super_admin"),
  asyncHandler(async (req, res) => {
    const payload = await getBonusSettings(req.authUser!);
    res.json(payload);
  })
);

bonusSettingsRouter.put(
  "/bonus-settings",
  authGuard,
  requireRoles("admin", "super_admin"),
  asyncHandler(async (req, res) => {
    const dto = parseBonusSettingsDto(req.body);
    const payload = await updateBonusSettings(req.authUser!, dto);
    res.json(payload);
  })
);
