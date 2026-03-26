export interface Connectivity {
  isOnline(): boolean;
  subscribe(listener: (online: boolean) => void): () => void;
}

export class MutableConnectivity implements Connectivity {
  private online = true;
  private listeners = new Set<(online: boolean) => void>();

  isOnline(): boolean {
    return this.online;
  }

  setOnline(next: boolean) {
    if (this.online === next) return;
    this.online = next;
    for (const listener of this.listeners) listener(next);
  }

  subscribe(listener: (online: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
