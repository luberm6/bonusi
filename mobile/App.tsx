import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { readAccessTokenFromBridge, restoreSessionFromBridge } from "./src/app/entrypoint/session-bridge";
import type { AuthSession } from "./src/app/navigation/role-navigation-resolver";
import { resolveNavigationAfterLogin } from "./src/app/navigation/role-navigation-resolver";
import { ClientHomeScreen } from "./src/modules/client/home/ClientHomeScreen";

function AnonymousView() {
  return (
    <View style={styles.centered}>
      <Text style={styles.title}>Autoservice Mobile</Text>
      <Text style={styles.subtitle}>Нет активной сессии. Выполните вход, чтобы продолжить.</Text>
    </View>
  );
}

function AdminFallbackView(props: { session: AuthSession }) {
  const navigation = useMemo(() => resolveNavigationAfterLogin(props.session), [props.session]);
  return (
    <View style={styles.centered}>
      <Text style={styles.title}>Autoservice Mobile</Text>
      <Text style={styles.subtitle}>Роль: {props.session.role}</Text>
      <Text style={styles.subtitle}>Базовый маршрут: {navigation.defaultPath}</Text>
    </View>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [accessToken, setAccessToken] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const nextSession = await restoreSessionFromBridge();
        setSession(nextSession);
        setAccessToken(readAccessTokenFromBridge());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.centered}>
          <ActivityIndicator />
          <Text style={styles.subtitle}>Запускаем приложение...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      {!session ? (
        <AnonymousView />
      ) : session.role === "client" ? (
        <ClientHomeScreen session={session} accessToken={accessToken || session.token} />
      ) : (
        <AdminFallbackView session={session} />
      )}
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
