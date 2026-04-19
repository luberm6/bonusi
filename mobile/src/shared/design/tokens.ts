export const mobileTokens = {
  color: {
    primary: "#fdfcfe", // Pure Silver
    primaryAlt: "#FFFFFF",
    secondary: "#a2e7ff", // Electric Blue
    background: "#131313", // Obsidian Black
    textPrimary: "#e2e2e2",
    textSecondary: "#c4c7c8",
    success: "#32d74b",
    warning: "#ffd60a",
    error: "#ff453a",
    borderSoft: "rgba(255, 255, 255, 0.05)",
    glass: "rgba(253, 252, 254, 0.05)",
    glassStrong: "rgba(253, 252, 254, 0.12)",
    overlay: "rgba(19, 19, 19, 0.95)",
    borderEmphasis: "rgba(162, 231, 255, 0.2)",
    rimLight: "rgba(255, 255, 255, 0.08)"
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
      shadowColor: "#a2e7ff",
      shadowOpacity: 0.2,
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
    fontWeight: "800" as const,
    color: mobileTokens.color.textPrimary,
    letterSpacing: -0.5
  },
  headingMd: {
    fontSize: mobileTokens.typography.titleMd,
    fontWeight: "700" as const,
    color: mobileTokens.color.textPrimary,
    letterSpacing: -0.3
  },
  headingSm: {
    fontSize: mobileTokens.typography.titleSm,
    fontWeight: "700" as const,
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
    color: mobileTokens.color.textSecondary,
    textTransform: "uppercase" as const,
    letterSpacing: 1
  }
};
