import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { BranchMapItem } from "../../../shared/types/map";
import { mobileTokens, mobileTypography } from "../../../shared/design/tokens";

type Props = {
  branches: BranchMapItem[];
  selectedBranchId?: string;
  onBranchPress?: (branch: BranchMapItem) => void;
  editableMarker?: { lat: number; lng: number };
  onMarkerDragEnd?: (coords: { lat: number; lng: number }) => void;
  compact?: boolean;
};

// NOTE: This is a thin UI wrapper. In real app, replace the placeholders
// with @maplibre/maplibre-react-native MapView + Camera + PointAnnotation.
export function MapLibreMap(props: Props) {
  const { branches, compact, editableMarker } = props;
  return (
    <View style={[styles.container, compact ? styles.compact : styles.full]}>
      <Text style={styles.title}>OSM / MapLibre</Text>
      <Text style={styles.caption}>Branches: {branches.length}</Text>
      {editableMarker ? (
        <Text style={styles.caption}>
          Marker: {editableMarker.lat.toFixed(5)}, {editableMarker.lng.toFixed(5)}
        </Text>
      ) : null}
      <Text style={styles.note}>Replace this wrapper internals with real MapLibre map primitives.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(255,255,255,0.56)",
    borderRadius: mobileTokens.radius[16],
    padding: mobileTokens.spacing[12],
    borderColor: mobileTokens.color.borderSoft,
    borderWidth: 1
  },
  compact: { minHeight: 190 },
  full: { flex: 1, minHeight: 320 },
  title: {
    ...mobileTypography.headingSm
  },
  caption: {
    ...mobileTypography.bodySecondary,
    marginTop: 4
  },
  note: {
    ...mobileTypography.caption,
    marginTop: 10
  }
});
