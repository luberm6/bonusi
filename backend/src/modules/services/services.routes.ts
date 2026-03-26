import { Router } from "express";
import { authGuard } from "../../common/guards/auth.guard.js";
import { asyncHandler } from "../../common/http/async-handler.js";
import { parseCreateServiceDto, parseServiceId, parseUpdateServiceDto } from "./services.dto.js";
import { createService, listServices, updateService } from "./services.service.js";

function getParamId(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export const servicesRouter = Router();

servicesRouter.post(
  "/services",
  authGuard,
  asyncHandler(async (req, res) => {
    const dto = parseCreateServiceDto(req.body);
    const payload = await createService(req.authUser!, dto);
    res.status(201).json(payload);
  })
);

servicesRouter.get(
  "/services",
  authGuard,
  asyncHandler(async (req, res) => {
    const payload = await listServices(req.authUser!);
    res.json(payload);
  })
);

servicesRouter.patch(
  "/services/:id",
  authGuard,
  asyncHandler(async (req, res) => {
    const serviceId = parseServiceId(getParamId(req.params.id));
    const dto = parseUpdateServiceDto(req.body);
    const payload = await updateService(req.authUser!, serviceId, dto);
    res.json(payload);
  })
);
