import { Platform, Linking } from "react-native";
import { mobileEnv } from "../config/mobile-env";
import { APP_VERSION } from "../config/app-version";

export interface AppUpdateMetadata {
  versionCode: number;
  versionName: string;
  apkUrl?: string; // Android only
  appStoreUrl?: string; // iOS only
  releaseNotes?: string;
}

export interface UpdateCheckResult {
  hasUpdate: boolean;
  metadata?: AppUpdateMetadata;
  channel: typeof mobileEnv.distributionChannel;
}

interface UpdateStrategy {
  check(): Promise<UpdateCheckResult>;
  performUpdate(metadata: AppUpdateMetadata): Promise<void>;
}

class GithubUpdateStrategy implements UpdateStrategy {
  async check(): Promise<UpdateCheckResult> {
    try {
      const response = await fetch(mobileEnv.updateMetadataUrl, {
        headers: { "Cache-Control": "no-cache" }
      });
      if (!response.ok) throw new Error("Update check failed");
      
      const fullMetadata = await response.json();
      const metadata: AppUpdateMetadata = Platform.OS === "android" ? fullMetadata.android : fullMetadata.ios;
      
      // Сравнение по versionCode (самый надежный способ)
      const hasUpdate = metadata.versionCode > APP_VERSION.versionCode;
      
      return {
        hasUpdate,
        metadata,
        channel: "github"
      };
    } catch (error) {
      console.warn("Update check error:", error);
      return { hasUpdate: false, channel: "github" };
    }
  }

  async performUpdate(metadata: AppUpdateMetadata): Promise<void> {
    const url = Platform.OS === "android" ? metadata.apkUrl : metadata.appStoreUrl;
    if (url) {
      await Linking.openURL(url);
    }
  }
}

class PlayStoreUpdateStrategy implements UpdateStrategy {
  async check(): Promise<UpdateCheckResult> {
    // В будущем здесь будет вызов Native Module для Google Play In-App Updates
    // Сейчас возвращаем stub
    return { hasUpdate: false, channel: "play_store" };
  }

  async performUpdate(): Promise<void> {
    // В будущем здесь будет запуск Play Store Install flow
  }
}

class AppStoreUpdateStrategy implements UpdateStrategy {
  async check(): Promise<UpdateCheckResult> {
    // В будущем здесь будет проверка через ITunes Search API или аналоги
    return { hasUpdate: false, channel: "app_store" };
  }

  async performUpdate(metadata: AppUpdateMetadata): Promise<void> {
    if (metadata.appStoreUrl) {
      await Linking.openURL(metadata.appStoreUrl);
    }
  }
}

class UpdateOrchestrator {
  private getStrategy(): UpdateStrategy {
    switch (mobileEnv.distributionChannel) {
      case "play_store": return new PlayStoreUpdateStrategy();
      case "app_store": return new AppStoreUpdateStrategy();
      default: return new GithubUpdateStrategy();
    }
  }

  async checkUpdate(): Promise<UpdateCheckResult> {
    return this.getStrategy().check();
  }

  async performUpdate(metadata: AppUpdateMetadata): Promise<void> {
    return this.getStrategy().performUpdate(metadata);
  }
}

export const updateService = new UpdateOrchestrator();
