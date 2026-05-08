import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import {
  Montserrat_400Regular,
  Montserrat_700Bold,
} from "@expo-google-fonts/montserrat";
import { MobileShellBoundary } from "./src/app/shell/mobile-shell-boundary";
import { MobileRootShell } from "./src/app/shell/mobile-root-shell";
import { fonts } from "./src/theme/typography";

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    [fonts.orbitron700]: require("./assets/fonts/Orbitron-Bold.ttf"),
    [fonts.orbitron900]: require("./assets/fonts/Orbitron-Black.ttf"),
    [fonts.rajdhani600]: require("./assets/fonts/Rajdhani-SemiBold.ttf"),
    [fonts.rajdhani700]: require("./assets/fonts/Rajdhani-Bold.ttf"),
    // Montserrat из @expo-google-fonts — надёжная загрузка на iOS и Android
    Montserrat_400Regular,
    Montserrat_700Bold,
  });

  // Не блокируем рендер при ошибке — упадём на системный шрифт
  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <MobileShellBoundary>
        <MobileRootShell key="root-app-shell" />
      </MobileShellBoundary>
    </SafeAreaProvider>
  );
}
