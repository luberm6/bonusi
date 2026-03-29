import type { AuthSession } from "../navigation/role-navigation-resolver";

declare global {
  // Optional runtime bridge for integrating real secure storage later.
  // eslint-disable-next-line no-var
  var __AUTOSERVICE_AUTH_SESSION__: AuthSession | undefined;
  // eslint-disable-next-line no-var
  var __AUTOSERVICE_ACCESS_TOKEN__: string | undefined;
}

export async function restoreSessionFromBridge(): Promise<AuthSession | null> {
  return globalThis.__AUTOSERVICE_AUTH_SESSION__ ?? null;
}

export function readAccessTokenFromBridge(): string {
  return globalThis.__AUTOSERVICE_ACCESS_TOKEN__ ?? globalThis.__AUTOSERVICE_AUTH_SESSION__?.token ?? "";
}

export function writeSessionToBridge(session: AuthSession | null, accessToken?: string) {
  globalThis.__AUTOSERVICE_AUTH_SESSION__ = session ?? undefined;
  globalThis.__AUTOSERVICE_ACCESS_TOKEN__ = accessToken ?? session?.token ?? undefined;
}

export function clearSessionBridge() {
  globalThis.__AUTOSERVICE_AUTH_SESSION__ = undefined;
  globalThis.__AUTOSERVICE_ACCESS_TOKEN__ = undefined;
}
