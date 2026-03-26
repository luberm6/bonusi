import type { OfflineStore } from "../../shared/offline/offline-store";
import { createRuntimeOfflineStore } from "../../shared/offline/runtime-offline-store";
import { NetInfoConnectivity } from "../../shared/offline/netinfo-connectivity";
import { ReconnectHandler } from "../../shared/offline/reconnect-handler";
import { HttpOfflineApi } from "../../shared/offline/http-offline-api";
import { OfflineSyncService } from "../../shared/sync/offline-sync-service";
import { mobileEnv } from "../../shared/config/mobile-env";

type ExpoSqliteModule = {
  openDatabaseAsync: (name: string) => Promise<{
    runAsync: (sql: string, params?: unknown[]) => Promise<unknown>;
    getAllAsync: <T = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<T[]>;
  }>;
};

type NetInfoModule = {
  addEventListener: (cb: (state: { isConnected: boolean | null; isInternetReachable: boolean | null }) => void) => () => void;
  fetch: () => Promise<{ isConnected: boolean | null; isInternetReachable: boolean | null }>;
};

export type MobileRuntime = {
  store: OfflineStore;
  sync: OfflineSyncService;
  reconnect: ReconnectHandler;
};

export async function createMobileRuntime(input: {
  currentUserId: string;
  getAccessToken: () => string;
  sqlite: ExpoSqliteModule;
  netInfo: NetInfoModule;
}): Promise<MobileRuntime> {
  const db = await input.sqlite.openDatabaseAsync("autoservice-offline.db");
  const store = await createRuntimeOfflineStore(db);
  const connectivity = new NetInfoConnectivity(input.netInfo);
  const api = new HttpOfflineApi({
    apiBaseUrl: mobileEnv.apiBaseUrl,
    getAccessToken: input.getAccessToken
  });
  const sync = new OfflineSyncService(store, api, connectivity, input.currentUserId);
  const reconnect = new ReconnectHandler(connectivity, sync);
  return { store, sync, reconnect };
}

// Concrete SDK wiring for React Native entrypoint.
// Call this from app bootstrap after auth session restore.
export async function createMobileRuntimeWithExpo(input: {
  currentUserId: string;
  getAccessToken: () => string;
}): Promise<MobileRuntime> {
  const [sqliteModule, netInfoModule] = await Promise.all([import("expo-sqlite"), import("@react-native-community/netinfo")]);
  return createMobileRuntime({
    currentUserId: input.currentUserId,
    getAccessToken: input.getAccessToken,
    sqlite: sqliteModule as unknown as ExpoSqliteModule,
    netInfo: (netInfoModule.default ?? netInfoModule) as unknown as NetInfoModule
  });
}
