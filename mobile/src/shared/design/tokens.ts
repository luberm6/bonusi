export const mobileTokens = {
  color: {
    primary: "#0F766E",
    primaryAlt: "#2563EB",
    background: "#F8FAFC",
    textPrimary: "#0F172A",
    textSecondary: "#475569",
    success: "#16A34A",
    warning: "#F59E0B",
    error: "#DC2626",
    borderSoft: "rgba(15, 23, 42, 0.12)",
    glass: "rgba(255,255,255,0.74)",
    glassStrong: "rgba(255,255,255,0.82)",
    overlay: "rgba(15, 23, 42, 0.24)"
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
    20: 20
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
      shadowColor: "#0f172a",
      shadowOpacity: 0.14,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 8 },
      elevation: 7
    },
    soft: {
      shadowColor: "#0f172a",
      shadowOpacity: 0.08,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3
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
