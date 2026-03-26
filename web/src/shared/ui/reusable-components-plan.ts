export type ReusableComponentSpec = {
  name: string;
  purpose: string;
  usedBy: string[];
};

export const REUSABLE_COMPONENTS_PLAN: ReusableComponentSpec[] = [
  {
    name: "AppShell",
    purpose: "Global web shell with sidebar/topbar and role-aware navigation slots",
    usedBy: ["client", "admin", "super_admin"]
  },
  {
    name: "AsyncStatePanel",
    purpose: "Unified loading/empty/error render pattern across lists and details",
    usedBy: ["client", "admin", "super_admin"]
  },
  {
    name: "QuickActionGrid",
    purpose: "Fast action cards for Home and Dashboard",
    usedBy: ["client", "admin"]
  },
  {
    name: "EntityListPage",
    purpose: "Standard list with search/filter/empty states (clients, visits, services, branches, users)",
    usedBy: ["admin", "super_admin"]
  },
  {
    name: "EntityFormPage",
    purpose: "Create/edit layout with validation and submit feedback",
    usedBy: ["admin", "super_admin"]
  },
  {
    name: "ChatDock",
    purpose: "Reusable chat workspace container with conversation list + thread panel",
    usedBy: ["client", "admin", "super_admin"]
  },
  {
    name: "BonusBalanceCard",
    purpose: "Compact balance + trend widget on client home",
    usedBy: ["client"]
  },
  {
    name: "MapCard",
    purpose: "Compact branches map preview and link to fullscreen map",
    usedBy: ["client"]
  },
  {
    name: "GlassCard",
    purpose: "Translucent card container with controlled blur and high-contrast content slots",
    usedBy: ["client", "admin", "super_admin"]
  },
  {
    name: "AppButton",
    purpose: "Unified button variants (primary/secondary/ghost/destructive) with consistent states",
    usedBy: ["client", "admin", "super_admin"]
  },
  {
    name: "DataTable",
    purpose: "Readable admin/super_admin table with density modes and sticky headers",
    usedBy: ["admin", "super_admin"]
  }
];
