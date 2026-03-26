function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === "true";
}

export const mobileFeatures = {
  filesEnabled: parseBoolean(process.env.FILES_ENABLED, false)
};

export function shouldShowChatAttachButton(): boolean {
  return mobileFeatures.filesEnabled;
}
