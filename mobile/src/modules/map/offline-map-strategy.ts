export type OfflineMapAvailability = {
  supported: boolean;
  reason?: string;
};

export type TileRegionBounds = {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
};

export type TilePackStatus = "ready" | "downloading" | "failed";

export type TilePackRecord = {
  id: string;
  bounds: TileRegionBounds;
  minZoom: number;
  maxZoom: number;
  status: TilePackStatus;
  progress: number;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string | null;
  error?: string | null;
};

export type EnsureRegionOptions = {
  minZoom?: number;
  maxZoom?: number;
  ttlHours?: number;
};

export interface OfflineMapStrategy {
  isOfflineTilesSupported(): OfflineMapAvailability;
  ensureRegionPrefetched(bounds: TileRegionBounds, options?: EnsureRegionOptions): Promise<TilePackRecord>;
  listTilePacks(): Promise<TilePackRecord[]>;
  deleteTilePack(packId: string): Promise<void>;
  hasCoverage(bounds: TileRegionBounds, zoom?: number): Promise<boolean>;
}

type CreateTilePackInput = {
  bounds: TileRegionBounds;
  minZoom: number;
  maxZoom: number;
  expiresAt?: string | null;
};

export interface TilePackAdapter {
  isSupported(): OfflineMapAvailability;
  createOrUpdatePack(input: CreateTilePackInput, onProgress?: (progress: number) => void): Promise<TilePackRecord>;
  listPacks(): Promise<TilePackRecord[]>;
  deletePack(packId: string): Promise<void>;
}

function nowIso(): string {
  return new Date().toISOString();
}

function clampProgress(progress: number): number {
  if (!Number.isFinite(progress)) return 0;
  return Math.max(0, Math.min(1, progress));
}

function normalizeBounds(bounds: TileRegionBounds): TileRegionBounds {
  const minLat = Math.min(bounds.minLat, bounds.maxLat);
  const maxLat = Math.max(bounds.minLat, bounds.maxLat);
  const minLng = Math.min(bounds.minLng, bounds.maxLng);
  const maxLng = Math.max(bounds.minLng, bounds.maxLng);
  return { minLat, minLng, maxLat, maxLng };
}

function boundsContains(outer: TileRegionBounds, inner: TileRegionBounds): boolean {
  return (
    outer.minLat <= inner.minLat &&
    outer.maxLat >= inner.maxLat &&
    outer.minLng <= inner.minLng &&
    outer.maxLng >= inner.maxLng
  );
}

function estimatePackSizeBytes(bounds: TileRegionBounds, minZoom: number, maxZoom: number): number {
  const latSpan = Math.max(0.01, bounds.maxLat - bounds.minLat);
  const lngSpan = Math.max(0.01, bounds.maxLng - bounds.minLng);
  const areaFactor = latSpan * lngSpan;
  const zoomFactor = Math.max(1, maxZoom - minZoom + 1);
  return Math.round(areaFactor * zoomFactor * 9_500_000);
}

export class InMemoryTilePackAdapter implements TilePackAdapter {
  private packs = new Map<string, TilePackRecord>();

  isSupported(): OfflineMapAvailability {
    return { supported: true };
  }

  async createOrUpdatePack(input: CreateTilePackInput, onProgress?: (progress: number) => void): Promise<TilePackRecord> {
    const normalizedBounds = normalizeBounds(input.bounds);
    const id = `pack:${normalizedBounds.minLat.toFixed(4)}:${normalizedBounds.minLng.toFixed(4)}:${normalizedBounds.maxLat.toFixed(4)}:${normalizedBounds.maxLng.toFixed(4)}:${input.minZoom}:${input.maxZoom}`;
    const existing = this.packs.get(id);
    const base: TilePackRecord = existing ?? {
      id,
      bounds: normalizedBounds,
      minZoom: input.minZoom,
      maxZoom: input.maxZoom,
      status: "downloading",
      progress: 0,
      sizeBytes: estimatePackSizeBytes(normalizedBounds, input.minZoom, input.maxZoom),
      createdAt: nowIso(),
      updatedAt: nowIso(),
      expiresAt: input.expiresAt ?? null,
      error: null
    };
    const downloading: TilePackRecord = { ...base, status: "downloading", progress: 0, updatedAt: nowIso(), error: null };
    this.packs.set(id, downloading);

    const checkpoints = [0.2, 0.45, 0.75, 1];
    for (const p of checkpoints) {
      onProgress?.(clampProgress(p));
    }

    const ready: TilePackRecord = {
      ...downloading,
      status: "ready",
      progress: 1,
      updatedAt: nowIso(),
      expiresAt: input.expiresAt ?? null
    };
    this.packs.set(id, ready);
    return ready;
  }

  async listPacks(): Promise<TilePackRecord[]> {
    return [...this.packs.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async deletePack(packId: string): Promise<void> {
    this.packs.delete(packId);
  }
}

export class MapLibreOfflineTilePackStrategy implements OfflineMapStrategy {
  constructor(private readonly adapter: TilePackAdapter) {}

  isOfflineTilesSupported(): OfflineMapAvailability {
    return this.adapter.isSupported();
  }

  async ensureRegionPrefetched(bounds: TileRegionBounds, options?: EnsureRegionOptions): Promise<TilePackRecord> {
    const support = this.adapter.isSupported();
    if (!support.supported) {
      throw new Error(support.reason ?? "Offline tile packs are not supported");
    }
    const minZoom = options?.minZoom ?? 10;
    const maxZoom = options?.maxZoom ?? 16;
    const ttlHours = options?.ttlHours ?? 24 * 14;
    const expiresAt = ttlHours > 0 ? new Date(Date.now() + ttlHours * 3600 * 1000).toISOString() : null;
    return this.adapter.createOrUpdatePack(
      {
        bounds: normalizeBounds(bounds),
        minZoom,
        maxZoom,
        expiresAt
      },
      () => {
        // Hook for future UI progress updates.
      }
    );
  }

  async listTilePacks(): Promise<TilePackRecord[]> {
    return this.adapter.listPacks();
  }

  async deleteTilePack(packId: string): Promise<void> {
    await this.adapter.deletePack(packId);
  }

  async hasCoverage(bounds: TileRegionBounds, zoom = 12): Promise<boolean> {
    const normalized = normalizeBounds(bounds);
    const now = Date.now();
    const packs = await this.adapter.listPacks();
    return packs.some((pack) => {
      if (pack.status !== "ready") return false;
      if (pack.expiresAt && Date.parse(pack.expiresAt) < now) return false;
      if (zoom < pack.minZoom || zoom > pack.maxZoom) return false;
      return boundsContains(pack.bounds, normalized);
    });
  }
}

// Fallback strategy for environments where offline tile API is unavailable.
export class PlaceholderOfflineMapStrategy implements OfflineMapStrategy {
  isOfflineTilesSupported(): OfflineMapAvailability {
    return {
      supported: false,
      reason: "Offline tile packs are not available in this runtime"
    };
  }

  async ensureRegionPrefetched(_bounds: TileRegionBounds): Promise<TilePackRecord> {
    throw new Error("Offline tile packs are not available in this runtime");
  }

  async listTilePacks(): Promise<TilePackRecord[]> {
    return [];
  }

  async deleteTilePack(_packId: string): Promise<void> {
    return;
  }

  async hasCoverage(_bounds: TileRegionBounds, _zoom?: number): Promise<boolean> {
    return false;
  }
}
