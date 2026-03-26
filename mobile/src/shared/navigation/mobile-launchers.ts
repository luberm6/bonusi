import { Alert, Linking, Platform } from "react-native";
import type { NavigatorApp, NavigatorPicker, UrlLauncher } from "./navigation-handoff";

export class ReactNativeUrlLauncher implements UrlLauncher {
  platform: "ios" | "android" | "web" =
    Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "web";

  async canOpenURL(url: string): Promise<boolean> {
    try {
      return await Linking.canOpenURL(url);
    } catch {
      return false;
    }
  }

  async openURL(url: string): Promise<void> {
    await Linking.openURL(url);
  }
}

export class AlertNavigatorPicker implements NavigatorPicker {
  async pick(options: Array<{ app: NavigatorApp; label: string }>): Promise<NavigatorApp | null> {
    if (!options.length) return null;
    return new Promise((resolve) => {
      Alert.alert(
        "Build route",
        "Choose navigation app",
        [
          ...options.map((o) => ({
            text: o.label,
            onPress: () => resolve(o.app)
          })),
          { text: "Cancel", style: "cancel", onPress: () => resolve(null) }
        ],
        { cancelable: true, onDismiss: () => resolve(null) }
      );
    });
  }
}

export class WebPromptNavigatorPicker implements NavigatorPicker {
  async pick(options: Array<{ app: NavigatorApp; label: string }>): Promise<NavigatorApp | null> {
    if (typeof window === "undefined") return null;
    if (!options.length) return null;
    if (options.length === 1) return options[0].app;
    const labels = options.map((o, i) => `${i + 1}. ${o.label}`).join("\n");
    const answer = window.prompt(`Choose navigation app:\n${labels}`, "1");
    if (!answer) return null;
    const idx = Number(answer) - 1;
    return options[idx]?.app ?? null;
  }
}
