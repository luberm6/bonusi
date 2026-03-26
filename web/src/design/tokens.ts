export const webTokens = {
  color: {
    primary: "#0F766E",
    primaryAlt: "#2563EB",
    background: "#F8FAFC",
    surface: "rgba(255,255,255,0.78)",
    surfaceStrong: "rgba(255,255,255,0.86)",
    border: "rgba(15,23,42,0.14)",
    textPrimary: "#0F172A",
    textSecondary: "#475569",
    success: "#16A34A",
    warning: "#F59E0B",
    error: "#DC2626"
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
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    titleLg: 32,
    titleMd: 24,
    titleSm: 18,
    body: 15,
    caption: 12
  },
  shadow: {
    glass: "0 12px 36px rgba(15,23,42,0.16)",
    soft: "0 6px 18px rgba(15,23,42,0.08)"
  },
  blur: {
    surface: "blur(12px)"
  }
} as const;

export const webMotion = {
  fast: "160ms ease",
  normal: "240ms ease"
};
