import { Alert, Linking } from "react-native";

type OpenUrlOptions = {
  failureTitle?: string;
  failureMessage?: string;
};

export async function safeOpenExternalUrl(url: string, options?: OpenUrlOptions): Promise<boolean> {
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert(
        options?.failureTitle ?? "Не удалось открыть ссылку",
        options?.failureMessage ?? "Попробуйте ещё раз чуть позже."
      );
      return false;
    }
    await Linking.openURL(url);
    return true;
  } catch {
    Alert.alert(
      options?.failureTitle ?? "Не удалось открыть ссылку",
      options?.failureMessage ?? "Попробуйте ещё раз чуть позже."
    );
    return false;
  }
}
