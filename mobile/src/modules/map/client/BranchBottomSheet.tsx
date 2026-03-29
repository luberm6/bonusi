import React, { useEffect, useMemo, useRef } from "react";
import { Animated, PanResponder, StyleSheet, Text, View } from "react-native";
import type { BranchMapItem } from "../../../shared/types/map";
import { mobileTokens, mobileTypography } from "../../../shared/design/tokens";
import { ru } from "../../../shared/i18n/ru";
import { GlassCard } from "../../../shared/ui/GlassCard";
import { AppButton } from "../../../shared/ui/AppButton";
import { fireHaptic } from "../../../shared/native/haptics";

type Props = {
  branch: BranchMapItem | null;
  onClose: () => void;
  onRoutePress: (branch: BranchMapItem) => void;
  onCallPress: (branch: BranchMapItem) => void;
  onChatPress: (branch: BranchMapItem) => void;
};

export function BranchBottomSheet(props: Props) {
  const { branch } = props;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    translateY.setValue(0);
  }, [branch, translateY]);

  const closeSheet = () => {
    Animated.timing(translateY, {
      toValue: 220,
      duration: 180,
      useNativeDriver: true
    }).start(() => {
      translateY.setValue(0);
      fireHaptic("selection");
      props.onClose();
    });
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.2 && gestureState.dy > 8,
        onPanResponderMove: (_, gestureState) => {
          translateY.setValue(Math.max(0, gestureState.dy));
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > 110 || gestureState.vy > 0.85) {
            closeSheet();
            return;
          }
          Animated.spring(translateY, {
            toValue: 0,
            damping: 18,
            stiffness: 220,
            mass: 0.9,
            useNativeDriver: true
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateY, {
            toValue: 0,
            damping: 18,
            stiffness: 220,
            mass: 0.9,
            useNativeDriver: true
          }).start();
        }
      }),
    [props, translateY]
  );

  if (!branch) return null;
  return (
    <Animated.View style={{ transform: [{ translateY }] }} {...panResponder.panHandlers}>
      <GlassCard style={styles.sheet} elevated animated>
        <View style={styles.handle} />
        <Text style={styles.title}>{branch.name}</Text>
        <Text style={styles.address}>{branch.address}</Text>
        {branch.phone ? <Text style={styles.meta}>{ru.map.phoneLabel}: {branch.phone}</Text> : null}
        {branch.description ? <Text style={styles.meta}>{branch.description}</Text> : null}
        <View style={styles.actions}>
          <AppButton label={ru.map.route} onPress={() => props.onRoutePress(branch)} style={styles.actionButton} haptic="impactLight" />
          <AppButton
            label={ru.map.call}
            variant="secondary"
            onPress={() => props.onCallPress(branch)}
            style={styles.actionButton}
            haptic="impactLight"
          />
          <AppButton
            label={ru.map.write}
            variant="secondary"
            onPress={() => props.onChatPress(branch)}
            style={styles.actionButton}
            haptic="impactMedium"
          />
        </View>
      </GlassCard>
    </Animated.View>
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
