import React from "react";
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";
import { mobileTokens } from "../design/tokens";

export type AppButtonVariant = "primary" | "secondary" | "ghost" | "destructive";

type Props = {
  label: string;
  onPress: () => void;
  variant?: AppButtonVariant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function AppButton(props: Props) {
  const variant = props.variant ?? "primary";
  return (
    <Pressable
      onPress={props.onPress}
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
          (variant === "primary" || variant === "destructive") && styles.labelLight,
          (variant === "secondary" || variant === "ghost") && styles.labelDark
        ]}
      >
        {props.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 46,
    borderRadius: mobileTokens.radius[12],
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: mobileTokens.spacing[16]
  },
  primary: {
    backgroundColor: mobileTokens.color.primary
  },
  secondary: {
    backgroundColor: mobileTokens.color.glassStrong,
    borderWidth: 1,
    borderColor: mobileTokens.color.borderSoft
  },
  ghost: {
    backgroundColor: "transparent"
  },
  destructive: {
    backgroundColor: mobileTokens.color.error
  },
  label: {
    fontSize: mobileTokens.typography.body,
    fontWeight: "700"
  },
  labelLight: {
    color: "#ffffff"
  },
  labelDark: {
    color: mobileTokens.color.textPrimary
  },
  pressed: {
    transform: [{ scale: 0.972 }],
    opacity: 0.96
  },
  disabled: {
    opacity: 0.45
  }
});
