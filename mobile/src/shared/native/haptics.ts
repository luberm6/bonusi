import { Platform } from "react-native";
import { trigger } from "react-native-haptic-feedback";

export type HapticIntent =
  | "selection"
  | "impactLight"
  | "impactMedium"
  | "impactHeavy"
  | "soft"
  | "notificationSuccess"
  | "notificationWarning"
  | "notificationError";

const options = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false
} as const;

export function fireHaptic(intent: HapticIntent): void {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return;
  trigger(intent, options);
}

