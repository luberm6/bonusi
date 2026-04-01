import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { AuthSession } from "../navigation/role-navigation-resolver";
import { resolveNavigationAfterLogin } from "../navigation/role-navigation-resolver";
import { mobileEnv } from "../../shared/config/mobile-env";
import { mobileTokens, mobileTypography } from "../../shared/design/tokens";
import { fireHaptic } from "../../shared/native/haptics";
import { safeOpenExternalUrl } from "../../shared/native/open-url";
import { AppButton } from "../../shared/ui/AppButton";
import { AppInput } from "../../shared/ui/AppInput";
import { GlassCard } from "../../shared/ui/GlassCard";

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

export function BootSplash() {
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.centered}>
        <ActivityIndicator />
        <Text style={styles.subtitle}>Запускаем приложение...</Text>
      </View>
    </SafeAreaView>
  );
}

export function AnonymousView(props: { onOpenLogin: () => void }) {
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

export function StaffAccessView(props: { session: AuthSession; onLogout: () => void }) {
  const navigation = useMemo(() => resolveNavigationAfterLogin(props.session), [props.session]);
  const openWebWorkspace = async () => {
    fireHaptic("impactLight");
    await safeOpenExternalUrl(mobileEnv.webAppUrl, {
      failureTitle: "Не удалось открыть рабочий кабинет",
      failureMessage: "Проверьте подключение и попробуйте ещё раз."
    });
  };

  return (
    <View style={styles.centeredShell}>
      <GlassCard elevated animated style={styles.splashCard}>
        <Text style={styles.brandMark}>CRS</Text>
        <Text style={styles.splashTitle}>Рабочее пространство команды</Text>
        <Text style={styles.splashSubtitle}>
          Для роли {props.session.role} основной рабочий контур доступен в браузере.
        </Text>
        <Text style={styles.splashSubtitle}>Откроется раздел: {navigation.defaultPath}</Text>
        <View style={styles.splashActions}>
          <AppButton label="Открыть рабочий кабинет" onPress={() => void openWebWorkspace()} haptic="impactLight" />
          <AppButton label="Выйти" variant="secondary" onPress={props.onLogout} haptic="selection" />
        </View>
      </GlassCard>
    </View>
  );
}

export function OnboardingView(props: { onDone: () => void; onSkip: () => void }) {
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

export function LoginView(props: {
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
            placeholder="example@mail.ru"
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
