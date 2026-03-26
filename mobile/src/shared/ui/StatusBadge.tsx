import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { mobileTokens } from "../design/tokens";

type Status = "success" | "warning" | "error";

type Props = {
  status: Status;
  label: string;
};

export function StatusBadge(props: Props) {
  return (
    <View
      style={[
        styles.base,
        props.status === "success" && styles.success,
        props.status === "warning" && styles.warning,
        props.status === "error" && styles.error
      ]}
    >
      <Text style={styles.label}>{props.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  success: {
    backgroundColor: "rgba(22, 163, 74, 0.13)"
  },
  warning: {
    backgroundColor: "rgba(245, 158, 11, 0.16)"
  },
  error: {
    backgroundColor: "rgba(220, 38, 38, 0.12)"
  },
  label: {
    fontWeight: "600",
    fontSize: mobileTokens.typography.caption,
    color: mobileTokens.color.textPrimary
  }
});
