import { Router } from "express";
import { authGuard } from "../../common/guards/auth.guard.js";
import { asyncHandler } from "../../common/http/async-handler.js";
import { parseCreateUserDto, parseUpdateUserDto, parseUserId } from "./users.dto.js";
import {
  createUser,
  deactivateUser,
  getCurrentUser,
  getUserById,
  listUsers,
  updateUser
} from "./users.service.js";

export const usersRouter = Router();

function getParamId(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

usersRouter.get(
  "/users/me",
  authGuard,
  asyncHandler(async (req, res) => {
    const payload = await getCurrentUser(req.authUser!);
    res.json(payload);
  })
);

usersRouter.post(
  "/users",
  authGuard,
  asyncHandler(async (req, res) => {
    const dto = parseCreateUserDto(req.body);
    const payload = await createUser(req.authUser!, dto);
    res.status(201).json(payload);
  })
);

usersRouter.get(
  "/users",
  authGuard,
  asyncHandler(async (req, res) => {
    const payload = await listUsers(req.authUser!);
    res.json(payload);
  })
);

usersRouter.get(
  "/users/:id",
  authGuard,
  asyncHandler(async (req, res) => {
    const userId = parseUserId(getParamId(req.params.id));
    const payload = await getUserById(req.authUser!, userId);
    res.json(payload);
  })
);

usersRouter.patch(
  "/users/:id",
  authGuard,
  asyncHandler(async (req, res) => {
    const userId = parseUserId(getParamId(req.params.id));
    const dto = parseUpdateUserDto(req.body);
    const payload = await updateUser(req.authUser!, userId, dto);
    res.json(payload);
  })
);

usersRouter.patch(
  "/users/:id/deactivate",
  authGuard,
  asyncHandler(async (req, res) => {
    const userId = parseUserId(getParamId(req.params.id));
    const payload = await deactivateUser(req.authUser!, userId);
    res.json(payload);
  })
);
