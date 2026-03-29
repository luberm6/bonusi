import { useEffect, useMemo, useState } from "react";
import type { BranchMapItem } from "../../../shared/types/map";
import type { TilePackRecord } from "../offline-map-strategy";
import { MapDataService } from "../map-data-service";

type State = {
  branches: BranchMapItem[];
  selectedBranch: BranchMapItem | null;
  source: "network" | "cache" | "none";
  tilePack: TilePackRecord | null;
  loading: boolean;
  error: string | null;
};

export function useClientMapViewModel(mapDataService: MapDataService) {
  const [state, setState] = useState<State>({
    branches: [],
    selectedBranch: null,
    source: "none",
    tilePack: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    let mounted = true;
    void (async () => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const data = await mapDataService.loadBranchesForClient();
        let tilePack: TilePackRecord | null = null;
        try {
          tilePack = await mapDataService.ensureOfflineTilesForBranches(data.branches);
        } catch {
          // Tile prefetch should never block map rendering.
          tilePack = null;
        }
        if (!mounted) return;
        setState({
          branches: data.branches,
          selectedBranch: data.branches[0] ?? null,
          source: data.source,
          tilePack,
          loading: false,
          error: null
        });
      } catch (error) {
        if (!mounted) return;
        setState((s) => ({
          ...s,
          loading: false,
          error: error instanceof Error ? error.message : "Failed to load branches"
        }));
      }
    })();
    return () => {
      mounted = false;
    };
  }, [mapDataService]);

  const actions = useMemo(
    () => ({
      selectBranch: (branch: BranchMapItem) => setState((s) => ({ ...s, selectedBranch: branch })),
      clearSelectedBranch: () => setState((s) => ({ ...s, selectedBranch: null }))
    }),
    []
  );

  return { state, actions };
}
