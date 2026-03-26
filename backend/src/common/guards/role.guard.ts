import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../http/error.js";
import type { UserRole } from "../types/auth.js";

export function requireRoles(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = req.authUser;
    if (!user) {
      return next(new HttpError(401, "Authentication required"));
    }
    if (!roles.includes(user.role)) {
      return next(new HttpError(403, "Insufficient role"));
    }
    return next();
  };
}
