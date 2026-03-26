import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { BranchMapItem } from "../../../shared/types/map";
import { mobileTokens, mobileTypography } from "../../../shared/design/tokens";
import { GlassCard } from "../../../shared/ui/GlassCard";
import { AppButton } from "../../../shared/ui/AppButton";
import { MapLibreMap } from "../ui/MapLibreMap";

type Props = {
  branches: BranchMapItem[];
  onOpenFullMap: () => void;
  onSelectBranch: (branch: BranchMapItem) => void;
};

export function ClientMapCard(props: Props) {
  return (
    <GlassCard style={styles.card} elevated animated>
      <View style={styles.header}>
        <Text style={styles.title}>Service Branches</Text>
        <AppButton label="Open map" variant="ghost" onPress={props.onOpenFullMap} style={styles.headerAction} />
      </View>
      <MapLibreMap compact branches={props.branches} onBranchPress={props.onSelectBranch} />
      <Pressable onPress={props.onOpenFullMap} hitSlop={8}>
        <Text style={styles.hint}>Tap marker to open branch details</Text>
      </Pressable>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: mobileTokens.spacing[12],
    gap: mobileTokens.spacing[8]
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  headerAction: {
    minHeight: 36,
    paddingHorizontal: 10
  },
  title: {
    ...mobileTypography.headingSm
  },
  hint: {
    ...mobileTypography.caption,
    color: "#64748B"
  }
});
