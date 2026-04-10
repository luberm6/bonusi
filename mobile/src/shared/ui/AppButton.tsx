import React from "react";
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";
import { mobileTokens } from "../design/tokens";
import { fireHaptic, type HapticIntent } from "../native/haptics";

export type AppButtonVariant = "primary" | "secondary" | "ghost" | "destructive";

type Props = {
  label: string;
  onPress: () => void;
  variant?: AppButtonVariant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  haptic?: HapticIntent | null;
};

export function AppButton(props: Props) {
  const variant = props.variant ?? "primary";
  return (
    <Pressable
      onPress={() => {
        if (props.haptic) fireHaptic(props.haptic);
        props.onPress();
      }}
      disabled={props.disabled}
      style={({ pressed }) => [
        styles.base,
        variant === "primary" && styles.primary,
        variant === "secondary" && styles.secondary,
        variant === "ghost" && styles.ghost,
        variant === "destructive" && styles.destructive,
        pressed && !props.disabled && styles.pressed,
        props.disabled && styles.disabled,
        props.style
      ]}
    >
      <Text
        style={[
          styles.label,
          (variant === "primary" || variant === "destructive") && styles.labelPrimary,
          (variant === "secondary" || variant === "ghost") && styles.labelSecondary
        ]}
      >
        {props.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: mobileTokens.spacing[24]
  },
  primary: {
    backgroundColor: mobileTokens.color.secondary,
    shadowColor: mobileTokens.color.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  secondary: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)"
  },
  ghost: {
    backgroundColor: "transparent"
  },
  destructive: {
    backgroundColor: mobileTokens.color.error
  },
  label: {
    fontSize: mobileTokens.typography.body,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1
  },
  labelPrimary: {
    color: "#000000"
  },
  labelSecondary: {
    color: mobileTokens.color.textPrimary
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9
  },
  disabled: {
    opacity: 0.4
  }
});
