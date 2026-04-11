import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { MobileShellBoundary } from "./src/app/shell/mobile-shell-boundary";
import { MobileRootShell } from "./src/app/shell/mobile-root-shell";

export default function App() {
  return (
    <SafeAreaProvider>
      <MobileShellBoundary>
        <MobileRootShell key="root-app-shell" />
      </MobileShellBoundary>
    </SafeAreaProvider>
  );
}
