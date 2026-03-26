import type { AuthenticatedUser } from "./auth.js";

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthenticatedUser;
      authSessionId?: string;
      authDeviceId?: string | null;
    }
  }
}

export {};
