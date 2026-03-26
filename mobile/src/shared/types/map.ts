export type BranchMapItem = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone?: string | null;
  description?: string | null;
  isActive: boolean;
  workHours?: Record<string, unknown>;
};

export type GeocodeResult = {
  normalizedAddress: string;
  lat: number;
  lng: number;
  source: string;
  cached: boolean;
  stale?: boolean;
};
