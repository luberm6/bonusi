import type { Connectivity } from "./connectivity";

type NetInfoModule = {
  addEventListener: (cb: (state: { isConnected: boolean | null; isInternetReachable: boolean | null }) => void) => () => void;
  fetch: () => Promise<{ isConnected: boolean | null; isInternetReachable: boolean | null }>;
};

export class NetInfoConnectivity implements Connectivity {
  private online = false;
  private listeners = new Set<(online: boolean) => void>();
  private unsubscribe: (() => void) | null = null;

  constructor(private readonly netInfo: NetInfoModule) {}

  async initialize(): Promise<void> {
    const snapshot = await this.netInfo.fetch();
    this.online = Boolean(snapshot.isConnected && snapshot.isInternetReachable !== false);
    this.unsubscribe = this.netInfo.addEventListener((state) => {
      const next = Boolean(state.isConnected && state.isInternetReachable !== false);
      if (next === this.online) return;
      this.online = next;
      for (const listener of this.listeners) listener(next);
    });
  }

  dispose() {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  isOnline(): boolean {
    return this.online;
  }

  subscribe(listener: (online: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
