function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === "true";
}

export const webFeatures = {
  filesEnabled: parseBoolean(process.env.NEXT_PUBLIC_FILES_ENABLED, false)
};

export function shouldShowChatAttachButton(): boolean {
  return webFeatures.filesEnabled;
}
