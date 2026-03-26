import type { AppRole } from "../shared/types/role";

type ScreenExample = {
  id: string;
  role: AppRole;
  title: string;
  sections: string[];
  notes: string[];
};

export const WEB_KEY_SCREEN_EXAMPLES: ScreenExample[] = [
  {
    id: "client-home",
    role: "client",
    title: "Client Home Glass Dashboard",
    sections: ["Bonus balance glass card", "Compact OSM map card", "Quick actions row", "Recent activity timeline"],
    notes: ["Large tappable actions", "Minimal copy", "High contrast text over translucent surfaces"]
  },
  {
    id: "admin-dashboard",
    role: "admin",
    title: "Admin Operations Workspace",
    sections: ["KPI cards", "Visits table", "Branches status panel", "Split chat workspace"],
    notes: ["Lower decorative blur than client", "Strict grid alignment", "Fast-action controls above fold"]
  },
  {
    id: "super-admin-control",
    role: "super_admin",
    title: "Super Admin Control Center",
    sections: ["Users table", "Audit log table", "Security sessions list", "System alerts"],
    notes: ["Function-first visual hierarchy", "Dense but readable tables", "Minimal decoration"]
  }
];
