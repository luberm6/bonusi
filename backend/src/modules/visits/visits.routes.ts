import { Router } from "express";
import { authGuard } from "../../common/guards/auth.guard.js";
import { asyncHandler } from "../../common/http/async-handler.js";
import { parseCreateVisitDto, parseVisitId, parseVisitsFilter } from "./visits.dto.js";
import { createVisit, getVisitById, listVisits } from "./visits.service.js";

function getParamId(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export const visitsRouter = Router();

visitsRouter.post(
  "/visits",
  authGuard,
  asyncHandler(async (req, res) => {
    const dto = parseCreateVisitDto(req.body);
    const payload = await createVisit(req.authUser!, dto);
    res.status(201).json(payload);
  })
);

visitsRouter.get(
  "/visits",
  authGuard,
  asyncHandler(async (req, res) => {
    const filters = parseVisitsFilter(req.query as Record<string, unknown>);
    const payload = await listVisits(req.authUser!, filters);
    res.json(payload);
  })
);

visitsRouter.get(
  "/visits/:id",
  authGuard,
  asyncHandler(async (req, res) => {
    const visitId = parseVisitId(getParamId(req.params.id));
    const payload = await getVisitById(req.authUser!, visitId);
    res.json(payload);
  })
);
