import type { BranchMapItem } from "../../../shared/types/map";
import { BranchesApi } from "../../../shared/api/branches-api";

export class AdminBranchesViewModel {
  constructor(private readonly api: BranchesApi) {}

  async loadBranches(): Promise<BranchMapItem[]> {
    const rows = await this.api.fetchBranches();
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  }
}
