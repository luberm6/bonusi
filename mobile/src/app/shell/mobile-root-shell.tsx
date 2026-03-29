import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent
} from "react-native";
import { ClientHomeScreen } from "../../modules/client/home/ClientHomeScreen";
import {
  clearSessionBridge,
  readAccessTokenFromBridge,
  restoreSessionFromBridge,
  writeSessionToBridge
} from "../entrypoint/session-bridge";
import type { AuthSession } from "../navigation/role-navigation-resolver";
import { resolveNavigationAfterLogin } from "../navigation/role-navigation-resolver";
import { mobileEnv } from "../../shared/config/mobile-env";
import { mobileTokens, mobileTypography } from "../../shared/design/tokens";
import { fireHaptic } from "../../shared/native/haptics";
import { AppButton } from "../../shared/ui/AppButton";
import { AppInput } from "../../shared/ui/AppInput";
import { GlassCard } from "../../shared/ui/GlassCard";

const ONBOARDING_KEY = "autoservice:onboarding_seen";
const SESSION_KEY = "autoservice:session";
const REFRESH_TOKEN_KEY = "autoservice:refresh_token";

type PersistedSession = {
  session: AuthSession;
  accessToken: string;
};

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

const ONBOARDING_SLIDES = [
  {
    key: "bonuses",
    eyebrow: "Бонусы",
    title: "Управляйте бонусами",
    description: "Следите за накоплениями и используйте их в следующих визитах без лишних звонков.",
    accent: "01"
  },
  {
    key: "visits",
    eyebrow: "История",
    title: "История визитов",
    description: "Все посещения сервиса, суммы и комментарии доступны в одном понятном экране.",
    accent: "02"
  },
  {
    key: "chat",
    eyebrow: "Связь",
    title: "Чат с сервисом",
    description: "Быстрая связь с администратором, статус бонусов и запись всегда под рукой.",
    accent: "03"
  }
] as const;

async function restorePersistedSession(): Promise<PersistedSession | null> {
  const bridgeSession = await restoreSessionFromBridge();
  const bridgeToken = readAccessTokenFromBridge();
  if (bridgeSession && bridgeToken) {
    return { session: bridgeSession, accessToken: bridgeToken };
  }

  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PersistedSession;
    if (!parsed?.session?.userId || !parsed?.accessToken) return null;
    writeSessionToBridge(parsed.session, parsed.accessToken);
    return parsed;
  } catch {
    await AsyncStorage.removeItem(SESSION_KEY);
    return null;
  }
}

async function persistSession(payload: PersistedSession, refreshToken: string) {
  await AsyncStorage.multiSet([
    [SESSION_KEY, JSON.stringify(payload)],
    [REFRESH_TOKEN_KEY, refreshToken]
  ]);
  writeSessionToBridge(payload.session, payload.accessToken);
}

async function clearPersistedSession() {
  await AsyncStorage.multiRemove([SESSION_KEY, REFRESH_TOKEN_KEY]);
  clearSessionBridge();
}

function AnonymousView(props: { onOpenLogin: () => void }) {
  return (
    <View style={styles.centeredShell}>
      <GlassCard elevated animated style={styles.splashCard}>
        <Text style={styles.brandMark}>CRS</Text>
        <Text style={styles.splashTitle}>Цифровой сервис автосервиса</Text>
        <Text style={styles.splashSubtitle}>
          Бонусы, визиты и чат с сервисом в одном аккуратном мобильном приложении.
        </Text>
        <View style={styles.splashActions}>
          <AppButton label="Войти" onPress={props.onOpenLogin} haptic="impactLight" />
        </View>
      </GlassCard>
    </View>
  );
}

function StaffAccessView(props: { session: AuthSession; onLogout: () => void }) {
  const navigation = useMemo(() => resolveNavigationAfterLogin(props.session), [props.session]);
  const openWebWorkspace = async () => {
    fireHaptic("impactLight");
    await Linking.openURL(mobileEnv.webAppUrl);
  };

  return (
    <View style={styles.centeredShell}>
      <GlassCard elevated animated style={styles.splashCard}>
        <Text style={styles.brandMark}>CRS</Text>
        <Text style={styles.splashTitle}>Рабочее пространство команды</Text>
        <Text style={styles.splashSubtitle}>
          Для роли {props.session.role} основной операционный контур доступен в web-кабинете.
        </Text>
        <Text style={styles.splashSubtitle}>Рекомендуемый маршрут: {navigation.defaultPath}</Text>
        <View style={styles.splashActions}>
          <AppButton label="Открыть web-кабинет" onPress={() => void openWebWorkspace()} haptic="impactLight" />
          <AppButton label="Выйти" variant="secondary" onPress={props.onLogout} haptic="selection" />
        </View>
      </GlassCard>
    </View>
  );
}

function OnboardingView(props: { onDone: () => void; onSkip: () => void }) {
  const pageWidth = Dimensions.get("window").width - 36;
  const scrollRef = useRef<ScrollView | null>(null);
  const [index, setIndex] = useState(0);

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
    setIndex(Math.max(0, Math.min(next, ONBOARDING_SLIDES.length - 1)));
  };

  const goNext = () => {
    if (index >= ONBOARDING_SLIDES.length - 1) {
      props.onDone();
      return;
    }
    fireHaptic("selection");
    scrollRef.current?.scrollTo({ x: pageWidth * (index + 1), animated: true });
    setIndex((current) => Math.min(current + 1, ONBOARDING_SLIDES.length - 1));
  };

  return (
    <View style={styles.centeredShell}>
      <View style={styles.onboardingTopBar}>
        <Text style={styles.onboardingTopText}>Добро пожаловать</Text>
        <Pressable
          onPress={props.onSkip}
          style={({ pressed }) => [styles.skipButton, pressed && styles.pressedTopLink]}
        >
          <Text style={styles.skipButtonLabel}>Пропустить</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onMomentumScrollEnd={handleScrollEnd}
        contentContainerStyle={styles.onboardingSlides}
      >
        {ONBOARDING_SLIDES.map((slide) => (
          <View key={slide.key} style={[styles.onboardingPage, { width: pageWidth }]}>
            <GlassCard elevated animated style={styles.onboardingCard}>
              <View style={styles.onboardingHero}>
                <View style={styles.onboardingGlow} />
                <View style={styles.onboardingBadge}>
                  <Text style={styles.onboardingBadgeText}>{slide.accent}</Text>
                </View>
              </View>
              <Text style={styles.onboardingEyebrow}>{slide.eyebrow}</Text>
              <Text style={styles.onboardingTitle}>{slide.title}</Text>
              <Text style={styles.onboardingDescription}>{slide.description}</Text>
            </GlassCard>
          </View>
        ))}
      </ScrollView>

      <View style={styles.pagination}>
        {ONBOARDING_SLIDES.map((slide, slideIndex) => (
          <View
            key={slide.key}
            style={[styles.paginationDot, slideIndex === index && styles.paginationDotActive]}
          />
        ))}
      </View>

      <View style={styles.onboardingActions}>
        <AppButton
          label={index === ONBOARDING_SLIDES.length - 1 ? "Войти" : "Далее"}
          onPress={goNext}
          haptic="impactLight"
        />
      </View>
    </View>
  );
}

function LoginView(props: {
  loading: boolean;
  error: string | null;
  email: string;
  password: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <View style={styles.centeredShell}>
      <GlassCard elevated animated style={styles.loginCard}>
        <Text style={styles.brandMark}>CRS</Text>
        <Text style={styles.loginTitle}>Вход в приложение</Text>
        <Text style={styles.loginSubtitle}>
          Используйте рабочую учетную запись, чтобы открыть бонусы, визиты и чат.
        </Text>

        <View style={styles.loginForm}>
          <AppInput
            label="Электронная почта"
            value={props.email}
            onChangeText={props.onEmailChange}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="client@example.com"
          />
          <AppInput
            label="Пароль"
            value={props.password}
            onChangeText={props.onPasswordChange}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Введите пароль"
            error={props.error}
          />
          <AppButton
            label={props.loading ? "Входим..." : "Войти"}
            onPress={props.onSubmit}
            disabled={props.loading || !props.email.trim() || !props.password}
            haptic="impactLight"
          />
        </View>
      </GlassCard>
    </View>
  );
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
    flex: 1,
    backgroundColor: mobileTokens.color.background
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24
  },
  centeredShell: {
    flex: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
    justifyContent: "center",
    backgroundColor: "#E9EDF5"
  },
  splashCard: {
    padding: mobileTokens.spacing[24],
    gap: mobileTokens.spacing[16]
  },
  brandMark: {
    fontSize: 40,
    lineHeight: 42,
    letterSpacing: 1.2,
    fontWeight: "800",
    color: "#FF6B1A"
  },
  splashTitle: {
    ...mobileTypography.headingLg
  },
  splashSubtitle: {
    ...mobileTypography.bodySecondary,
    lineHeight: 22
  },
  splashActions: {
    marginTop: mobileTokens.spacing[8]
  },
  subtitle: {
    fontSize: 15,
    color: "#475569",
    textAlign: "center",
    marginBottom: 6
  },
  onboardingTopBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: mobileTokens.spacing[16]
  },
  onboardingTopText: {
    ...mobileTypography.body,
    fontWeight: "700"
  },
  skipButton: {
    paddingHorizontal: 8,
    paddingVertical: 6
  },
  skipButtonLabel: {
    color: mobileTokens.color.primaryAlt,
    fontWeight: "700",
    fontSize: mobileTokens.typography.body
  },
  pressedTopLink: {
    opacity: 0.74,
    transform: [{ scale: 0.98 }]
  },
  onboardingSlides: {
    alignItems: "stretch"
  },
  onboardingPage: {
    paddingRight: 14
  },
  onboardingCard: {
    minHeight: 520,
    padding: mobileTokens.spacing[24],
    justifyContent: "flex-end"
  },
  onboardingHero: {
    height: 240,
    borderRadius: 28,
    marginBottom: mobileTokens.spacing[24],
    backgroundColor: "rgba(255,255,255,0.7)",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center"
  },
  onboardingGlow: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(37,99,235,0.08)"
  },
  onboardingBadge: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.62)",
    alignItems: "center",
    justifyContent: "center",
    ...mobileTokens.shadow.glass
  },
  onboardingBadgeText: {
    fontSize: 40,
    fontWeight: "800",
    color: mobileTokens.color.primaryAlt
  },
  onboardingEyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: mobileTokens.color.primary
  },
  onboardingTitle: {
    ...mobileTypography.headingLg,
    marginTop: mobileTokens.spacing[8]
  },
  onboardingDescription: {
    ...mobileTypography.bodySecondary,
    lineHeight: 23,
    marginTop: mobileTokens.spacing[12]
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: mobileTokens.spacing[18],
    marginBottom: mobileTokens.spacing[18]
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(71,85,105,0.22)"
  },
  paginationDotActive: {
    width: 28,
    backgroundColor: mobileTokens.color.primaryAlt
  },
  onboardingActions: {
    marginHorizontal: 2
  },
  loginCard: {
    padding: mobileTokens.spacing[24],
    gap: mobileTokens.spacing[16]
  },
  loginTitle: {
    ...mobileTypography.headingLg
  },
  loginSubtitle: {
    ...mobileTypography.bodySecondary,
    lineHeight: 22
  },
  loginForm: {
    gap: mobileTokens.spacing[16]
  }
});
