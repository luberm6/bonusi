import { webMotion, webTokens } from "./tokens";

type CssObject = Record<string, string | number>;

export const webComponents = {
  glassCard: {
    background: webTokens.color.surface,
    backdropFilter: webTokens.blur.surface,
    border: `1px solid ${webTokens.color.border}`,
    borderRadius: webTokens.radius[16],
    boxShadow: webTokens.shadow.glass
  } satisfies CssObject,

  buttonPrimary: {
    minHeight: 44,
    padding: `0 ${webTokens.spacing[16]}px`,
    borderRadius: webTokens.radius[12],
    border: "none",
    background: webTokens.color.primary,
    color: "#070A0D",
    fontWeight: 700,
    transition: `transform ${webMotion.fast}, opacity ${webMotion.fast}`
  } satisfies CssObject,

  buttonSecondary: {
    minHeight: 44,
    padding: `0 ${webTokens.spacing[16]}px`,
    borderRadius: webTokens.radius[12],
    border: `1px solid ${webTokens.color.border}`,
    background: webTokens.color.surfaceStrong,
    color: webTokens.color.textPrimary,
    fontWeight: 600
  } satisfies CssObject,

  input: {
    minHeight: 44,
    borderRadius: webTokens.radius[12],
    border: `1px solid ${webTokens.color.border}`,
    background: webTokens.color.surfaceStrong,
    color: webTokens.color.textPrimary,
    padding: `0 ${webTokens.spacing[12]}px`,
    outline: "none"
  } satisfies CssObject,

  table: {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: 0,
    background: webTokens.color.surfaceStrong,
    border: `1px solid ${webTokens.color.border}`,
    borderRadius: webTokens.radius[12],
    overflow: "hidden"
  } satisfies CssObject,

  chatBubbleIncoming: {
    maxWidth: "72%",
    borderRadius: 16,
    border: `1px solid ${webTokens.color.border}`,
    background: webTokens.color.surfaceStrong,
    color: webTokens.color.textPrimary,
    padding: `${webTokens.spacing[8]}px ${webTokens.spacing[12]}px`
  } satisfies CssObject,

  chatBubbleOutgoing: {
    maxWidth: "72%",
    borderRadius: 16,
    background: webTokens.color.primaryAlt,
    color: "#ffffff",
    padding: `${webTokens.spacing[8]}px ${webTokens.spacing[12]}px`
  } satisfies CssObject
};
