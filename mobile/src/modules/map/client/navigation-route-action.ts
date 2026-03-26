import type { BranchMapItem } from "../../../shared/types/map";
import { NavigationHandoffService } from "../../../shared/navigation/navigation-handoff";

export function createBranchRouteHandler(service: NavigationHandoffService) {
  return async (branch: BranchMapItem): Promise<void> => {
    await service.openRoute(branch);
  };
}
