import { webMotion, webTokens } from "./tokens";

type CssObject = Record<string, string | number>;

export const webComponents = {
  glassCard: {
    background: "rgba(27, 27, 27, 0.7)", // surface with opacity
    backdropFilter: webTokens.blur.surface,
    border: `1px solid ${webTokens.color.border}`,
    borderRadius: webTokens.radius[16],
    boxShadow: webTokens.shadow.glass,
    padding: webTokens.spacing[24]
  } satisfies CssObject,

  buttonPrimary: {
    minHeight: 48,
    padding: `0 ${webTokens.spacing[24]}px`,
    borderRadius: webTokens.radius[8],
    border: "none",
    background: `linear-gradient(45deg, ${webTokens.color.secondary}, #00d2fd)`, // Electric Blue gradient
    color: "#002e68", // Dark contrast text
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    cursor: "pointer",
    transition: `transform ${webMotion.fast}, opacity ${webMotion.fast}, filter ${webMotion.fast}`,
    boxShadow: "0 4px 15px rgba(0, 210, 253, 0.3)"
  } satisfies CssObject,

  buttonSecondary: {
    minHeight: 48,
    padding: `0 ${webTokens.spacing[24]}px`,
    borderRadius: webTokens.radius[8],
    border: `1px solid ${webTokens.color.border}`,
    background: "rgba(255, 255, 255, 0.05)",
    backdropFilter: "blur(10px)",
    color: webTokens.color.textPrimary,
    fontWeight: 600,
    cursor: "pointer"
  } satisfies CssObject,

  input: {
    minHeight: 48,
    borderRadius: webTokens.radius[8],
    border: "none",
    borderBottom: `2px solid ${webTokens.color.border}`,
    background: "#1b1b1b",
    color: webTokens.color.textPrimary,
    padding: `0 ${webTokens.spacing[16]}px`,
    outline: "none",
    fontFamily: "'Inter', sans-serif"
  } satisfies CssObject,

  table: {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: 0,
    background: webTokens.color.surfaceStrong,
    borderRadius: webTokens.radius[12],
    overflow: "hidden"
  } satisfies CssObject,

  chatBubbleIncoming: {
    maxWidth: "72%",
    borderRadius: webTokens.radius[16],
    background: webTokens.color.surfaceStrong,
    color: webTokens.color.textPrimary,
    padding: `${webTokens.spacing[12]}px ${webTokens.spacing[16]}px`,
    border: `1px solid ${webTokens.color.border}`
  } satisfies CssObject,

  chatBubbleOutgoing: {
    maxWidth: "72%",
    borderRadius: webTokens.radius[16],
    background: "rgba(162, 231, 255, 0.15)", // Subtle blue glow
    border: `1px solid ${webTokens.color.secondary}33`,
    color: webTokens.color.textPrimary,
    padding: `${webTokens.spacing[12]}px ${webTokens.spacing[16]}px`
  } satisfies CssObject
};
