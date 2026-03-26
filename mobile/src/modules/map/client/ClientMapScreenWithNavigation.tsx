import React from "react";
import type { BranchMapItem } from "../../../shared/types/map";
import { AlertNavigatorPicker, ReactNativeUrlLauncher } from "../../../shared/navigation/mobile-launchers";
import { NavigationHandoffService } from "../../../shared/navigation/navigation-handoff";
import type { MapDataService } from "../map-data-service";
import { ClientMapScreen } from "./ClientMapScreen";
import { createBranchRouteHandler } from "./navigation-route-action";

type Props = {
  mapDataService: MapDataService;
  onCallPress: (branch: BranchMapItem) => void;
  onChatPress: (branch: BranchMapItem) => void;
};

export function ClientMapScreenWithNavigation(props: Props) {
  const navService = new NavigationHandoffService(new ReactNativeUrlLauncher(), new AlertNavigatorPicker());
  const routeHandler = createBranchRouteHandler(navService);
  return (
    <ClientMapScreen
      mapDataService={props.mapDataService}
      onRoutePress={routeHandler}
      onCallPress={props.onCallPress}
      onChatPress={props.onChatPress}
    />
  );
}
