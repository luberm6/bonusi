# Offline Tile Pack (MapLibre)

Implemented:

- `MapLibreOfflineTilePackStrategy` with pack lifecycle APIs:
  - support check
  - prefetch region
  - list packs
  - delete pack
  - coverage check
- `InMemoryTilePackAdapter` for deterministic e2e/smoke flow.
- `MapDataService.ensureOfflineTilesForBranches(...)` integration to prefetch branch region.

Files:

- `mobile/src/modules/map/offline-map-strategy.ts`
- `mobile/src/modules/map/map-data-service.ts`
- `mobile/test/offline-tiles.e2e.ts`
- `mobile/test/map-module.e2e.ts`

## Runtime integration path

To use real MapLibre offline packs in app runtime:

1. Implement `TilePackAdapter` against `@maplibre/maplibre-react-native` offline manager APIs.
2. Construct:
   - `new MapLibreOfflineTilePackStrategy(realAdapter)`
   - pass it into `new MapDataService(api, store, connectivity, strategy)`
3. Trigger prefetch from map/home flow (already supported via `ensureOfflineTilesForBranches`).

## Current guarantees

- Offline pack abstraction is production-structured and test-covered.
- Branch region prefetch can be invoked now.
- Coverage checks are available for deciding whether full-screen map can rely on offline tiles.
