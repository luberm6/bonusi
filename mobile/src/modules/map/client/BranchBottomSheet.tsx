import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { BranchMapItem } from "../../../shared/types/map";
import { mobileTokens, mobileTypography } from "../../../shared/design/tokens";
import { GlassCard } from "../../../shared/ui/GlassCard";
import { AppButton } from "../../../shared/ui/AppButton";

type Props = {
  branch: BranchMapItem | null;
  onRoutePress: (branch: BranchMapItem) => void;
  onCallPress: (branch: BranchMapItem) => void;
  onChatPress: (branch: BranchMapItem) => void;
};

export function BranchBottomSheet(props: Props) {
  const { branch } = props;
  if (!branch) return null;
  return (
    <GlassCard style={styles.sheet} elevated animated>
      <View style={styles.handle} />
      <Text style={styles.title}>{branch.name}</Text>
      <Text style={styles.address}>{branch.address}</Text>
      {branch.phone ? <Text style={styles.meta}>Phone: {branch.phone}</Text> : null}
      {branch.description ? <Text style={styles.meta}>{branch.description}</Text> : null}
      <View style={styles.actions}>
        <AppButton label="Route" onPress={() => props.onRoutePress(branch)} style={styles.actionButton} />
        <AppButton label="Call" variant="secondary" onPress={() => props.onCallPress(branch)} style={styles.actionButton} />
        <AppButton label="Write" variant="secondary" onPress={() => props.onChatPress(branch)} style={styles.actionButton} />
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  sheet: {
    marginTop: 8,
    borderTopLeftRadius: mobileTokens.radius[20],
    borderTopRightRadius: mobileTokens.radius[20],
    padding: mobileTokens.spacing[16]
  },
  handle: {
    alignSelf: "center",
    width: 44,
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(71,85,105,0.35)",
    marginBottom: 12
  },
  title: {
    ...mobileTypography.headingSm,
    marginBottom: 4
  },
  address: {
    ...mobileTypography.bodySecondary,
    marginBottom: 8
  },
  meta: {
    ...mobileTypography.caption,
    marginBottom: 4
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12
  },
  actionButton: {
    flex: 1
  }
});
