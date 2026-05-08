import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { MobileShellBoundary } from "./src/app/shell/mobile-shell-boundary";
import { MobileRootShell } from "./src/app/shell/mobile-root-shell";
import { fonts } from "./src/theme/typography";

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    [fonts.orbitron700]: require("./assets/fonts/Orbitron-Bold.ttf"),
    [fonts.orbitron900]: require("./assets/fonts/Orbitron-Black.ttf"),
    [fonts.rajdhani600]: require("./assets/fonts/Rajdhani-SemiBold.ttf"),
    [fonts.rajdhani700]: require("./assets/fonts/Rajdhani-Bold.ttf"),
    "Montserrat-Regular": require("./assets/fonts/Montserrat-Regular.ttf"),
    "Montserrat-Bold":    require("./assets/fonts/Montserrat-Bold.ttf"),
  });

  // Не блокируем рендер если шрифты не загрузились — падаем на системные
  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <MobileShellBoundary>
        <MobileRootShell key="root-app-shell" />
      </MobileShellBoundary>
    </SafeAreaProvider>
  );
}
