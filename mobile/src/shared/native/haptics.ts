import { Platform } from "react-native";
import * as ReactNativeHapticFeedback from "react-native-haptic-feedback";

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

function resolveTrigger():
  | ((intent: HapticIntent, options: typeof options) => void)
  | null {
  const direct = (ReactNativeHapticFeedback as { trigger?: unknown }).trigger;
  if (typeof direct === "function") {
    return direct as (intent: HapticIntent, options: typeof options) => void;
  }

  const nested = (ReactNativeHapticFeedback as { default?: { trigger?: unknown } }).default?.trigger;
  if (typeof nested === "function") {
    return nested as (intent: HapticIntent, options: typeof options) => void;
  }

  return null;
}

export function fireHaptic(intent: HapticIntent): void {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return;
  const trigger = resolveTrigger();
  if (!trigger) return;
  try {
    trigger(intent, options);
  } catch {
    // Haptics should never block the primary user flow.
  }
}
