import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { BranchMapItem } from "../../../shared/types/map";
import { mobileTokens, mobileTypography } from "../../../shared/design/tokens";
import { ru } from "../../../shared/i18n/ru";

type Props = {
  branches: BranchMapItem[];
  selectedBranchId?: string;
  onBranchPress?: (branch: BranchMapItem) => void;
  editableMarker?: { lat: number; lng: number };
  onMarkerDragEnd?: (coords: { lat: number; lng: number }) => void;
  compact?: boolean;
};

export function BranchMapPanel(props: Props) {
  const { branches, compact, editableMarker, onBranchPress, onMarkerDragEnd, selectedBranchId } = props;
  const markers = branches.filter((branch) => Number.isFinite(branch.lat) && Number.isFinite(branch.lng));
  const bounds = getBounds(markers, editableMarker);
  const [stageSize, setStageSize] = useState({ width: 320, height: 220 });

  const plotPoint = (lat: number, lng: number) => {
    const x = ((lng - bounds.minLng) / Math.max(bounds.maxLng - bounds.minLng, 0.000001)) * 100;
    const y = ((bounds.maxLat - lat) / Math.max(bounds.maxLat - bounds.minLat, 0.000001)) * 100;
    return {
      left: `${clamp(x, 6, 94)}%`,
      top: `${clamp(y, 10, 90)}%`
    };
  };

  return (
    <View style={[styles.container, compact ? styles.compact : styles.full]}>
      <Text style={styles.title}>{ru.map.screenTitle}</Text>
      <Text style={styles.caption}>
        {ru.map.mapCount}: {branches.length}
      </Text>
      {editableMarker ? (
        <Text style={styles.caption}>
          {ru.map.markerLabel}: {editableMarker.lat.toFixed(5)}, {editableMarker.lng.toFixed(5)}
        </Text>
      ) : null}
      <Pressable
        disabled={!onMarkerDragEnd}
        style={styles.mapStage}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          if (width > 0 && height > 0) {
            setStageSize({ width, height });
          }
        }}
        onPress={(event) => {
          if (!onMarkerDragEnd) return;
          const { locationX, locationY } = event.nativeEvent;
          const xRatio = clamp(locationX / stageSize.width, 0, 1);
          const yRatio = clamp(locationY / stageSize.height, 0, 1);
          const lat = bounds.maxLat - yRatio * (bounds.maxLat - bounds.minLat);
          const lng = bounds.minLng + xRatio * (bounds.maxLng - bounds.minLng);
          onMarkerDragEnd({
            lat: Number(lat.toFixed(6)),
            lng: Number(lng.toFixed(6))
          });
        }}
      >
        <View style={styles.mapBackdrop} />
        <View style={styles.mapGrid} />
        {markers.map((branch) => {
          const point = plotPoint(branch.lat, branch.lng);
          const active = selectedBranchId === branch.id;
          return (
            <Pressable
              key={branch.id}
              style={[styles.branchMarker, point, active && styles.branchMarkerActive]}
              onPress={() => onBranchPress?.(branch)}
              hitSlop={10}
            >
              <View style={styles.branchMarkerDot} />
              <Text style={styles.branchLabel} numberOfLines={1}>
                {branch.name}
              </Text>
            </Pressable>
          );
        })}
        {editableMarker ? (
          <View style={[styles.editMarker, plotPoint(editableMarker.lat, editableMarker.lng)]}>
            <View style={styles.editMarkerPin} />
          </View>
        ) : null}
      </Pressable>
      <Text style={styles.note}>
        {onMarkerDragEnd ? ru.map.mapTapToPlace : ru.map.mapNote}
      </Text>
    </View>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getBounds(branches: BranchMapItem[], editableMarker?: { lat: number; lng: number }) {
  const allPoints = editableMarker
    ? [
        ...branches.map((branch) => ({ lat: branch.lat, lng: branch.lng })),
        { lat: editableMarker.lat, lng: editableMarker.lng }
      ]
    : branches.map((branch) => ({ lat: branch.lat, lng: branch.lng }));

  if (!allPoints.length) {
    return {
      minLat: 59.85,
      maxLat: 60.05,
      minLng: 30.15,
      maxLng: 30.55
    };
  }

  const latitudes = allPoints.map((item) => item.lat);
  const longitudes = allPoints.map((item) => item.lng);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  const latPadding = Math.max((maxLat - minLat) * 0.15, 0.01);
  const lngPadding = Math.max((maxLng - minLng) * 0.15, 0.01);

  return {
    minLat: minLat - latPadding,
    maxLat: maxLat + latPadding,
    minLng: minLng - lngPadding,
    maxLng: maxLng + lngPadding
  };
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
  mapStage: {
    marginTop: 12,
    height: 220,
    borderRadius: mobileTokens.radius[16],
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
    backgroundColor: "rgba(241,245,249,0.92)"
  },
  mapBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(226,232,240,0.55)"
  },
  mapGrid: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.55,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.14)"
  },
  branchMarker: {
    position: "absolute",
    transform: [{ translateX: -10 }, { translateY: -10 }],
    alignItems: "center",
    maxWidth: 96
  },
  branchMarkerActive: {
    zIndex: 2
  },
  branchMarkerDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(37,99,235,0.92)",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.96)",
    shadowColor: "#0F172A",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 }
  },
  branchLabel: {
    ...mobileTypography.caption,
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.88)",
    color: mobileTokens.color.text,
    overflow: "hidden"
  },
  editMarker: {
    position: "absolute",
    transform: [{ translateX: -11 }, { translateY: -24 }],
    zIndex: 3
  },
  editMarkerPin: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(239,68,68,0.95)",
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.96)"
  },
  note: {
    ...mobileTypography.caption,
    marginTop: 10
  }
});
