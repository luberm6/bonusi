import type { AppRole } from "../../shared/types/role";
import { buildMobileNavigation, type MobileNavigationModel } from "./mobile-routes";

export type AuthSession = {
  userId: string;
  role: AppRole;
  token: string;
};

export type NavigationResolution = {
  role: AppRole;
  defaultPath: string;
  navigation: MobileNavigationModel;
};

export function resolveNavigationAfterLogin(session: AuthSession): NavigationResolution {
  const navigation = buildMobileNavigation(session.role);
  const defaultPath =
    session.role === "client" ? "/home" : session.role === "admin" ? "/admin/dashboard" : "/admin/dashboard";
  return {
    role: session.role,
    defaultPath,
    navigation
  };
}
