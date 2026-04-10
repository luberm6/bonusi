export const mobileTokens = {
  color: {
    primary: "#4ADBF1", // Obsidian Neon Cyan
    primaryAlt: "#FFB300", // Gold
    background: "#191A1F", // Deep Obsidian Dark
    textPrimary: "#FFFFFF",
    textSecondary: "#A0A0A0",
    success: "#00E676",
    warning: "#FFAB00",
    error: "#FF3D00",
    borderSoft: "rgba(255, 255, 255, 0.12)",
    glass: "rgba(36, 37, 43, 0.45)",
    glassStrong: "rgba(36, 37, 43, 0.75)",
    overlay: "rgba(0, 0, 0, 0.85)",
    borderEmphasis: "rgba(74, 219, 241, 0.35)",
    rimLight: "rgba(255, 255, 255, 0.25)"
  },
  spacing: {
    4: 4,
    8: 8,
    12: 12,
    16: 16,
    24: 24,
    32: 32
  },
  radius: {
    8: 8,
    12: 12,
    16: 16,
    20: 20,
    card: 16,
    round: 999
  },
  typography: {
    titleLg: 24,
    titleMd: 20,
    titleSm: 17,
    body: 15,
    bodySm: 13,
    caption: 12
  },
  shadow: {
    glass: {
      shadowColor: "#4ADBF1", // Obsidian Cyan glow
      shadowOpacity: 0.45,
      shadowRadius: 32,
      shadowOffset: { width: 0, height: 12 },
      elevation: 16
    },
    neon: {
      shadowColor: "#4ADBF1",
      shadowOpacity: 0.6,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 0 },
      elevation: 20
    },
    gold: {
      shadowColor: "#FFB300",
      shadowOpacity: 0.5,
      shadowRadius: 32,
      shadowOffset: { width: 0, height: 12 },
      elevation: 18
    },
    soft: {
      shadowColor: "#000000",
      shadowOpacity: 0.4,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 12 },
      elevation: 6
    }
  }
} as const;

export const mobileTypography = {
  headingLg: {
    fontSize: mobileTokens.typography.titleLg,
    fontWeight: "700" as const,
    color: mobileTokens.color.textPrimary
  },
  headingMd: {
    fontSize: mobileTokens.typography.titleMd,
    fontWeight: "700" as const,
    color: mobileTokens.color.textPrimary
  },
  headingSm: {
    fontSize: mobileTokens.typography.titleSm,
    fontWeight: "600" as const,
    color: mobileTokens.color.textPrimary
  },
  body: {
    fontSize: mobileTokens.typography.body,
    fontWeight: "500" as const,
    color: mobileTokens.color.textPrimary
  },
  bodySecondary: {
    fontSize: mobileTokens.typography.body,
    color: mobileTokens.color.textSecondary
  },
  caption: {
    fontSize: mobileTokens.typography.caption,
    color: mobileTokens.color.textSecondary
  }
};
