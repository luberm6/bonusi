import { Router } from "express";
import { authGuard } from "../../common/guards/auth.guard.js";
import { HttpError } from "../../common/http/error.js";
import { asyncHandler } from "../../common/http/async-handler.js";
import { parseBonusOperationDto, parseBonusQuery } from "./bonuses.dto.js";
import { accrual, getBalance, getHistory, writeoff } from "./bonuses.service.js";

function resolveClientId(actorId: string, queryClientId?: string) {
  return queryClientId ?? actorId;
}

export const bonusesRouter = Router();

bonusesRouter.post(
  "/bonuses/accrual",
  authGuard,
  asyncHandler(async (req, res) => {
    const dto = parseBonusOperationDto(req.body);
    const payload = await accrual(req.authUser!, dto);
    res.status(201).json(payload);
  })
);

bonusesRouter.post(
  "/bonuses/writeoff",
  authGuard,
  asyncHandler(async (req, res) => {
    const dto = parseBonusOperationDto(req.body);
    const payload = await writeoff(req.authUser!, dto);
    res.status(201).json(payload);
  })
);

bonusesRouter.get(
  "/bonuses/history",
  authGuard,
  asyncHandler(async (req, res) => {
    const query = parseBonusQuery(req.query as Record<string, unknown>);
    const clientId = resolveClientId(req.authUser!.id, query.clientId);
    if (!clientId) throw new HttpError(400, "client_id is required");
    const payload = await getHistory(req.authUser!, clientId);
    res.json(payload);
  })
);

bonusesRouter.get(
  "/bonuses/balance",
  authGuard,
  asyncHandler(async (req, res) => {
    const query = parseBonusQuery(req.query as Record<string, unknown>);
    const clientId = resolveClientId(req.authUser!.id, query.clientId);
    if (!clientId) throw new HttpError(400, "client_id is required");
    const payload = await getBalance(req.authUser!, clientId);
    res.json(payload);
  })
);
