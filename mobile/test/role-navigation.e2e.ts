import { buildMobileNavigation } from "../src/app/navigation/mobile-routes";
import { resolveNavigationAfterLogin } from "../src/app/navigation/role-navigation-resolver";
import { mobileTokens } from "../src/shared/design/tokens";
import { shouldShowChatAttachButton } from "../src/shared/config/features";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function run() {
  const clientNav = buildMobileNavigation("client");
  assert(clientNav.tabs.some((i) => i.key === "chat"), "client tabs should include chat");
  assert(clientNav.drawer.length === 0, "client should not have admin drawer");
  assert(clientNav.hiddenSections.includes("admin"), "client should hide admin sections");
  console.log("client_navigation=ok");

  const adminNav = buildMobileNavigation("admin");
  assert(adminNav.tabs.some((i) => i.key === "dashboard"), "admin tabs should include dashboard");
  assert(adminNav.drawer.some((i) => i.key === "clients"), "admin drawer should include clients");
  assert(!adminNav.drawer.some((i) => i.key === "users"), "admin should not have super users screen");
  console.log("admin_navigation=ok");

  const superNav = buildMobileNavigation("super_admin");
  assert(superNav.drawer.some((i) => i.key === "users"), "super drawer should include users");
  assert(superNav.drawer.some((i) => i.key === "audit_logs"), "super drawer should include audit");
  console.log("super_admin_navigation=ok");

  const resolvedClient = resolveNavigationAfterLogin({
    userId: "u1",
    role: "client",
    token: "t"
  });
  assert(resolvedClient.defaultPath === "/home", "client default path mismatch");

  const resolvedAdmin = resolveNavigationAfterLogin({
    userId: "u2",
    role: "admin",
    token: "t"
  });
  assert(resolvedAdmin.defaultPath === "/admin/dashboard", "admin default path mismatch");
  console.log("post_login_resolution=ok");

  assert(shouldShowChatAttachButton() === false, "mobile attach button must be hidden when files are disabled");
  console.log("chat_attach_hidden_when_disabled=ok");

  assert(String(mobileTokens.color.background) === "#131313", "mobile background token mismatch");
  assert(Number(mobileTokens.radius[16]) === 12, "radius token mismatch");
  console.log("mobile_design_tokens=ok");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
