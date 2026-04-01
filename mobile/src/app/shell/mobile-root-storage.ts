import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  clearSessionBridge,
  readAccessTokenFromBridge,
  restoreSessionFromBridge,
  writeSessionToBridge
} from "../entrypoint/session-bridge";
import type { AuthSession } from "../navigation/role-navigation-resolver";

const SESSION_KEY = "autoservice:session";
const REFRESH_TOKEN_KEY = "autoservice:refresh_token";

export const ONBOARDING_KEY = "autoservice:onboarding_seen";

export type PersistedSession = {
  session: AuthSession;
  accessToken: string;
};

export async function restorePersistedSession(): Promise<PersistedSession | null> {
  const bridgeSession = await restoreSessionFromBridge();
  const bridgeToken = readAccessTokenFromBridge();
  if (bridgeSession && bridgeToken) {
    return { session: bridgeSession, accessToken: bridgeToken };
  }

  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as PersistedSession;
    if (!parsed?.session?.userId || !parsed?.accessToken) {
      return null;
    }
    writeSessionToBridge(parsed.session, parsed.accessToken);
    return parsed;
  } catch {
    await AsyncStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export async function persistSession(payload: PersistedSession, refreshToken: string) {
  await Promise.all([
    AsyncStorage.setItem(SESSION_KEY, JSON.stringify(payload)),
    AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  ]);
  writeSessionToBridge(payload.session, payload.accessToken);
}

export async function clearPersistedSession() {
  await Promise.all([AsyncStorage.removeItem(SESSION_KEY), AsyncStorage.removeItem(REFRESH_TOKEN_KEY)]);
  clearSessionBridge();
}
