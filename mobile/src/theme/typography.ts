import { Platform } from 'react-native';

// Custom fonts (bare RN — link manually):
// 1. Download from fonts.google.com: Orbitron (700, 900), Rajdhani (600, 700)
// 2. Place .ttf in android/app/src/main/assets/fonts/
// 3. iOS: add to Xcode project + Info.plist
// File names must match exactly: Orbitron-Bold.ttf, Orbitron-Black.ttf,
//   Rajdhani-SemiBold.ttf, Rajdhani-Bold.ttf
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
