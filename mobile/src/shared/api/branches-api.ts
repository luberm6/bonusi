import { mobileEnv } from "../config/mobile-env";
import type { BranchMapItem, GeocodeResult } from "../types/map";

type HttpClient = (url: string, init?: RequestInit) => Promise<Response>;

function toBranch(input: Record<string, unknown>): BranchMapItem {
  return {
    id: String(input.id),
    name: String(input.name),
    address: String(input.address),
    lat: Number(input.lat),
    lng: Number(input.lng),
    phone: (input.phone as string | null | undefined) ?? null,
    description: (input.description as string | null | undefined) ?? null,
    isActive: Boolean(input.isActive),
    workHours: (input.workHours as Record<string, unknown> | undefined) ?? {}
  };
}

export class BranchesApi {
  constructor(
    private readonly getAccessToken: () => string,
    private readonly http: HttpClient = fetch
  ) {}

  private authHeaders(): HeadersInit {
    return {
      authorization: `Bearer ${this.getAccessToken()}`,
      "content-type": "application/json"
    };
  }

  async fetchBranches(): Promise<BranchMapItem[]> {
    const res = await this.http(`${mobileEnv.apiBaseUrl}/branches`, {
      method: "GET",
      headers: this.authHeaders()
    });
    if (!res.ok) throw new Error(`Не удалось загрузить филиалы: ${res.status}`);
    const data = (await res.json()) as Record<string, unknown>[];
    return data.map(toBranch);
  }

  async geocodeAddress(address: string): Promise<GeocodeResult> {
    const res = await this.http(`${mobileEnv.apiBaseUrl}/geocode`, {
      method: "POST",
      headers: this.authHeaders(),
      body: JSON.stringify({ address })
    });
    if (!res.ok) throw new Error(`Не удалось определить координаты: ${res.status}`);
    return (await res.json()) as GeocodeResult;
  }

  async createBranch(input: Omit<BranchMapItem, "id">): Promise<BranchMapItem> {
    const res = await this.http(`${mobileEnv.apiBaseUrl}/branches`, {
      method: "POST",
      headers: this.authHeaders(),
      body: JSON.stringify(input)
    });
    if (!res.ok) throw new Error(`Не удалось создать филиал: ${res.status}`);
    return toBranch((await res.json()) as Record<string, unknown>);
  }

  async updateBranch(branchId: string, patch: Partial<Omit<BranchMapItem, "id">>): Promise<BranchMapItem> {
    const res = await this.http(`${mobileEnv.apiBaseUrl}/branches/${branchId}`, {
      method: "PATCH",
      headers: this.authHeaders(),
      body: JSON.stringify(patch)
    });
    if (!res.ok) throw new Error(`Не удалось обновить филиал: ${res.status}`);
    return toBranch((await res.json()) as Record<string, unknown>);
  }
}
