import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ClientHomeScreen } from "../../modules/client/home/ClientHomeScreen";
import type { AuthSession } from "../navigation/role-navigation-resolver";
import { mobileEnv } from "../../shared/config/mobile-env";
import { fireHaptic } from "../../shared/native/haptics";
import { AnonymousView, BootSplash, LoginView, OnboardingView, StaffAccessView } from "./mobile-root-views";
import {
  clearPersistedSession,
  ONBOARDING_KEY,
  persistSession,
  restorePersistedSession
} from "./mobile-root-storage";

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: AuthSession["role"];
    isActive: boolean;
  };
  deviceId?: string | null;
};


export function MobileRootShell() {
  const [booting, setBooting] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [accessToken, setAccessToken] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [onboardingSeen, persisted] = await Promise.all([
          AsyncStorage.getItem(ONBOARDING_KEY),
          restorePersistedSession()
        ]);

        if (persisted) {
          setSession(persisted.session);
          setAccessToken(persisted.accessToken);
          setShowLogin(false);
          setShowOnboarding(false);
          return;
        }

        const seen = onboardingSeen === "true";
        setShowOnboarding(!seen);
        setShowLogin(seen);
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  const finishOnboarding = async () => {
    fireHaptic("notificationSuccess");
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    setShowOnboarding(false);
    setShowLogin(true);
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) return;
    setLoginLoading(true);
    setLoginError(null);
    try {
      const response = await fetch(`${mobileEnv.apiBaseUrl}/auth/login`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
          device: {
            platform: "ios",
            deviceName: "iPhone App",
            appVersion: "1.0.0"
          }
        })
      });

      const text = await response.text();
      const payload = text ? (JSON.parse(text) as LoginResponse & { message?: string; error?: string }) : null;
      if (!response.ok || !payload?.accessToken || !payload.user?.id || !payload.user?.role) {
        throw new Error(payload?.message || payload?.error || "Не удалось выполнить вход");
      }

      const nextSession: AuthSession = {
        userId: payload.user.id,
        role: payload.user.role,
        token: payload.accessToken
      };
      await persistSession(
        {
          session: nextSession,
          accessToken: payload.accessToken
        },
        payload.refreshToken
      );
      fireHaptic("notificationSuccess");
      setSession(nextSession);
      setAccessToken(payload.accessToken);
      setShowLogin(false);
      setPassword("");
    } catch (error) {
      fireHaptic("notificationError");
      setLoginError(error instanceof Error ? error.message : "Не удалось выполнить вход");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await clearPersistedSession();
    fireHaptic("selection");
    setSession(null);
    setAccessToken("");
    setShowLogin(true);
    setEmail("");
    setPassword("");
    setLoginError(null);
  };

  if (booting) {
    return <BootSplash />;
  }

  return (
    <SafeAreaView style={styles.root}>
      {!session ? (
        showOnboarding ? (
          <OnboardingView onDone={finishOnboarding} onSkip={finishOnboarding} />
        ) : showLogin ? (
          <LoginView
            loading={loginLoading}
            error={loginError}
            email={email}
            password={password}
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
            onSubmit={() => void handleLogin()}
          />
        ) : (
          <AnonymousView onOpenLogin={() => setShowLogin(true)} />
        )
      ) : session.role === "client" ? (
        <ClientHomeScreen
          session={session}
          accessToken={accessToken || session.token}
          onLogout={() => void handleLogout()}
        />
      ) : (
        <StaffAccessView session={session} onLogout={() => void handleLogout()} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  }
});
