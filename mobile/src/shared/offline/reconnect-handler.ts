import type { NetInfoConnectivity } from "./netinfo-connectivity";
import type { OfflineSyncService } from "../sync/offline-sync-service";

export class ReconnectHandler {
  constructor(
    private readonly connectivity: NetInfoConnectivity,
    private readonly sync: OfflineSyncService
  ) {}

  async start(): Promise<void> {
    await this.connectivity.initialize();
    this.sync.startReconnectHandler();
    if (this.connectivity.isOnline()) {
      await this.sync.syncAfterReconnect();
    }
  }

  stop(): void {
    this.sync.stopReconnectHandler();
    this.connectivity.dispose();
  }
}
