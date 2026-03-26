import type { Connectivity } from "../../shared/offline/connectivity";
import type { OfflineStore } from "../../shared/offline/offline-store";
import type { BranchMapItem } from "../../shared/types/map";
import { BranchesApi } from "../../shared/api/branches-api";
import type { OfflineMapStrategy, TilePackRecord } from "./offline-map-strategy";

function nowIso() {
  return new Date().toISOString();
}

export class MapDataService {
  constructor(
    private readonly api: BranchesApi,
    private readonly store: OfflineStore,
    private readonly connectivity: Connectivity,
    private readonly offlineTiles?: OfflineMapStrategy
  ) {}

  async loadBranchesForClient(): Promise<{ branches: BranchMapItem[]; source: "network" | "cache" }> {
    if (this.connectivity.isOnline()) {
      try {
        const remote = await this.api.fetchBranches();
        const active = remote.filter((b) => b.isActive);
        await this.store.replaceBranchesCache(
          active.map((b) => ({
            branchId: b.id,
            payload: b,
            cachedAt: nowIso()
          }))
        );
        return { branches: active, source: "network" };
      } catch {
        // fallback to local cache
      }
    }

    const cached = await this.store.getBranchesCache();
    const branches = cached
      .map((c) => c.payload as BranchMapItem)
      .filter((b) => b.isActive)
      .sort((a, b) => a.name.localeCompare(b.name));
    return { branches, source: "cache" };
  }

  async ensureOfflineTilesForBranches(
    branches: BranchMapItem[],
    options?: { minZoom?: number; maxZoom?: number; ttlHours?: number }
  ): Promise<TilePackRecord | null> {
    if (!this.offlineTiles || !branches.length) return null;
    const support = this.offlineTiles.isOfflineTilesSupported();
    if (!support.supported) return null;
    const lats = branches.map((b) => b.lat);
    const lngs = branches.map((b) => b.lng);
    const pad = 0.02;
    const bounds = {
      minLat: Math.min(...lats) - pad,
      maxLat: Math.max(...lats) + pad,
      minLng: Math.min(...lngs) - pad,
      maxLng: Math.max(...lngs) + pad
    };
    return this.offlineTiles.ensureRegionPrefetched(bounds, options);
  }
}
