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
  { key: "home", label: "Главная", path: "/home" },
  { key: "visits", label: "Визиты", path: "/visits" },
  { key: "chat", label: "Чат", path: "/chat" },
  { key: "profile", label: "Профиль", path: "/profile" }
];

const adminTabs: NavItem[] = [
  { key: "dashboard", label: "Дашборд", path: "/admin/dashboard" },
  { key: "visits", label: "Визиты", path: "/admin/visits" },
  { key: "chat", label: "Чат", path: "/admin/chat" },
  { key: "profile", label: "Профиль", path: "/admin/profile" }
];

const adminDrawerCore: NavItem[] = [
  { key: "clients", label: "Клиенты", path: "/admin/clients" },
  { key: "create_client", label: "Создать клиента", path: "/admin/clients/create" },
  { key: "create_visit", label: "Создать визит", path: "/admin/visits/create" },
  { key: "services", label: "Услуги", path: "/admin/services" },
  { key: "create_service", label: "Создать услугу", path: "/admin/services/create" },
  { key: "branches", label: "Филиалы", path: "/admin/branches" },
  { key: "create_branch", label: "Создать филиал", path: "/admin/branches/create" },
  { key: "templates", label: "Шаблоны", path: "/admin/templates" }
];

const superDrawerExtra: NavItem[] = [
  { key: "users", label: "Пользователи", path: "/super/users" },
  { key: "create_admin", label: "Создать администратора", path: "/super/users/admin/create" },
  { key: "audit_logs", label: "Журнал аудита", path: "/super/audit" },
  { key: "security", label: "Сессии и безопасность", path: "/super/security" }
];

export function buildMobileNavigation(role: AppRole): MobileNavigationModel {
  if (role === "client") {
    return {
      role,
      rootStack: [{ key: "login", label: "Вход", path: "/login" }, ...clientTabs],
      tabs: clientTabs,
      drawer: [],
      hiddenSections: ["admin", "super_admin"]
    };
  }

  if (role === "admin") {
    return {
      role,
      rootStack: [{ key: "login", label: "Вход", path: "/login" }, ...adminTabs, ...adminDrawerCore],
      tabs: adminTabs,
      drawer: adminDrawerCore,
      hiddenSections: ["super_admin"]
    };
  }

  return {
    role,
    rootStack: [{ key: "login", label: "Вход", path: "/login" }, ...adminTabs, ...adminDrawerCore, ...superDrawerExtra],
    tabs: adminTabs,
    drawer: [...adminDrawerCore, ...superDrawerExtra],
    hiddenSections: []
  };
}
