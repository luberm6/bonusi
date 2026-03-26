import { Router } from "express";
import { authGuard } from "../../common/guards/auth.guard.js";
import { asyncHandler } from "../../common/http/async-handler.js";
import { parseBranchId, parseCreateBranchDto, parseUpdateBranchDto } from "./branches.dto.js";
import {
  createBranch,
  deactivateBranch,
  getBranchById,
  listBranches,
  updateBranch
} from "./branches.service.js";

function getParamId(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export const branchesRouter = Router();

branchesRouter.post(
  "/branches",
  authGuard,
  asyncHandler(async (req, res) => {
    const dto = parseCreateBranchDto(req.body);
    const payload = await createBranch(req.authUser!, dto);
    res.status(201).json(payload);
  })
);

branchesRouter.get(
  "/branches",
  authGuard,
  asyncHandler(async (req, res) => {
    const payload = await listBranches(req.authUser!);
    res.json(payload);
  })
);

branchesRouter.get(
  "/branches/:id",
  authGuard,
  asyncHandler(async (req, res) => {
    const branchId = parseBranchId(getParamId(req.params.id));
    const payload = await getBranchById(req.authUser!, branchId);
    res.json(payload);
  })
);

branchesRouter.patch(
  "/branches/:id",
  authGuard,
  asyncHandler(async (req, res) => {
    const branchId = parseBranchId(getParamId(req.params.id));
    const dto = parseUpdateBranchDto(req.body);
    const payload = await updateBranch(req.authUser!, branchId, dto);
    res.json(payload);
  })
);

branchesRouter.patch(
  "/branches/:id/deactivate",
  authGuard,
  asyncHandler(async (req, res) => {
    const branchId = parseBranchId(getParamId(req.params.id));
    const payload = await deactivateBranch(req.authUser!, branchId);
    res.json(payload);
  })
);
