import type { AppRole } from "../shared/types/role";
import { getRoutesForRole, type WebRoute } from "./web-routes";

export type SidebarGroup = {
  title: string;
  items: WebRoute[];
};

export function getSidebarForRole(role: AppRole): SidebarGroup[] {
  const routes = getRoutesForRole(role);
  if (role === "client") {
    return [
      {
        title: "Quick Access",
        items: routes.filter((r) => ["client_home", "client_visits", "client_chat", "client_profile"].includes(r.key))
      }
    ];
  }

  const adminGroups: SidebarGroup[] = [
    {
      title: "Operations",
      items: routes.filter((r) =>
        [
          "admin_dashboard",
          "admin_clients",
          "admin_visits",
          "admin_visit_create",
          "admin_services",
          "admin_branches",
          "admin_chat",
          "admin_templates"
        ].includes(r.key)
      )
    },
    {
      title: "Profile",
      items: routes.filter((r) => ["admin_profile"].includes(r.key))
    }
  ];

  if (role === "super_admin") {
    adminGroups.push({
      title: "Governance",
      items: routes.filter((r) =>
        ["super_users", "super_admin_create", "super_audit", "super_security"].includes(r.key)
      )
    });
  }

  return adminGroups;
}
