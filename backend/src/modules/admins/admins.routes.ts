import { Router } from "express";
import { authGuard } from "../../common/guards/auth.guard.js";
import { asyncHandler } from "../../common/http/async-handler.js";
import { parseAdminId, parseCreateAdminDto, parseUpdateAdminDto } from "./admins.dto.js";
import { createAdmin, deactivateAdmin, listAdmins, updateAdmin } from "./admins.service.js";

export const adminsRouter = Router();

function getParamId(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

adminsRouter.get(
  "/admins",
  authGuard,
  asyncHandler(async (req, res) => {
    const payload = await listAdmins(req.authUser!);
    res.json(payload);
  })
);

adminsRouter.post(
  "/admins",
  authGuard,
  asyncHandler(async (req, res) => {
    const dto = parseCreateAdminDto(req.body);
    const payload = await createAdmin(req.authUser!, dto);
    res.status(201).json(payload);
  })
);

adminsRouter.patch(
  "/admins/:id",
  authGuard,
  asyncHandler(async (req, res) => {
    const adminId = parseAdminId(getParamId(req.params.id));
    const dto = parseUpdateAdminDto(req.body);
    const payload = await updateAdmin(req.authUser!, adminId, dto);
    res.json(payload);
  })
);

adminsRouter.delete(
  "/admins/:id",
  authGuard,
  asyncHandler(async (req, res) => {
    const adminId = parseAdminId(getParamId(req.params.id));
    const payload = await deactivateAdmin(req.authUser!, adminId);
    res.json(payload);
  })
);
