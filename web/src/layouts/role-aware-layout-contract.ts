import type { AppRole } from "../shared/types/role";
import { getSidebarForRole, type SidebarGroup } from "../navigation/web-sidebar";

export type RoleAwareLayoutModel = {
  role: AppRole;
  sidebar: SidebarGroup[];
  hideAdminBlocksFromClient: boolean;
};

export function buildRoleAwareLayoutModel(role: AppRole): RoleAwareLayoutModel {
  return {
    role,
    sidebar: getSidebarForRole(role),
    hideAdminBlocksFromClient: role === "client"
  };
}
