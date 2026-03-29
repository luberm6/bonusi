import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { mobileTokens, mobileTypography } from "../../../shared/design/tokens";
import { ru } from "../../../shared/i18n/ru";
import { GlassCard } from "../../../shared/ui/GlassCard";
import { StatusBadge } from "../../../shared/ui/StatusBadge";
import { BranchBottomSheet } from "./BranchBottomSheet";
import { MapLibreMap } from "../ui/MapLibreMap";
import { useClientMapViewModel } from "./useClientMapViewModel";
import type { MapDataService } from "../map-data-service";
import type { BranchMapItem } from "../../../shared/types/map";

type Props = {
  mapDataService: MapDataService;
  onRoutePress: (branch: BranchMapItem) => void;
  onCallPress: (branch: BranchMapItem) => void;
  onChatPress: (branch: BranchMapItem) => void;
};

export function ClientMapScreen(props: Props) {
  const vm = useClientMapViewModel(props.mapDataService);

  if (vm.state.loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <MapLibreMap branches={vm.state.branches} onBranchPress={vm.actions.selectBranch} />
      <GlassCard style={styles.metaCard}>
        <StatusBadge
          status={vm.state.source === "network" ? "success" : "warning"}
          label={`${ru.map.sourceLabel}: ${vm.state.source === "network" ? ru.map.sourceNetwork : ru.map.sourceCache}`}
        />
        {vm.state.tilePack ? (
          <StatusBadge
            status={vm.state.tilePack.status === "ready" ? "success" : vm.state.tilePack.status === "failed" ? "error" : "warning"}
            label={`${ru.map.tilesLabel}: ${
              vm.state.tilePack.status === "ready"
                ? ru.map.tilesReady
                : vm.state.tilePack.status === "failed"
                  ? ru.map.tilesFailed
                  : ru.map.tilesLoading
            }`}
          />
        ) : null}
        {vm.state.error ? <Text style={styles.error}>{vm.state.error}</Text> : null}
      </GlassCard>
      <BranchBottomSheet
        branch={vm.state.selectedBranch}
        onClose={vm.actions.clearSelectedBranch}
        onRoutePress={props.onRoutePress}
        onCallPress={props.onCallPress}
        onChatPress={props.onChatPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: mobileTokens.color.background, padding: 12, gap: 8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  metaCard: { padding: 10, gap: 8 },
  error: {
    ...mobileTypography.caption,
    color: mobileTokens.color.error
  }
});
