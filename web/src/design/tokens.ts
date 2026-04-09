export const webTokens = {
  color: {
    primary: "#00E5FF",
    primaryAlt: "#FFB300",
    background: "#070A0D",
    surface: "rgba(20,25,30,0.6)",
    surfaceStrong: "rgba(20,25,30,0.85)",
    border: "rgba(255,255,255,0.15)",
    textPrimary: "#F8FAFC",
    textSecondary: "#94A3B8",
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
    surface: "rgba(20,25,30,0.6)"
  }
} as const;

export const webMotion = {
  fast: "160ms ease",
  normal: "240ms ease"
};
