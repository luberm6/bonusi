import { InMemoryTilePackAdapter, MapLibreOfflineTilePackStrategy } from "../src/modules/map/offline-map-strategy";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function run() {
  const strategy = new MapLibreOfflineTilePackStrategy(new InMemoryTilePackAdapter());
  const support = strategy.isOfflineTilesSupported();
  assert(support.supported, "offline tile packs should be supported by in-memory adapter");

  const pack = await strategy.ensureRegionPrefetched(
    { minLat: 59.88, minLng: 30.2, maxLat: 60.0, maxLng: 30.5 },
    { minZoom: 10, maxZoom: 15, ttlHours: 24 }
  );
  assert(pack.status === "ready", "tile pack should finish in ready state");
  assert(pack.progress === 1, "tile pack progress should be 100%");
  assert(pack.sizeBytes > 0, "tile pack size estimate should be > 0");
  console.log("tile_pack_download_ready=ok");

  const hasCoverage = await strategy.hasCoverage({ minLat: 59.9, minLng: 30.25, maxLat: 59.95, maxLng: 30.4 }, 12);
  assert(hasCoverage, "coverage should be available for downloaded region");
  console.log("tile_pack_coverage=ok");

  const packs = await strategy.listTilePacks();
  assert(packs.length >= 1, "listTilePacks should include created pack");
  console.log("tile_pack_list=ok");

  await strategy.deleteTilePack(pack.id);
  const packsAfterDelete = await strategy.listTilePacks();
  assert(!packsAfterDelete.some((p) => p.id === pack.id), "deleted pack should be removed");
  console.log("tile_pack_delete=ok");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
