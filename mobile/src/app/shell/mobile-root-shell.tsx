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
  getRefreshToken,
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

function toLoginErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Не удалось выполнить вход. Попробуйте ещё раз.";
  }
  const message = error.message.trim();
  if (!message) {
    return "Не удалось выполнить вход. Попробуйте ещё раз.";
  }
  if (/invalid password|invalid credentials|unauthorized|401/i.test(message)) {
    return "Неверный email или пароль";
  }
  if (/network|fetch|request failed/i.test(message)) {
    return "Не удалось выполнить вход. Проверьте подключение и попробуйте ещё раз.";
  }
  return "Не удалось выполнить вход. Попробуйте ещё раз.";
}

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
    if (!email.trim() || !password) {
      return;
    }
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
      if (!response.ok || !payload?.accessToken || !payload?.refreshToken || !payload.user?.id || !payload.user?.role) {
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
      setLoginError(toLoginErrorMessage(error));
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

  const refreshAccessToken = async (): Promise<void> => {
    const refreshToken = await getRefreshToken();
    if (!refreshToken || !session) return;
    try {
      const response = await fetch(`${mobileEnv.apiBaseUrl}/auth/refresh`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ refreshToken })
      });
      if (!response.ok) {
        await handleLogout();
        return;
      }
      const data = (await response.json()) as { accessToken: string; refreshToken: string };
      if (!data.accessToken || !data.refreshToken) {
        await handleLogout();
        return;
      }
      await persistSession({ session, accessToken: data.accessToken }, data.refreshToken);
      setAccessToken(data.accessToken);
    } catch {
      // сетевая ошибка — не разлогиниваем, попробуем в следующий раз
    }
  };

  useEffect(() => {
    if (!session || !accessToken) return;

    const decodeExp = (token: string): number | null => {
      try {
        const parts = token.split(".");
        if (parts.length < 2) return null;
        const payload = JSON.parse(atob(parts[1])) as { exp?: unknown };
        return typeof payload.exp === "number" ? payload.exp : null;
      } catch {
        return null;
      }
    };

    const tick = async () => {
      const exp = decodeExp(accessToken);
      if (!exp) return;
      const nowSec = Math.floor(Date.now() / 1000);
      if (exp - nowSec <= 90) {
        await refreshAccessToken();
      }
    };

    void tick();
    const interval = setInterval(() => { void tick(); }, 60_000);
    return () => clearInterval(interval);
  }, [session, accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

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
