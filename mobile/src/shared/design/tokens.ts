export const mobileTokens = {
  color: {
    primary: "#FFFFFF",
    primaryAlt: "#E6E6E6",
    secondary: "#4DF0FF",
    background: "#000000",
    textPrimary: "#FFFFFF",
    textSecondary: "#A3A3A3",
    success: "#32d74b",
    warning: "#ffd60a",
    error: "#FF3333",
    borderSoft: "rgba(255, 255, 255, 0.1)",
    glass: "rgba(255, 255, 255, 0.03)",
    glassStrong: "rgba(255, 255, 255, 0.08)",
    overlay: "rgba(0, 0, 0, 0.85)",
    borderEmphasis: "rgba(77, 240, 255, 0.3)",
    rimLight: "rgba(255, 255, 255, 0.08)",
    accentNeon: "#4DF0FF"
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
    titleLg: 48,
    titleMd: 24,
    titleSm: 18,
    body: 16,
    bodySm: 14,
    caption: 11
  },
  shadow: {
    glass: {
      shadowColor: "#000000",
      shadowOpacity: 0.8,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
      elevation: 5
    },
    neon: {
      shadowColor: "#4DF0FF",
      shadowOpacity: 0.5,
      shadowRadius: 15,
      shadowOffset: { width: 0, height: 0 },
      elevation: 10
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
      shadowOpacity: 0.6,
      shadowRadius: 15,
      shadowOffset: { width: 0, height: 5 },
      elevation: 4
    }
  }
} as const;

export const mobileTypography = {
  headingLg: {
    fontSize: mobileTokens.typography.titleLg,
    fontWeight: "300" as const,
    color: mobileTokens.color.textPrimary,
    letterSpacing: 1
  },
  headingMd: {
    fontSize: mobileTokens.typography.titleMd,
    fontWeight: "300" as const,
    color: mobileTokens.color.textPrimary,
    textTransform: "uppercase" as const,
    letterSpacing: 2
  },
  headingSm: {
    fontSize: mobileTokens.typography.titleSm,
    fontWeight: "300" as const,
    color: mobileTokens.color.textPrimary,
    textTransform: "uppercase" as const,
    letterSpacing: 1.5
  },
  body: {
    fontSize: mobileTokens.typography.body,
    fontWeight: "300" as const,
    color: mobileTokens.color.textPrimary,
    letterSpacing: 0.5
  },
  bodySecondary: {
    fontSize: mobileTokens.typography.body,
    fontWeight: "300" as const,
    color: mobileTokens.color.textSecondary,
    letterSpacing: 0.5
  },
  caption: {
    fontSize: mobileTokens.typography.caption,
    fontWeight: "300" as const,
    color: mobileTokens.color.textSecondary,
    textTransform: "uppercase" as const,
    letterSpacing: 2
  }
};
