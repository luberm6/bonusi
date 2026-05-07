import { Platform } from 'react-native';

// Bundled in assets/fonts and embedded by the expo-font config plugin.
export const fonts = {
  orbitron700: 'Orbitron-Bold',
  orbitron900: 'Orbitron-Black',
  rajdhani600: 'Rajdhani-SemiBold',
  rajdhani700: 'Rajdhani-Bold',
} as const;

const monoFallback = Platform.select({ ios: 'Courier New', android: 'monospace', default: undefined });
const condensedFallback = Platform.select({ ios: 'System', android: 'sans-serif-condensed', default: undefined });

export const typography = {
  display:    { fontFamily: fonts.orbitron700 || monoFallback },
  displayXL:  { fontFamily: fonts.orbitron900 || monoFallback },
  ui:         { fontFamily: fonts.rajdhani600 || condensedFallback },
  uiBold:     { fontFamily: fonts.rajdhani700 || condensedFallback },
} as const;
