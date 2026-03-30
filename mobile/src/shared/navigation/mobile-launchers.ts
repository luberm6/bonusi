import { Alert, Linking, Platform } from "react-native";
import { ru } from "../i18n/ru";
import { safeOpenExternalUrl } from "../native/open-url";
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
    const opened = await safeOpenExternalUrl(url, {
      failureTitle: ru.navigation.buildRouteTitle,
      failureMessage: "Не удалось открыть навигатор. Попробуйте выбрать другой вариант."
    });
    if (!opened) {
      throw new Error("navigation-launch-failed");
    }
  }
}

export class AlertNavigatorPicker implements NavigatorPicker {
  async pick(options: Array<{ app: NavigatorApp; label: string }>): Promise<NavigatorApp | null> {
    if (!options.length) return null;
    return new Promise((resolve) => {
      Alert.alert(
        ru.navigation.buildRouteTitle,
        ru.navigation.chooseNavigator,
        [
          ...options.map((o) => ({
            text: o.label,
            onPress: () => resolve(o.app)
          })),
          { text: ru.navigation.cancel, style: "cancel", onPress: () => resolve(null) }
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
    const answer = window.prompt(`${ru.navigation.chooseNavigator}:\n${labels}`, "1");
    if (!answer) return null;
    const idx = Number(answer) - 1;
    return options[idx]?.app ?? null;
  }
}
