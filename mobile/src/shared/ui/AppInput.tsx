import React from "react";
import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { mobileTokens, mobileTypography } from "../design/tokens";

type Props = TextInputProps & {
  label?: string;
  error?: string | null;
};

export function AppInput(props: Props) {
  const { label, error, style, ...inputProps } = props;
  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        {...inputProps}
        placeholderTextColor="#94A3B8"
        style={[styles.input, error ? styles.inputError : null, style]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: mobileTokens.spacing[8]
  },
  label: {
    ...mobileTypography.body,
    fontWeight: "600"
  },
  input: {
    minHeight: 46,
    borderRadius: mobileTokens.radius[12],
    borderWidth: 1,
    borderColor: mobileTokens.color.borderSoft,
    backgroundColor: mobileTokens.color.glassStrong,
    color: mobileTokens.color.textPrimary,
    paddingHorizontal: mobileTokens.spacing[12],
    paddingVertical: mobileTokens.spacing[8]
  },
  inputError: {
    borderColor: mobileTokens.color.error
  },
  error: {
    color: mobileTokens.color.error,
    fontSize: mobileTokens.typography.caption
  }
});
