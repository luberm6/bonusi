import React, { useEffect, useState } from "react";
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from "react-native";
import type { AppBootstrapState, MobileAppBootstrap } from "./src/app/bootstrap/mobile-app-bootstrap";
import { startMobileAppShell } from "./src/app/entrypoint/start-mobile-app-shell";
import { readAccessTokenFromBridge, restoreSessionFromBridge } from "./src/app/entrypoint/session-bridge";

function AnonymousView() {
  return (
    <View style={styles.centered}>
      <Text style={styles.title}>Autoservice Mobile</Text>
      <Text style={styles.subtitle}>No active session. Please login to continue.</Text>
    </View>
  );
}

function ReadyView(props: { state: Extract<AppBootstrapState, { phase: "ready" }> }) {
  return (
    <View style={styles.centered}>
      <Text style={styles.title}>Autoservice Mobile</Text>
      <Text style={styles.subtitle}>Role: {props.state.session.role}</Text>
      <Text style={styles.subtitle}>Default route: {props.state.navigation.defaultPath}</Text>
    </View>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<AppBootstrapState>({
    phase: "anonymous",
    session: null,
    navigation: null,
    runtime: null
  });

  useEffect(() => {
    let mounted = true;
    let bootstrap: MobileAppBootstrap | null = null;

    (async () => {
      try {
        bootstrap = await startMobileAppShell({
          restoreSession: restoreSessionFromBridge,
          getAccessToken: readAccessTokenFromBridge,
          onStateChange(next) {
            if (mounted) setState(next);
          }
        });
        if (mounted) setState(bootstrap.getState());
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      bootstrap?.stop();
    };
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.centered}>
          <ActivityIndicator />
          <Text style={styles.subtitle}>Initializing app runtime...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      {state.phase === "ready" ? <ReadyView state={state} /> : <AnonymousView />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F8FAFC"
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8
  },
  subtitle: {
    fontSize: 15,
    color: "#475569",
    textAlign: "center",
    marginBottom: 6
  }
});

