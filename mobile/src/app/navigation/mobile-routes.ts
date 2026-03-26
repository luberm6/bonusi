import type { AppRole } from "../../shared/types/role";

export type NavItem = {
  key: string;
  label: string;
  path: string;
};

export type MobileNavigationModel = {
  role: AppRole;
  rootStack: NavItem[];
  tabs: NavItem[];
  drawer: NavItem[];
  hiddenSections: string[];
};

const clientTabs: NavItem[] = [
  { key: "home", label: "Home", path: "/home" },
  { key: "visits", label: "Visits", path: "/visits" },
  { key: "chat", label: "Chat", path: "/chat" },
  { key: "profile", label: "Profile", path: "/profile" }
];

const adminTabs: NavItem[] = [
  { key: "dashboard", label: "Dashboard", path: "/admin/dashboard" },
  { key: "visits", label: "Visits", path: "/admin/visits" },
  { key: "chat", label: "Chat", path: "/admin/chat" },
  { key: "profile", label: "Profile", path: "/admin/profile" }
];

const adminDrawerCore: NavItem[] = [
  { key: "clients", label: "Clients", path: "/admin/clients" },
  { key: "create_client", label: "Create Client", path: "/admin/clients/create" },
  { key: "create_visit", label: "Create Visit", path: "/admin/visits/create" },
  { key: "services", label: "Services", path: "/admin/services" },
  { key: "create_service", label: "Create Service", path: "/admin/services/create" },
  { key: "branches", label: "Branches", path: "/admin/branches" },
  { key: "create_branch", label: "Create Branch", path: "/admin/branches/create" },
  { key: "templates", label: "Templates", path: "/admin/templates" }
];

const superDrawerExtra: NavItem[] = [
  { key: "users", label: "Users", path: "/super/users" },
  { key: "create_admin", label: "Create Admin", path: "/super/users/admin/create" },
  { key: "audit_logs", label: "Audit Logs", path: "/super/audit" },
  { key: "security", label: "Security Sessions", path: "/super/security" }
];

export function buildMobileNavigation(role: AppRole): MobileNavigationModel {
  if (role === "client") {
    return {
      role,
      rootStack: [{ key: "login", label: "Login", path: "/login" }, ...clientTabs],
      tabs: clientTabs,
      drawer: [],
      hiddenSections: ["admin", "super_admin"]
    };
  }

  if (role === "admin") {
    return {
      role,
      rootStack: [{ key: "login", label: "Login", path: "/login" }, ...adminTabs, ...adminDrawerCore],
      tabs: adminTabs,
      drawer: adminDrawerCore,
      hiddenSections: ["super_admin"]
    };
  }

  return {
    role,
    rootStack: [{ key: "login", label: "Login", path: "/login" }, ...adminTabs, ...adminDrawerCore, ...superDrawerExtra],
    tabs: adminTabs,
    drawer: [...adminDrawerCore, ...superDrawerExtra],
    hiddenSections: []
  };
}
