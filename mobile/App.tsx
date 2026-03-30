import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { MobileRootShell } from "./src/app/shell/mobile-root-shell";

export default function App() {
  return (
    <SafeAreaProvider>
      <MobileRootShell />
    </SafeAreaProvider>
  );
}
