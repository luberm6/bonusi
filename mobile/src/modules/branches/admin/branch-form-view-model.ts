import type { BranchMapItem } from "../../../shared/types/map";
import { BranchesApi } from "../../../shared/api/branches-api";

export type BranchFormState = {
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  phone: string;
  description: string;
  isActive: boolean;
};

export class BranchFormViewModel {
  constructor(private readonly api: BranchesApi) {}

  fromBranch(branch?: BranchMapItem): BranchFormState {
    if (!branch) {
      return {
        name: "",
        address: "",
        lat: null,
        lng: null,
        phone: "",
        description: "",
        isActive: true
      };
    }
    return {
      name: branch.name,
      address: branch.address,
      lat: branch.lat,
      lng: branch.lng,
      phone: branch.phone ?? "",
      description: branch.description ?? "",
      isActive: branch.isActive
    };
  }

  async geocodeAddress(address: string): Promise<{ normalizedAddress: string; lat: number; lng: number }> {
    const result = await this.api.geocodeAddress(address);
    return {
      normalizedAddress: result.normalizedAddress,
      lat: result.lat,
      lng: result.lng
    };
  }

  applyManualMarker(state: BranchFormState, coords: { lat: number; lng: number }): BranchFormState {
    return {
      ...state,
      lat: Number(coords.lat.toFixed(6)),
      lng: Number(coords.lng.toFixed(6))
    };
  }

  async save(state: BranchFormState, existing?: BranchMapItem): Promise<BranchMapItem> {
    if (state.lat === null || state.lng === null) {
      throw new Error("Coordinates are required");
    }
    if (!state.name.trim()) throw new Error("Name is required");
    if (!state.address.trim()) throw new Error("Address is required");

    const payload = {
      name: state.name.trim(),
      address: state.address.trim(),
      lat: state.lat,
      lng: state.lng,
      phone: state.phone.trim() || null,
      description: state.description.trim() || null,
      isActive: state.isActive,
      workHours: {}
    };

    if (existing) {
      return this.api.updateBranch(existing.id, payload);
    }
    return this.api.createBranch(payload);
  }
}
