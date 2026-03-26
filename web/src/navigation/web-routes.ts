import type { AppRole } from "../shared/types/role";

export type UiStateSpec = {
  loading: string;
  empty: string;
  error: string;
};

export type WebRoute = {
  key: string;
  path: string;
  label: string;
  section: "auth" | "client" | "admin" | "super_admin" | "profile" | "chat";
  roles: AppRole[];
  uiState: UiStateSpec;
};

const DEFAULT_UI_STATE: UiStateSpec = {
  loading: "Loading data...",
  empty: "No data yet",
  error: "Something went wrong. Please retry."
};

export const WEB_ROUTES: WebRoute[] = [
  {
    key: "login",
    path: "/login",
    label: "Login",
    section: "auth",
    roles: ["client", "admin", "super_admin"],
    uiState: DEFAULT_UI_STATE
  },
  {
    key: "client_home",
    path: "/home",
    label: "Home",
    section: "client",
    roles: ["client"],
    uiState: {
      loading: "Preparing your dashboard...",
      empty: "No recent activity yet",
      error: "Failed to load home dashboard"
    }
  },
  {
    key: "client_visits",
    path: "/visits",
    label: "Visits",
    section: "client",
    roles: ["client"],
    uiState: DEFAULT_UI_STATE
  },
  {
    key: "client_visit_details",
    path: "/visits/:id",
    label: "Visit Details",
    section: "client",
    roles: ["client"],
    uiState: DEFAULT_UI_STATE
  },
  {
    key: "client_chat",
    path: "/chat",
    label: "Chat",
    section: "chat",
    roles: ["client"],
    uiState: DEFAULT_UI_STATE
  },
  {
    key: "client_profile",
    path: "/profile",
    label: "Profile",
    section: "profile",
    roles: ["client"],
    uiState: DEFAULT_UI_STATE
  },
  {
    key: "admin_dashboard",
    path: "/admin/dashboard",
    label: "Dashboard",
    section: "admin",
    roles: ["admin", "super_admin"],
    uiState: DEFAULT_UI_STATE
  },
  {
    key: "admin_clients",
    path: "/admin/clients",
    label: "Clients",
    section: "admin",
    roles: ["admin", "super_admin"],
    uiState: DEFAULT_UI_STATE
  },
  {
    key: "admin_client_details",
    path: "/admin/clients/:id",
    label: "Client Details",
    section: "admin",
    roles: ["admin", "super_admin"],
    uiState: DEFAULT_UI_STATE
  },
  {
    key: "admin_client_edit",
    path: "/admin/clients/:id/edit",
    label: "Edit Client",
    section: "admin",
    roles: ["admin", "super_admin"],
    uiState: DEFAULT_UI_STATE
  },
  {
    key: "admin_client_create",
    path: "/admin/clients/create",
    label: "Create Client",
    section: "admin",
    roles: ["admin", "super_admin"],
    uiState: DEFAULT_UI_STATE
  },
  {
    key: "admin_visits",
    path: "/admin/visits",
    label: "Visits",
    section: "admin",
    roles: ["admin", "super_admin"],
    uiState: DEFAULT_UI_STATE
  },
  {
    key: "admin_visit_create",
    path: "/admin/visits/create",
    label: "Create Visit",
    section: "admin",
    roles: ["admin", "super_admin"],
    uiState: DEFAULT_UI_STATE
  },
  {
    key: "admin_services",
    path: "/admin/services",
    label: "Services",
    section: "admin",
    roles: ["admin", "super_admin"],
    uiState: DEFAULT_UI_STATE
  },
  {
    key: "admin_service_edit",
    path: "/admin/services/:id/edit",
    label: "Edit Service",
    section: "admin",
    roles: ["admin", "super_admin"],
    uiState: DEFAULT_UI_STATE
  },
  {
    key: "admin_service_create",
    path: "/admin/services/create",
    label: "Create Service",
    section: "admin",
    roles: ["admin", "super_admin"],
    uiState: DEFAULT_UI_STATE
  },
  {
    key: "admin_branches",
    path: "/admin/branches",
    label: "Branches",
    section: "admin",
    roles: ["admin", "super_admin"],
    uiState: DEFAULT_UI_STATE
  },
  {
    key: "admin_branch_edit",
    path: "/admin/branches/:id/edit",
    label: "Edit Branch",
    section: "admin",
    roles: ["admin", "super_admin"],
    uiState: DEFAULT_UI_STATE
  },
  {
    key: "admin_branch_create",
    path: "/admin/branches/create",
    label: "Create Branch",
    section: "admin",
    roles: ["admin", "super_admin"],
    uiState: DEFAULT_UI_STATE
  },
  {
    key: "admin_chat",
    path: "/admin/chat",
    label: "Chat Workspace",
    section: "chat",
    roles: ["admin", "super_admin"],
    uiState: DEFAULT_UI_STATE
  },
  {
    key: "admin_templates",
    path: "/admin/templates",
    label: "Templates",
    section: "admin",
    roles: ["admin", "super_admin"],
    uiState: DEFAULT_UI_STATE
  },
  {
    key: "admin_profile",
    path: "/admin/profile",
    label: "Profile",
    section: "profile",
    roles: ["admin", "super_admin"],
    uiState: DEFAULT_UI_STATE
  },
  {
    key: "super_users",
    path: "/super/users",
    label: "Users",
    section: "super_admin",
    roles: ["super_admin"],
    uiState: DEFAULT_UI_STATE
  },
  {
    key: "super_admin_create",
    path: "/super/users/admin/create",
    label: "Create Admin",
    section: "super_admin",
    roles: ["super_admin"],
    uiState: DEFAULT_UI_STATE
  },
  {
    key: "super_admin_edit",
    path: "/super/users/admin/:id/edit",
    label: "Edit Admin",
    section: "super_admin",
    roles: ["super_admin"],
    uiState: DEFAULT_UI_STATE
  },
  {
    key: "super_audit",
    path: "/super/audit",
    label: "Audit Logs",
    section: "super_admin",
    roles: ["super_admin"],
    uiState: DEFAULT_UI_STATE
  },
  {
    key: "super_security",
    path: "/super/security",
    label: "Security & Sessions",
    section: "super_admin",
    roles: ["super_admin"],
    uiState: DEFAULT_UI_STATE
  }
];

export function getRoutesForRole(role: AppRole): WebRoute[] {
  return WEB_ROUTES.filter((route) => route.roles.includes(role));
}

export function hasRouteAccess(role: AppRole, routeKey: string): boolean {
  return WEB_ROUTES.some((route) => route.key === routeKey && route.roles.includes(role));
}

export function getDefaultPostLoginRoute(role: AppRole): string {
  if (role === "client") return "/home";
  if (role === "admin") return "/admin/dashboard";
  return "/admin/dashboard";
}
