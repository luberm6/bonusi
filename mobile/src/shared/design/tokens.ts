export const mobileTokens = {
  color: {
    primary: "#00E5FF", // Neon Cyan
    primaryAlt: "#FFB300", // Warm Gold
    background: "#070A0D", // Midnight Dark
    textPrimary: "#F8FAFC", // Bright White
    textSecondary: "#94A3B8", // Soft Muted Gray
    success: "#00E676",
    warning: "#FFAB00",
    error: "#FF3D00",
    borderSoft: "rgba(255, 255, 255, 0.15)",
    glass: "rgba(20, 25, 30, 0.6)",
    glassStrong: "rgba(20, 25, 30, 0.85)",
    overlay: "rgba(0, 0, 0, 0.75)"
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
    24: 24,
    28: 28,
    32: 32,
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
      shadowColor: "#00E5FF", // Cyan glow
      shadowOpacity: 0.25,
      shadowRadius: 32,
      shadowOffset: { width: 0, height: 8 },
      elevation: 12
    },
    neon: {
      shadowColor: "#00E5FF",
      shadowOpacity: 0.4,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 0 },
      elevation: 15
    },
    gold: {
      shadowColor: "#FFB300",
      shadowOpacity: 0.3,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 8 },
      elevation: 10
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
