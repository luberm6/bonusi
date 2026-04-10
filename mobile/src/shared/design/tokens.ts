export const mobileTokens = {
  color: {
    primary: "#fdfcfe", // Pure Silver/White
    primaryAlt: "#FFFFFF",
    background: "#000000", // Pure Obsidian
    textPrimary: "#FFFFFF",
    textSecondary: "#8e8e93",
    success: "#32d74b",
    warning: "#ffd60a",
    error: "#ff453a",
    borderSoft: "rgba(255, 255, 255, 0.05)",
    glass: "rgba(0, 0, 0, 0.7)",
    glassStrong: "rgba(0, 0, 0, 0.9)",
    overlay: "rgba(0, 0, 0, 0.95)",
    borderEmphasis: "rgba(255, 255, 255, 0.15)",
    rimLight: "rgba(255, 255, 255, 0.1)"
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
    8: 4,
    12: 8,
    16: 12,
    20: 16,
    card: 16,
    round: 999
  },
  typography: {
    titleLg: 32,
    titleMd: 24,
    titleSm: 18,
    body: 16,
    bodySm: 14,
    caption: 11
  },
  shadow: {
    glass: {
      shadowColor: "#000000",
      shadowOpacity: 0.6,
      shadowRadius: 40,
      shadowOffset: { width: 0, height: 20 },
      elevation: 16
    },
    neon: {
      shadowColor: "#FFFFFF",
      shadowOpacity: 0.1,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 0 },
      elevation: 20
    },
    gold: {
      shadowColor: "#FFFFFF",
      shadowOpacity: 0.2,
      shadowRadius: 30,
      shadowOffset: { width: 0, height: 10 },
      elevation: 18
    },
    soft: {
      shadowColor: "#000000",
      shadowOpacity: 0.8,
      shadowRadius: 30,
      shadowOffset: { width: 0, height: 15 },
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
