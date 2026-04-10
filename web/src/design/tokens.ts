export const webTokens = {
  color: {
    primary: "#fdfcfe", // Silver/White
    primaryAlt: "#FFFFFF",
    secondary: "#FFFFFF", // Monochrome accents
    background: "#000000", // Pure Obsidian
    surface: "#000000", // Pure Black
    surfaceStrong: "#000000", // Pure Black
    border: "rgba(255,255,255,0.05)", // Ultra-thin ghost border
    textPrimary: "#FFFFFF",
    textSecondary: "#8e8e93", // Muted Silver
    success: "#FFFFFF",
    warning: "#FFFFFF",
    error: "#ff453a"
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
    8: 4, // ROUND_FOUR refined
    12: 8,
    16: 12,
    20: 16
  },
  typography: {
    fontFamily: "'Manrope', 'Inter', -apple-system, sans-serif",
    titleLg: 48, // display-lg impact
    titleMd: 32,
    titleSm: 24,
    body: 16,
    caption: 11 // label-sm
  },
  shadow: {
    glass: "0 20px 40px rgba(0,0,0,0.4), inset 0 0.5px 0 rgba(255,255,255,0.1)",
    soft: "0 10px 30px rgba(0,0,0,0.3)"
  },
  blur: {
    surface: "blur(20px)"
  }
} as const;

export const webMotion = {
  fast: "160ms ease",
  normal: "240ms ease"
};
