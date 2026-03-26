# Mobile OSM Map Module (Phase 11)

## Client experience

- Compact map card for home screen (`ClientMapCard`).
- Fullscreen map screen (`ClientMapScreen`).
- Active branch markers from backend branches endpoint.
- Branch detail bottom sheet (`BranchBottomSheet`) with actions:
  - route
  - call
  - write
- Offline fallback: cached branches remain visible when network is down.

## Admin experience

- Branch list screen (`AdminBranchesListScreen`).
- Branch create/edit form (`BranchFormScreen`):
  - address input
  - "Find on map" (backend geocode endpoint)
  - marker preview
  - manual coordinate correction (drag marker callback path)

## Data / integration

- Backend integration via `BranchesApi`:
  - `/branches`
  - `/branches/:id`
  - `/geocode`
- Map data service (`MapDataService`) merges online source with cache fallback.

## Offline map strategy

- Implemented now:
  - offline branches from local cache
- Prepared architecture:
  - `OfflineMapStrategy` abstraction for future tile prefetch packs
- Current limitation:
  - tile packs are not downloaded yet in this phase
