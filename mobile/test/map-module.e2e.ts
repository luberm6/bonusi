import { MutableConnectivity } from "../src/shared/offline/connectivity";
import { MemoryOfflineStore } from "../src/shared/offline/offline-store";
import { MapDataService } from "../src/modules/map/map-data-service";
import { InMemoryTilePackAdapter, MapLibreOfflineTilePackStrategy } from "../src/modules/map/offline-map-strategy";
import { BranchFormViewModel } from "../src/modules/branches/admin/branch-form-view-model";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

class FakeBranchesApi {
  private branchSaved = 0;

  constructor(
    private readonly isOnline: () => boolean,
    private readonly branchesSeed: Array<{
      id: string;
      name: string;
      address: string;
      lat: number;
      lng: number;
      isActive: boolean;
      phone?: string | null;
      description?: string | null;
      workHours?: Record<string, unknown>;
    }>
  ) {}

  async fetchBranches() {
    if (!this.isOnline()) throw new Error("offline");
    return this.branchesSeed;
  }

  async geocodeAddress(address: string) {
    if (!this.isOnline()) throw new Error("offline geocode");
    return {
      normalizedAddress: `${address.trim()} (normalized)`,
      lat: 40.7128,
      lng: -74.006
    };
  }

  async createBranch(payload: Record<string, unknown>) {
    this.branchSaved += 1;
    return {
      id: `created-${this.branchSaved}`,
      ...payload
    };
  }

  async updateBranch(branchId: string, payload: Record<string, unknown>) {
    this.branchSaved += 1;
    return {
      id: branchId,
      ...payload
    };
  }
}

async function run() {
  const connectivity = new MutableConnectivity();
  const store = new MemoryOfflineStore();

  const api = new FakeBranchesApi(
    () => connectivity.isOnline(),
    [
      {
        id: "b1",
        name: "Central",
        address: "Main st 1",
        lat: 59.9343,
        lng: 30.3351,
        isActive: true
      },
      {
        id: "b2",
        name: "Inactive",
        address: "Main st 2",
        lat: 59.9386,
        lng: 30.3141,
        isActive: false
      }
    ]
  );

  const offlineTiles = new MapLibreOfflineTilePackStrategy(new InMemoryTilePackAdapter());
  const mapData = new MapDataService(api as never, store, connectivity, offlineTiles);

  connectivity.setOnline(true);
  const onlineLoad = await mapData.loadBranchesForClient();
  assert(onlineLoad.source === "network", "online source should be network");
  assert(onlineLoad.branches.length === 1, "client map should include only active branch");
  assert((await store.getBranchesCache()).length === 1, "active branches should be cached");
  console.log("map_render_online=ok");

  connectivity.setOnline(false);
  const offlineLoad = await mapData.loadBranchesForClient();
  assert(offlineLoad.source === "cache", "offline source should be cache");
  assert(offlineLoad.branches.length === 1, "offline map should show cached branches");
  console.log("map_render_offline_cache=ok");

  const tilePack = await mapData.ensureOfflineTilesForBranches(onlineLoad.branches);
  assert(tilePack?.status === "ready", "tile pack should be downloaded for branches region");
  const hasCoverage = await offlineTiles.hasCoverage(
    { minLat: 59.9342, minLng: 30.3349, maxLat: 59.9344, maxLng: 30.3353 },
    12
  );
  assert(hasCoverage, "offline tile coverage should be available for branch region");
  console.log("offline_tile_pack_prefetch=ok");

  const formVm = new BranchFormViewModel(api as never);
  let form = formVm.fromBranch();
  form = {
    ...form,
    name: "North",
    address: "Wall street 11",
    phone: "+1555000"
  };

  connectivity.setOnline(true);
  const geocoded = await formVm.geocodeAddress(form.address);
  assert(geocoded.normalizedAddress.includes("normalized"), "geocode normalization expected");
  form = { ...form, address: geocoded.normalizedAddress, lat: geocoded.lat, lng: geocoded.lng };
  console.log("admin_geocode_from_form=ok");

  const afterDrag = formVm.applyManualMarker(form, { lat: 40.7131, lng: -74.0057 });
  assert(afterDrag.lat === 40.7131 && afterDrag.lng === -74.0057, "manual marker drag should override coords");
  console.log("admin_manual_marker_selection=ok");

  const saved = await formVm.save(afterDrag);
  assert(saved.id.startsWith("created-"), "branch save should call create");
  console.log("admin_save_branch_with_coords=ok");

  console.log("offline_map_limitations=tile_eviction_policy_needs_runtime_storage_limits");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
