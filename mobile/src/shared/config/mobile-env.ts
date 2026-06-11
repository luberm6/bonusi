import { Platform } from "react-native";

export const mobileEnv = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_URL || "https://autoservice-backend-atyj.onrender.com/api/v1",
  webAppUrl: "https://autoservice-web.onrender.com",
  distributionChannel: (process.env.EXPO_PUBLIC_DISTRIBUTION_CHANNEL || (Platform.OS === "ios" ? "app_store" : "github")) as "github" | "play_store" | "app_store",
  updateMetadataUrl: "https://raw.githubusercontent.com/luberm6/bonusi/main/mobile/version.json",
  smsLoginEnabled: process.env.EXPO_PUBLIC_SMS_LOGIN_ENABLED !== "false"
};
