import { Platform } from "react-native";
import * as ExpoHaptics from "expo-haptics";

export type HapticIntent =
  | "selection"
  | "impactLight"
  | "impactMedium"
  | "impactHeavy"
  | "soft"
  | "notificationSuccess"
  | "notificationWarning"
  | "notificationError";

export function fireHaptic(intent: HapticIntent): void {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return;

  try {
    switch (intent) {
      case "selection":
        void ExpoHaptics.selectionAsync();
        break;
      case "impactLight":
        void ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Light);
        break;
      case "impactMedium":
        void ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Medium);
        break;
      case "impactHeavy":
        void ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Heavy);
        break;
      case "soft":
        void ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Soft);
        break;
      case "notificationSuccess":
        void ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Success);
        break;
      case "notificationWarning":
        void ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Warning);
        break;
      case "notificationError":
        void ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Error);
        break;
    }
  } catch {
    // Haptics should never block the primary user flow.
  }
}
