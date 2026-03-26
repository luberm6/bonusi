import { WEB_KEY_SCREEN_EXAMPLES } from "../src/design/key-screens";
import { buildRoleAwareLayoutModel } from "../src/layouts/role-aware-layout-contract";
import { getDefaultPostLoginRoute, getRoutesForRole, hasRouteAccess } from "../src/navigation/web-routes";
import { webComponents } from "../src/design/components";
import { webTokens } from "../src/design/tokens";
import { shouldShowChatAttachButton } from "../src/shared/config/features";
import { REUSABLE_COMPONENTS_PLAN } from "../src/shared/ui/reusable-components-plan";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function routeKeys(role: "client" | "admin" | "super_admin"): string[] {
  return getRoutesForRole(role).map((r) => r.key);
}

async function run() {
  const clientKeys = routeKeys("client");
  assert(clientKeys.includes("client_home"), "client should have home");
  assert(clientKeys.includes("client_chat"), "client should have chat");
  assert(!clientKeys.includes("admin_dashboard"), "client must not have admin dashboard");
  assert(!hasRouteAccess("client", "super_audit"), "client must not access audit");
  assert(getDefaultPostLoginRoute("client") === "/home", "client default route mismatch");
  console.log("client_navigation=ok");

  const adminKeys = routeKeys("admin");
  assert(adminKeys.includes("admin_dashboard"), "admin should have dashboard");
  assert(adminKeys.includes("admin_clients"), "admin should have clients");
  assert(!adminKeys.includes("super_audit"), "admin must not have super audit");
  assert(getDefaultPostLoginRoute("admin") === "/admin/dashboard", "admin default route mismatch");
  console.log("admin_navigation=ok");

  const superKeys = routeKeys("super_admin");
  assert(superKeys.includes("admin_dashboard"), "super should inherit admin dashboard");
  assert(superKeys.includes("super_users"), "super should have users");
  assert(superKeys.includes("super_security"), "super should have security");
  console.log("super_admin_navigation=ok");

  const clientLayout = buildRoleAwareLayoutModel("client");
  assert(clientLayout.hideAdminBlocksFromClient, "client layout should hide admin blocks");
  const adminLayout = buildRoleAwareLayoutModel("admin");
  assert(!adminLayout.hideAdminBlocksFromClient, "admin layout should show admin blocks");
  console.log("role_hidden_sections=ok");

  assert(REUSABLE_COMPONENTS_PLAN.length >= 6, "reusable components plan should be populated");
  console.log("reusable_ui_plan=ok");

  assert(shouldShowChatAttachButton() === false, "attach button must be hidden when files are disabled");
  console.log("chat_attach_hidden_when_disabled=ok");

  assert(WEB_KEY_SCREEN_EXAMPLES.length >= 3, "web key screen examples should include all roles");
  assert(WEB_KEY_SCREEN_EXAMPLES.some((s) => s.role === "client"), "client key screen missing");
  assert(WEB_KEY_SCREEN_EXAMPLES.some((s) => s.role === "admin"), "admin key screen missing");
  assert(WEB_KEY_SCREEN_EXAMPLES.some((s) => s.role === "super_admin"), "super_admin key screen missing");
  console.log("web_key_screen_examples=ok");

  assert(typeof webComponents.glassCard.backdropFilter === "string", "glass card blur style must exist");
  assert(webTokens.color.textPrimary === "#0F172A", "text primary token mismatch");
  console.log("design_tokens_and_components=ok");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
