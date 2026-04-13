import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  KeyboardAvoidingView,
  Linking,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  BackHandler
} from "react-native";
import type { AuthSession } from "../../../app/navigation/role-navigation-resolver";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { mobileEnv } from "../../../shared/config/mobile-env";
import { mobileTokens } from "../../../shared/design/tokens";
import { fireHaptic, type HapticIntent } from "../../../shared/native/haptics";
import { safeOpenExternalUrl } from "../../../shared/native/open-url";
import { AppButton } from "../../../shared/ui/AppButton";
import { GlassCard } from "../../../shared/ui/GlassCard";
import { updateService } from "../../../shared/services/UpdateService";

type ClientHomeProps = {
  session: AuthSession;
  accessToken: string;
  onLogout: () => void;
};

type ScreenKey = "home" | "booking" | "visits" | "visit-details" | "bonus-history" | "cashback" | "chat";

type UserMe = {
  id: string;
  email: string;
  fullName?: string | null;
  role: string;
};

type BonusBalance = {
  balance: number;
};

type VisitRow = {
  id: string;
  visitDate: string;
  finalAmount?: number;
  totalAmount?: number;
  discountAmount?: number;
  comment?: string | null;
  branchName?: string | null;
  bonusAccrualAmount?: number;
  serviceNames?: string[];
  servicesCount?: number;
};

type VisitServiceRow = {
  id: string;
  serviceNameSnapshot?: string;
  price: number;
  quantity: number;
  total: number;
};

type VisitDetail = {
  id: string;
  visitDate: string;
  branchName?: string | null;
  adminName?: string | null;
  comment?: string | null;
  totalAmount?: number;
  discountAmount?: number;
  finalAmount?: number;
  bonusAccrualAmount?: number;
  visitServices?: VisitServiceRow[];
};

type BonusHistoryRow = {
  id: string;
  type: "accrual" | "writeoff";
  amount: number;
  comment?: string | null;
  createdAt: string;
};

type BranchRow = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone?: string | null;
  workHours?: { text?: string } | Record<string, unknown>;
  description?: string | null;
  isActive: boolean;
};

type ConversationRow = {
  id: string;
  clientId: string;
  adminId: string;
  unreadCount: number;
  updatedAt: string;
  lastMessage: { id: string; text: string | null; createdAt: string } | null;
};

type MessageRow = {
  id: string;
  senderId: string;
  receiverId: string;
  text: string | null;
  createdAt: string;
  readAt?: string | null;
};

const SCREEN_DEPTH: Record<ScreenKey, number> = {
  home: 0,
  booking: 1,
  visits: 1,
  "visit-details": 2,
  "bonus-history": 1,
  cashback: 1,
  chat: 1
};

function formatVisitDate(value?: string | null) {
  if (!value) return "Дата не указана";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Дата не указана";
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatMoney(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return `${value.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })} ₽`;
}

function getWorkHoursText(value: BranchRow["workHours"]): string | null {
  if (!value || typeof value !== "object") return null;
  const candidate = (value as { text?: unknown }).text;
  return typeof candidate === "string" && candidate.trim().length > 0 ? candidate.trim() : null;
}

const HERO_IMAGE = require("./assets/client-hero-car.png");

const CONTACT_LINKS = [
  { key: "vk", label: "ВК", url: "https://vk.com" },
  { key: "ig", label: "Inst", url: "https://instagram.com" },
  { key: "tg", label: "TG", url: "https://t.me" },
  { key: "mail", label: "@", url: "mailto:info@centr-radius-service.ru" },
  { key: "phone", label: "Тел", url: "tel:+78000000000" }
] as const;

function randomId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

async function requestJson<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${mobileEnv.apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {})
    }
  });
  const text = await response.text();
  const json = text ? (JSON.parse(text) as T & { message?: string; error?: string }) : ({} as T & { message?: string; error?: string });
  if (!response.ok) {
    throw new Error(json.message || json.error || "Не удалось выполнить действие. Попробуйте ещё раз.");
  }
  return json as T;
}

function friendlyErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;
  const message = error.message.trim();
  if (!message) return fallback;
  if (/request failed/i.test(message) || /network request failed/i.test(message)) return fallback;
  if (/fetch/i.test(message) || /network/i.test(message)) {
    return "Похоже, соединение нестабильно. Попробуйте ещё раз через пару секунд.";
  }
  if (/invalid credentials/i.test(message) || /wrong password/i.test(message) || /incorrect.*password/i.test(message)) {
    return "Неверный логин или пароль.";
  }
  if (/too many requests/i.test(message) || /too many.*sends/i.test(message) || /rate limit/i.test(message) || /please slow down/i.test(message) || /please retry/i.test(message)) {
    return "Слишком много попыток. Подождите немного и попробуйте снова.";
  }
  if (/validation failed/i.test(message) || /must be valid/i.test(message) || /is required/i.test(message) || /cannot be empty/i.test(message) || /too long/i.test(message)) {
    return "Некорректные данные. Проверьте введённое и попробуйте ещё раз.";
  }
  if (/bad request/i.test(message) || /invalid.*id/i.test(message)) {
    return "Ошибка запроса. Попробуйте ещё раз.";
  }
  if (/unauthorized/i.test(message) || /not authenticated/i.test(message)) {
    return "Требуется авторизация. Войдите в аккаунт снова.";
  }
  if (/access denied/i.test(message) || /forbidden/i.test(message)) {
    return "Это действие недоступно для вашего аккаунта.";
  }
  if (/not found/i.test(message)) {
    return "Данные не найдены.";
  }
  if (/server error/i.test(message) || /internal server/i.test(message)) {
    return "Ошибка сервера. Попробуйте ещё раз чуть позже.";
  }
  // Если осталось английское сообщение — использовать fallback
  if (!/[а-яёА-ЯЁ]/.test(message)) return fallback;
  return message;
}

function formatMessageTime(iso: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "";
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);
  const time = date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  if (date >= todayStart) return time;
  if (date >= yesterdayStart) return `вчера, ${time}`;
  return (
    date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }).replace(".", "") +
    `, ${time}`
  );
}

function ScreenHeader(props: { title: string; onBack: () => void }) {
  return (
    <View style={styles.screenHeader}>
      <Pressable
        onPress={() => {
          fireHaptic("selection");
          props.onBack();
        }}
        style={({ pressed }) => [styles.backButton, pressed && styles.pressedNav]}
      >
        <Text style={styles.backButtonLabel}>Назад</Text>
      </Pressable>
      <Text style={styles.screenTitle}>{props.title}</Text>
      <View style={styles.backButtonPlaceholder} />
    </View>
  );
}

function EmptyState(props: { title: string; description: string }) {
  return (
    <GlassCard elevated style={styles.emptyCard}>
      <Text style={styles.emptyTitle}>{props.title}</Text>
      <Text style={styles.emptyDescription}>{props.description}</Text>
    </GlassCard>
  );
}

function SkeletonBlock(props: { style?: object }) {
  const opacity = useRef(new Animated.Value(0.45)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.92,
          duration: 820,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 820,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        })
      ])
    );
    const shimmerAnimation = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1400,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true
      })
    );
    pulseAnimation.start();
    shimmerAnimation.start();
    return () => {
      pulseAnimation.stop();
      shimmerAnimation.stop();
    };
  }, [opacity, shimmer]);

  const shimmerTranslate = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-180, 180]
  });

  return (
    <Animated.View style={[styles.skeletonBlock, props.style, { opacity }]}>
      <Animated.View
        pointerEvents="none"
        style={[styles.skeletonShimmer, { transform: [{ translateX: shimmerTranslate }] }]}
      />
    </Animated.View>
  );
}

function HomeSkeleton() {
  return (
    <View style={styles.skeletonWrap}>
      {/* Welcome Skeleton */}
      <View style={{ padding: 24 }}>
        <SkeletonBlock style={{ width: 120, height: 10, borderRadius: 5, marginBottom: 8 }} />
        <SkeletonBlock style={{ width: 200, height: 32, borderRadius: 8 }} />
      </View>

      {/* Gauge Skeleton (Rectangular) */}
      <GlassCard elevated animated style={styles.bonusCard}>
        <SkeletonBlock style={{ width: "100%", height: 180, borderRadius: 20 }} />
      </GlassCard>

      {/* Bento Grid Skeleton */}
      <View style={styles.actionGrid}>
        <SkeletonBlock style={[styles.actionTileBig, { height: 60 }]} />
        <SkeletonBlock style={[styles.actionTile, { height: 80 }]} />
        <SkeletonBlock style={[styles.actionTile, { height: 80 }]} />
      </View>

      {/* Status Card Skeleton */}
      <GlassCard elevated animated style={styles.infoCard}>
        <SkeletonBlock style={{ width: 42, height: 42, borderRadius: 21 }} />
        <View style={{ marginLeft: 16, flex: 1 }}>
          <SkeletonBlock style={{ width: "60%", height: 12, borderRadius: 6, marginBottom: 8 }} />
          <SkeletonBlock style={{ width: "100%", height: 10, borderRadius: 5 }} />
        </View>
      </GlassCard>
    </View>
  );
}

function ChatSkeleton() {
  return (
    <GlassCard elevated style={styles.chatPanel}>
      <View style={styles.messagesList}>
        <SkeletonBlock style={styles.messageSkeletonLeft} />
        <SkeletonBlock style={styles.messageSkeletonRight} />
        <SkeletonBlock style={styles.messageSkeletonLeftWide} />
      </View>
      <View style={styles.chatComposer}>
        <SkeletonBlock style={styles.chatInputSkeleton} />
        <SkeletonBlock style={styles.chatButtonSkeleton} />
      </View>
    </GlassCard>
  );
}

function ListSkeleton(props: { rows?: number }) {
  return (
    <View style={styles.skeletonWrap}>
      {Array.from({ length: props.rows ?? 3 }).map((_, index) => (
        <GlassCard key={`skeleton-row-${index}`} elevated style={styles.listCard}>
          <SkeletonBlock style={styles.listTitleSkeleton} />
          <SkeletonBlock style={styles.listSubtitleSkeleton} />
          <SkeletonBlock style={styles.listValueSkeleton} />
          <SkeletonBlock style={styles.listHintSkeleton} />
        </GlassCard>
      ))}
    </View>
  );
}

function MotionScreen(props: { motionKey: string; direction: 1 | -1; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(props.direction * 28)).current;
  const translateY = useRef(new Animated.Value(6)).current;

  useEffect(() => {
    opacity.setValue(0);
    translateX.setValue(props.direction * 28);
    translateY.setValue(6);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(translateX, {
        toValue: 0,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      })
    ]).start();
  }, [opacity, props.direction, props.motionKey, translateX, translateY]);

  return <Animated.View style={{ opacity, transform: [{ translateX }, { translateY }] }}>{props.children}</Animated.View>;
}

function AnimatedMessageBubble(props: { mine: boolean; text: string; createdAt: string }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      })
    ]).start();
  }, [opacity, translateY]);

  return (
    <Animated.View
      style={[
        styles.messageBubble,
        props.mine ? styles.messageMine : styles.messageOther,
        { opacity, transform: [{ translateY }] }
      ]}
    >
      <Text style={[styles.messageText, props.mine && styles.messageTextMine]}>{props.text}</Text>
      <Text style={[styles.messageMeta, props.mine && styles.messageMetaMine]}>
        {formatMessageTime(props.createdAt)}
      </Text>
    </Animated.View>
  );
}


// [AUTO-TRIGGER] Metro Cache Invalidation for UI Polish
export function ClientHomeScreen(props: ClientHomeProps) {
  const screenWidth = Dimensions.get("window").width;
  const [screen, setScreen] = useState<ScreenKey>("home");
  const [loadingHome, setLoadingHome] = useState(true);
  const [homeError, setHomeError] = useState<string | null>(null);
  const [me, setMe] = useState<UserMe | null>(null);
  const [bonusBalance, setBonusBalance] = useState<number>(0);
  const [visits, setVisits] = useState<VisitRow[] | null>(null);
  const [visitsLoading, setVisitsLoading] = useState(false);
  const [visitsError, setVisitsError] = useState<string | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<VisitRow | null>(null);
  const [visitDetail, setVisitDetail] = useState<VisitDetail | null>(null);
  const [visitDetailLoading, setVisitDetailLoading] = useState(false);
  const [visitDetailError, setVisitDetailError] = useState<string | null>(null);
  const [bonusHistory, setBonusHistory] = useState<BonusHistoryRow[] | null>(null);
  const [bonusHistoryLoading, setBonusHistoryLoading] = useState(false);
  const [branches, setBranches] = useState<BranchRow[] | null>(null);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [conversations, setConversations] = useState<ConversationRow[] | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[] | null>(null);
  const [messageText, setMessageText] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [submittingMessage, setSubmittingMessage] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [transitionDirection, setTransitionDirection] = useState<1 | -1>(1);
  const chatScrollRef = useRef<ScrollView | null>(null);
  const hasChatBaselineRef = useRef(false);
  const lastIncomingMessageIdRef = useRef<string | null>(null);
  const isAtBottomRef = useRef(true);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTranslateY = useRef(new Animated.Value(-12)).current;
  const swipeBackTranslateX = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const backAction = () => {
      if (screen === "home") {
        return false; // let system handle it
      }
      if (SCREEN_DEPTH[screen] > 1 && screen === "visit-details") {
        goToScreen("visits", { haptic: "impactLight" });
      } else {
        goToScreen("home", { haptic: "impactLight" });
      }
      return true; // handled
    };

    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, [screen]);

  const clientName = useMemo(() => {
    const raw = me?.fullName?.trim();
    return raw && raw.length > 0 ? raw : me?.email ?? "Клиент";
  }, [me?.email, me?.fullName]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoadingHome(true);
        setHomeError(null);
        const [meData, balanceData] = await Promise.all([
          requestJson<UserMe>("/users/me", props.accessToken),
          requestJson<BonusBalance>(`/bonuses/balance?client_id=${encodeURIComponent(props.session.userId)}`, props.accessToken)
        ]);
        if (!mounted) return;
        setMe(meData);
        setBonusBalance(Number(balanceData.balance ?? 0));
      } catch (error) {
        if (!mounted) return;
        setHomeError(friendlyErrorMessage(error, "Не удалось открыть главный экран. Попробуйте ещё раз чуть позже."));
      } finally {
        if (mounted) {
          setLoadingHome(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [props.accessToken, props.session.userId]);

  useEffect(() => {
    if (screen !== "chat" || !messages) return;
    if (!isAtBottomRef.current) return; // пользователь читает историю — не прерываем
    const timer = setTimeout(() => {
      chatScrollRef.current?.scrollToEnd({ animated: true });
    }, 90);
    return () => clearTimeout(timer);
  }, [messages, screen]);

  useEffect(() => {
    if (!messages?.length) {
      hasChatBaselineRef.current = false;
      lastIncomingMessageIdRef.current = null;
      return;
    }
    const latestIncoming = [...messages].reverse().find((message) => message.senderId !== props.session.userId) ?? null;
    if (!latestIncoming) return;
    if (!hasChatBaselineRef.current) {
      hasChatBaselineRef.current = true;
      lastIncomingMessageIdRef.current = latestIncoming.id;
      return;
    }
    if (lastIncomingMessageIdRef.current !== latestIncoming.id) {
      lastIncomingMessageIdRef.current = latestIncoming.id;
      fireHaptic("soft");
    }
  }, [messages, props.session.userId]);

  useEffect(() => {
    if (screen !== "chat" || !activeConversationId) return;
    const timer = setInterval(() => {
      void silentRefreshMessages(activeConversationId);
    }, 5000);
    return () => clearInterval(timer);
  }, [screen, activeConversationId]);

  useEffect(() => {
    if (!toast) return;
    toastOpacity.setValue(0);
    toastTranslateY.setValue(-12);
    const show = Animated.parallel([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(toastTranslateY, {
        toValue: 0,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      })
    ]);
    const hide = Animated.parallel([
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(toastTranslateY, {
        toValue: -10,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true
      })
    ]);

    show.start();
    const timer = setTimeout(() => {
      hide.start(() => setToast(null));
    }, 2200);
    return () => clearTimeout(timer);
  }, [toast, toastOpacity, toastTranslateY]);

  function presentToast(type: "success" | "error", message: string, haptic?: HapticIntent | null) {
    if (haptic) fireHaptic(haptic);
    setToast({ type, message });
  }

  const [weather, setWeather] = useState<{ temp: number; icon: string } | null>(null);

  const fetchWeather = useCallback(async () => {
    try {
      const res = await fetch(
        "https://api.open-meteo.com/v1/forecast?latitude=59.9386&longitude=30.3141&current_weather=true"
      );
      const data = await res.json();
      const temp = Math.round(data.current_weather.temperature);
      const code = data.current_weather.weathercode;
      let emoji = "☀️";
      if (code >= 1 && code <= 3) emoji = "⛅";
      if (code >= 45) emoji = "☁️";
      if (code >= 51) emoji = "🌧️";
      setWeather({ temp, icon: emoji });
    } catch (e) {
      console.log("Weather fetch failed", e);
    }
  }, []);

  useEffect(() => {
    void fetchWeather();
  }, [fetchWeather]);

  function goToScreen(next: ScreenKey, options?: { haptic?: HapticIntent | null }) {
    if (options?.haptic !== null) {
      fireHaptic(options?.haptic ?? "selection");
    }
    swipeBackTranslateX.setValue(0);
    const currentDepth = SCREEN_DEPTH[screen];
    const nextDepth = SCREEN_DEPTH[next];
    setTransitionDirection(nextDepth >= currentDepth ? 1 : -1);
    setScreen(next);
  }

  const swipeBackResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: (event) => {
          if (screen === "home") return false;
          return event.nativeEvent.pageX <= 28;
        },
        onMoveShouldSetPanResponder: (_, gestureState) => {
          if (screen === "home") return false;
          return gestureState.dx > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.25;
        },
        onPanResponderMove: (_, gestureState) => {
          swipeBackTranslateX.setValue(Math.max(0, Math.min(gestureState.dx, screenWidth)));
        },
        onPanResponderRelease: (_, gestureState) => {
          const shouldGoBack = gestureState.dx > screenWidth * 0.28 || gestureState.vx > 0.45;
          if (shouldGoBack) {
            fireHaptic("selection");
            Animated.timing(swipeBackTranslateX, {
              toValue: screenWidth,
              duration: 180,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true
            }).start(() => {
              goToScreen("home", { haptic: null });
            });
            return;
          }
          Animated.spring(swipeBackTranslateX, {
            toValue: 0,
            damping: 20,
            stiffness: 240,
            mass: 0.9,
            useNativeDriver: true
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(swipeBackTranslateX, {
            toValue: 0,
            damping: 20,
            stiffness: 240,
            mass: 0.9,
            useNativeDriver: true
          }).start();
        }
      }),
    [screen, screenWidth, swipeBackTranslateX]
  );

  async function ensureVisitsLoaded() {
    if (visits) return;
    setVisitsLoading(true);
    setVisitsError(null);
    try {
      const rows = await requestJson<VisitRow[]>(
        `/clients/${encodeURIComponent(props.session.userId)}/visits`,
        props.accessToken
      );
      setVisits(rows);
    } catch (error) {
      const message = friendlyErrorMessage(error, "Не удалось загрузить историю посещений. Попробуйте ещё раз чуть позже.");
      setVisitsError(message);
      presentToast("error", message, "notificationError");
      setVisits(null);
    } finally {
      setVisitsLoading(false);
    }
  }

  async function openVisitDetails(visit: VisitRow) {
    setSelectedVisit(visit);
    setVisitDetail(null);
    setVisitDetailError(null);
    setVisitDetailLoading(true);
    goToScreen("visit-details", { haptic: "impactLight" });
    try {
      const detail = await requestJson<VisitDetail>(
        `/visits/${encodeURIComponent(visit.id)}`,
        props.accessToken
      );
      setVisitDetail(detail);
    } catch (error) {
      const message = friendlyErrorMessage(error, "Не удалось загрузить детали посещения. Попробуйте ещё раз чуть позже.");
      setVisitDetailError(message);
      presentToast("error", message, "notificationError");
    } finally {
      setVisitDetailLoading(false);
    }
  }

  async function ensureBonusHistoryLoaded() {
    if (bonusHistory) return;
    setBonusHistoryLoading(true);
    try {
      const rows = await requestJson<BonusHistoryRow[]>(
        `/bonuses/history?client_id=${encodeURIComponent(props.session.userId)}`,
        props.accessToken
      );
      setBonusHistory(rows);
    } catch (error) {
      presentToast(
        "error",
        friendlyErrorMessage(error, "Не удалось загрузить историю бонусов. Попробуйте ещё раз чуть позже."),
        "notificationError"
      );
      setBonusHistory([]);
    } finally {
      setBonusHistoryLoading(false);
    }
  }

  async function ensureBranchesLoaded() {
    if (branches) return;
    setBranchesLoading(true);
    try {
      const rows = await requestJson<BranchRow[]>("/branches", props.accessToken);
      setBranches(rows.filter((branch) => branch.isActive));
    } catch (error) {
      presentToast("error", friendlyErrorMessage(error, "Не удалось загрузить филиалы. Попробуйте ещё раз чуть позже."), "notificationError");
      setBranches([]);
    } finally {
      setBranchesLoading(false);
    }
  }

  async function ensureChatLoaded() {
    if (conversations && activeConversationId) return;
    setChatLoading(true);
    setChatError(null);
    try {
      await requestJson<{ id: string; created: boolean }>(
        "/chat/conversations/ensure",
        props.accessToken,
        { method: "POST", body: JSON.stringify({}) }
      );
      const convs = await requestJson<ConversationRow[]>("/chat/conversations", props.accessToken);
      setConversations(convs);
      const firstConversationId = convs[0]?.id ?? null;
      setActiveConversationId(firstConversationId);
      if (firstConversationId) {
        const rows = await requestJson<MessageRow[]>(
          `/chat/conversations/${encodeURIComponent(firstConversationId)}/messages`,
          props.accessToken
        );
        setMessages(rows);
      } else {
        setMessages([]);
      }
    } catch (error) {
      setChatError(friendlyErrorMessage(error, "Не удалось открыть чат. Попробуйте ещё раз чуть позже."));
      presentToast("error", friendlyErrorMessage(error, "Чат временно недоступен. Попробуйте ещё раз чуть позже."), "notificationError");
    } finally {
      setChatLoading(false);
    }
  }

  async function openConversation(conversationId: string) {
    isAtBottomRef.current = true; // при открытии диалога всегда скроллим вниз
    setActiveConversationId(conversationId);
    setChatLoading(true);
    setChatError(null);
    try {
      const rows = await requestJson<MessageRow[]>(
        `/chat/conversations/${encodeURIComponent(conversationId)}/messages`,
        props.accessToken
      );
      setMessages(rows);
    } catch (error) {
      setChatError(friendlyErrorMessage(error, "Не удалось загрузить сообщения. Попробуйте ещё раз чуть позже."));
      presentToast("error", friendlyErrorMessage(error, "Не удалось открыть диалог. Попробуйте ещё раз чуть позже."), "notificationError");
    } finally {
      setChatLoading(false);
    }
  }

  // Тихое фоновое обновление сообщений — без loading state, без ошибок в UI
  async function silentRefreshMessages(conversationId: string) {
    try {
      const rows = await requestJson<MessageRow[]>(
        `/chat/conversations/${encodeURIComponent(conversationId)}/messages`,
        props.accessToken
      );
      setMessages((prev) => {
        if (prev && JSON.stringify(prev) === JSON.stringify(rows)) {
          return prev;
        }
        return rows;
      });
    } catch (_) {
      // не показываем ошибку при фоновом опросе
    }
  }

  async function sendMessage() {
    if (!activeConversationId || !messageText.trim()) return;
    fireHaptic("impactLight");
    const draft = messageText.trim();
    setMessageText(""); // сразу очищаем поле
    setSubmittingMessage(true);
    setChatError(null);
    try {
      await requestJson<{ message: MessageRow }>(
        `/chat/conversations/${encodeURIComponent(activeConversationId)}/messages`,
        props.accessToken,
        {
          method: "POST",
          body: JSON.stringify({
            clientMessageId: randomId(),
            text: draft
          })
        }
      );
      // Тихо обновляем сообщения без loading state
      await silentRefreshMessages(activeConversationId);
      presentToast("success", "Сообщение отправлено");
    } catch (error) {
      setMessageText(draft); // возвращаем текст при ошибке
      presentToast("error", friendlyErrorMessage(error, "Не удалось отправить сообщение. Попробуйте ещё раз чуть позже."), "notificationError");
    } finally {
      setSubmittingMessage(false);
    }
  }

  function openLink(url: string) {
    void safeOpenExternalUrl(url, {
      failureTitle: "Не удалось открыть действие",
      failureMessage: "Попробуйте ещё раз чуть позже."
    });
  }

  function openBranchRoute(branch: BranchRow) {
    const label = encodeURIComponent(branch.name);
    const url = `https://maps.apple.com/?ll=${branch.lat},${branch.lng}&q=${label}`;
    void safeOpenExternalUrl(url, {
      failureTitle: "Не удалось открыть маршрут",
      failureMessage: "Проверьте доступность карт и попробуйте ещё раз."
    });
  }

  function renderHome() {
    if (loadingHome) {
      return <HomeSkeleton />;
    }

    if (homeError) {
      return <EmptyState title="Не удалось открыть экран" description={homeError} />;
    }

    return (
      <View style={{ flex: 1 }}>
        {/* Welcome Section */}
        <View style={styles.brandCard}>
          <Text style={styles.brandTitle}>С ВОЗВРАЩЕНИЕМ</Text>
          <Text style={styles.welcomeText}>{clientName || "Анастасия"}</Text>
        </View>

        {/* Loyalty Gauge */}
        <GlassCard elevated animated style={styles.bonusCard}>
          <View style={styles.gaugeContainer}>
            <Image 
              source={{ uri: "https://lh3.googleusercontent.com/aida/ADBb0uj9KA2KJkFr7_GHIUDLSf7LCkcuhE4l92aj31aYoNABVzY2Kx4lrZzucyt25yLXdVFBmeLUo8kSGKdujQGdOkJx1ApQuXaHDMXpSCYzXA2ghcJ4TYQOdRkuUtaoS8xrw9G6LJkQMiTI2Kzdre5Wf4pVtht1-ecpx3C1aHe-GMNlpEDMP_rOJ3gvUDNDA-PAX2ZXkDvw5fQUJCuFdQxYvAREhqGGqUiTbY9aeiE4da0C-NnyshpF8Tl8z_TqRvg8qELAqKYvsGbUMjs" }} 
              style={styles.gaugeImage}
            />
            <Text style={styles.bonusValue}>{bonusBalance}</Text>
            <Text style={styles.bonusCaption}>Бонусных баллов</Text>
          </View>
        </GlassCard>

        {/* Bento Grid */}
        <View style={styles.actionGrid}>
          <Pressable
            style={({ pressed }) => [styles.actionTileBig, pressed && styles.pressedTile]}
            onPress={() => {
              fireHaptic("impactLight");
              void ensureBranchesLoaded().then(() => goToScreen("booking", { haptic: null }));
            }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.1)", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 20 }}>🛠️</Text>
            </View>
            <Text style={styles.actionTileLabelDark}>Запись на ремонт</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.actionTile, pressed && styles.pressedTile]}
            onPress={() => {
              fireHaptic("impactLight");
              void ensureVisitsLoaded().then(() => goToScreen("visits", { haptic: null }));
            }}
          >
            <Text style={{ fontSize: 24 }}>📅</Text>
            <View>
              <Text style={styles.actionTileLabel}>История визитов</Text>
              <Text style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>12 ВЫПОЛНЕНО</Text>
            </View>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.actionTile, pressed && styles.pressedTile]}
            onPress={() => {
              fireHaptic("impactLight");
              void ensureBonusHistoryLoaded().then(() => goToScreen("cashback", { haptic: null }));
            }}
          >
            <Text style={{ fontSize: 24 }}>💳</Text>
            <View>
              <Text style={styles.actionTileLabel}>Кэшбэк система</Text>
              <Text style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>СТАВКА 5%</Text>
            </View>
          </Pressable>
        </View>

        {/* Status Card */}
        <View style={styles.infoCard}>
          <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.05)", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 18 }}>🚗</Text>
          </View>
          <View style={{ marginLeft: 16 }}>
            <Text style={styles.infoTitle}>Следующее ТО</Text>
            <Text style={styles.infoSubtitle}>Запланировано на 24 октября 2024</Text>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </View>
    );
  }

  function renderVisits() {
    return (
      <>
        <ScreenHeader title="История посещений" onBack={() => goToScreen("home", { haptic: null })} />
        {visitsLoading && !visits ? (
          <ListSkeleton rows={3} />
        ) : visitsError ? (
          <EmptyState title="Не удалось загрузить посещения" description={visitsError} />
        ) : !visits?.length ? (
          <EmptyState title="У вас пока нет посещений" description="После первого визита история появится здесь." />
        ) : (
          visits.map((visit) => (
            <Pressable
              key={visit.id}
              onPress={() => {
                void openVisitDetails(visit);
              }}
              style={({ pressed }) => [styles.visitCardPressable, pressed && styles.pressedTile]}
            >
              <GlassCard elevated style={styles.listCard}>
                <Text style={styles.listTitle}>{formatVisitDate(visit.visitDate)}</Text>
                <Text style={styles.listSubtitle}>{visit.branchName || "Филиал сервиса"}</Text>
                <View style={styles.visitServiceTags}>
                  {(visit.serviceNames?.length ? visit.serviceNames : ["Состав услуг появится в деталях"]).map((serviceName) => (
                    <View key={`${visit.id}-${serviceName}`} style={styles.visitServiceTag}>
                      <Text style={styles.visitServiceTagText}>{serviceName}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.visitSummaryRow}>
                  <View style={styles.visitMetric}>
                    <Text style={styles.visitMetricLabel}>Итог</Text>
                    <Text style={styles.visitMetricValue}>{formatMoney(visit.finalAmount)}</Text>
                  </View>
                  <View style={styles.visitMetric}>
                    <Text style={styles.visitMetricLabel}>Бонусы</Text>
                    <Text style={styles.visitMetricValue}>{formatMoney(visit.bonusAccrualAmount ?? 0)}</Text>
                  </View>
                </View>
                <Text style={styles.listHint}>Нажмите, чтобы открыть детали посещения.</Text>
              </GlassCard>
            </Pressable>
          ))
        )}
      </>
    );
  }

  function renderVisitDetails() {
    const detail = visitDetail;
    const services = detail?.visitServices ?? [];

    return (
      <>
        <ScreenHeader title="Детали посещения" onBack={() => goToScreen("visits", { haptic: null })} />
        {visitDetailLoading && !detail ? (
          <ListSkeleton rows={3} />
        ) : visitDetailError ? (
          <EmptyState title="Не удалось открыть посещение" description={visitDetailError} />
        ) : !selectedVisit ? (
          <EmptyState title="Посещение не выбрано" description="Вернитесь к истории посещений и откройте нужный визит." />
        ) : (
          <>
            <GlassCard elevated style={styles.detailHeroCard}>
              <Text style={styles.detailHeroTitle}>{formatVisitDate(detail?.visitDate ?? selectedVisit.visitDate)}</Text>
              <Text style={styles.detailHeroSubtitle}>{detail?.branchName || selectedVisit.branchName || "Филиал сервиса"}</Text>
              {detail?.adminName ? <Text style={styles.detailHeroHint}>Оформил: {detail.adminName}</Text> : null}
              {detail?.comment ? <Text style={styles.detailHeroHint}>Комментарий: {detail.comment}</Text> : null}
            </GlassCard>

            <GlassCard elevated style={styles.detailTotalsCard}>
              <View style={styles.detailTotalsGrid}>
                <View style={styles.detailTotalCell}>
                  <Text style={styles.detailTotalLabel}>Сумма до скидки</Text>
                  <Text style={styles.detailTotalValue}>{formatMoney(detail?.totalAmount ?? selectedVisit.totalAmount)}</Text>
                </View>
                <View style={styles.detailTotalCell}>
                  <Text style={styles.detailTotalLabel}>Скидка</Text>
                  <Text style={styles.detailTotalValue}>{formatMoney(detail?.discountAmount ?? selectedVisit.discountAmount ?? 0)}</Text>
                </View>
                <View style={styles.detailTotalCell}>
                  <Text style={styles.detailTotalLabel}>Итоговая сумма</Text>
                  <Text style={styles.detailTotalValue}>{formatMoney(detail?.finalAmount ?? selectedVisit.finalAmount)}</Text>
                </View>
                <View style={styles.detailTotalCell}>
                  <Text style={styles.detailTotalLabel}>Начисленные бонусы</Text>
                  <Text style={styles.detailTotalValue}>{formatMoney(detail?.bonusAccrualAmount ?? selectedVisit.bonusAccrualAmount ?? 0)}</Text>
                </View>
              </View>
            </GlassCard>

            <Text style={styles.detailSectionTitle}>Услуги</Text>
            {!services.length ? (
              <EmptyState title="Состав услуг недоступен" description="Попробуйте открыть посещение чуть позже." />
            ) : (
              services.map((service) => (
                <GlassCard key={service.id} elevated style={styles.serviceCard}>
                  <Text style={styles.serviceTitle}>{service.serviceNameSnapshot || "Услуга"}</Text>
                  <View style={styles.serviceRow}>
                    <Text style={styles.serviceLabel}>Цена</Text>
                    <Text style={styles.serviceValue}>{formatMoney(service.price)}</Text>
                  </View>
                  <View style={styles.serviceRow}>
                    <Text style={styles.serviceLabel}>Количество</Text>
                    <Text style={styles.serviceValue}>{service.quantity}</Text>
                  </View>
                  <View style={styles.serviceRow}>
                    <Text style={styles.serviceLabel}>Итог</Text>
                    <Text style={styles.serviceValue}>{formatMoney(service.total)}</Text>
                  </View>
                </GlassCard>
              ))
            )}
          </>
        )}
      </>
    );
  }

  function renderBonusHistory() {
    return (
      <>
        <ScreenHeader title="История начислений" onBack={() => goToScreen("home", { haptic: null })} />
        {bonusHistoryLoading && !bonusHistory ? (
          <ListSkeleton rows={3} />
        ) : !bonusHistory?.length ? (
          <EmptyState title="История бонусов пока пуста" description="После первого начисления или списания все операции появятся здесь." />
        ) : (
          bonusHistory.map((row) => (
            <GlassCard key={row.id} elevated style={styles.listCard}>
              <Text style={styles.listTitle}>{row.type === "accrual" ? "Начисление" : "Списание"}</Text>
              <Text style={styles.listValue}>{row.amount} бонусов</Text>
              <Text style={styles.listSubtitle}>{new Date(row.createdAt).toLocaleString("ru-RU")}</Text>
              {row.comment ? <Text style={styles.listHint}>{row.comment}</Text> : null}
            </GlassCard>
          ))
        )}
      </>
    );
  }

  function renderCashback() {
    return (
      <>
        <ScreenHeader title="Система кешбека" onBack={() => goToScreen("home", { haptic: null })} />
        <GlassCard elevated style={styles.cashbackCard}>
          <Text style={styles.cashbackTitle}>Текущий бонусный баланс</Text>
          <Text style={styles.cashbackValue}>{bonusBalance} бонусов</Text>
          <Text style={styles.cashbackHint}>
            Бонусы накапливаются в системе сервиса и доступны для использования в следующих визитах.
          </Text>
          <Text style={styles.cashbackHint}>
            Операций в истории: {bonusHistory?.length ?? 0}
          </Text>
        </GlassCard>
      </>
    );
  }

  function renderBooking() {
    return (
      <>
        <ScreenHeader title="Записаться" onBack={() => goToScreen("home", { haptic: null })} />
        {branchesLoading && !branches ? (
          <ListSkeleton rows={2} />
        ) : !branches?.length ? (
          <EmptyState title="Запись пока недоступна" description="Подходящие филиалы скоро появятся здесь. Пока можно написать нам в чат." />
        ) : (
          branches.map((branch) => (
            <GlassCard key={branch.id} elevated style={styles.listCard}>
              <Text style={styles.listTitle}>{branch.name}</Text>
              <Text style={styles.listSubtitle}>{branch.address}</Text>
              {branch.phone ? <Text style={styles.listHint}>Телефон: {branch.phone}</Text> : null}
              {getWorkHoursText(branch.workHours) ? (
                <Text style={styles.listHint}>График: {getWorkHoursText(branch.workHours)}</Text>
              ) : null}
              <View style={styles.cardActions}>
                {branch.phone ? (
                  <AppButton
                    label="Позвонить"
                    variant="secondary"
                    onPress={() => openLink(`tel:${branch.phone}`)}
                    style={styles.cardButton}
                    haptic="impactLight"
                  />
                ) : null}
                <AppButton
                  label="Написать в чат"
                  variant="secondary"
                  onPress={() => {
                    fireHaptic("impactMedium");
                    void ensureChatLoaded();
                    goToScreen("chat", { haptic: null });
                  }}
                  style={styles.cardButton}
                />
                <AppButton label="Маршрут" onPress={() => openBranchRoute(branch)} style={styles.cardButton} haptic="impactLight" />
              </View>
            </GlassCard>
          ))
        )}
      </>
    );
  }

  function renderChat() {
    return (
      <>
        <ScreenHeader title="Чат" onBack={() => goToScreen("home", { haptic: null })} />
        {chatLoading ? (
          <ChatSkeleton />
        ) : chatError ? (
          <EmptyState title="Не удалось открыть чат" description={chatError} />
        ) : !conversations?.length || !activeConversationId ? (
          <EmptyState title="Диалог пока не начат" description="Напишите первым, и администратор ответит в этом окне." />
        ) : (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              bounces
              contentContainerStyle={styles.conversationTabs}
            >
              {conversations.map((conversation) => (
                <Pressable
                  key={conversation.id}
                  onPress={() => {
                    fireHaptic("selection");
                    void openConversation(conversation.id);
                  }}
                  style={({ pressed }) => [
                    styles.conversationTab,
                    conversation.id === activeConversationId && styles.conversationTabActive,
                    pressed && styles.pressedTab
                  ]}
                >
                  <Text
                    style={[
                      styles.conversationTabLabel,
                      conversation.id === activeConversationId && styles.conversationTabLabelActive
                    ]}
                  >
                    Чат {conversation.unreadCount > 0 ? `(${conversation.unreadCount})` : ""}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <GlassCard elevated style={styles.chatPanel}>
              <ScrollView
                ref={chatScrollRef}
                contentContainerStyle={styles.messagesList}
                showsVerticalScrollIndicator={false}
                decelerationRate="normal"
                bounces
                alwaysBounceVertical
                keyboardDismissMode="interactive"
                keyboardShouldPersistTaps="handled"
                scrollEventThrottle={100}
                onScroll={(e) => {
                  const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
                  isAtBottomRef.current =
                    contentOffset.y + layoutMeasurement.height >= contentSize.height - 80;
                }}
              >
                {!(messages ?? []).length ? (
                  <View style={styles.messagesEmpty}>
                    <Text style={styles.messagesEmptyTitle}>Сообщений пока нет</Text>
                    <Text style={styles.messagesEmptyHint}>Напишите, чтобы начать общение с сервисом</Text>
                  </View>
                ) : (messages ?? []).map((message) => {
                  const mine = message.senderId === props.session.userId;
                  return (
                    <AnimatedMessageBubble
                      key={message.id}
                      mine={mine}
                      text={message.text || ""}
                      createdAt={message.createdAt}
                    />
                  );
                })}
              </ScrollView>

              <View style={styles.chatComposer}>
                <TextInput
                  value={messageText}
                  onChangeText={setMessageText}
                  placeholder="Введите сообщение"
                  placeholderTextColor="#94A3B8"
                  multiline
                  style={styles.chatInput}
                />
                <AppButton
                  label={submittingMessage ? "Отправка..." : "Отправить"}
                  onPress={() => void sendMessage()}
                  disabled={submittingMessage || !messageText.trim()}
                  style={styles.sendButton}
                />
              </View>
            </GlassCard>
          </>
        )}
      </>
    );
  }

  return (
    <View style={styles.screenWrap}>
      {/* Fixed Header */}
      <View style={styles.header}>
        <Pressable onPress={() => fireHaptic("selection")} style={({ pressed }) => [pressed && styles.pressedSurface]}>
          <Text style={{ fontSize: 24, color: "rgba(255,255,255,0.4)" }}>☰</Text>
        </Pressable>
        <Text style={styles.headerTitle}>OBSIDIAN</Text>
        <View style={styles.weatherWidget}>
          <Text style={{ fontSize: 14 }}>{weather?.icon || "☀️"}</Text>
          <Text style={styles.weatherText}>СПБ {weather ? `${weather.temp}°C` : "+15°C"}</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {toast ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.toast,
              toast.type === "success" ? styles.toastSuccess : styles.toastError,
              { top: 20 },
              { opacity: toastOpacity, transform: [{ translateY: toastTranslateY }] }
            ]}
          >
            <Text style={styles.toastText}>{toast.message}</Text>
          </Animated.View>
        ) : null}
        
        <ScrollView
          style={styles.pageScroll}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          decelerationRate="normal"
          bounces
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            {...(screen === "home" ? {} : swipeBackResponder.panHandlers)}
            style={[
              screen === "home"
                ? null
                : {
                    transform: [{ translateX: swipeBackTranslateX }],
                    opacity: swipeBackTranslateX.interpolate({
                      inputRange: [0, screenWidth],
                      outputRange: [1, 0.92],
                      extrapolate: "clamp"
                    })
                  }
            ]}
          >
            <MotionScreen motionKey={screen} direction={transitionDirection}>
              {screen === "home" && renderHome()}
              {screen === "visits" && renderVisits()}
              {screen === "visit-details" && renderVisitDetails()}
              {screen === "bonus-history" && renderBonusHistory()}
              {screen === "cashback" && renderCashback()}
              {screen === "booking" && renderBooking()}
              {screen === "chat" && renderChat()}
            </MotionScreen>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Navigation - Fixed outside Keyboard avoiding view */}
      <View style={[styles.navBar, { paddingBottom: 12 }]}>
        <Pressable onPress={() => goToScreen("home")} style={styles.navItem} hitSlop={10}>
          <Text style={{ fontSize: 22, color: screen === "home" ? mobileTokens.color.secondary : "rgba(255,255,255,0.4)" }}>🏠</Text>
          <Text style={[styles.navLabel, screen === "home" && styles.navLabelActive]}>Главная v141</Text>
        </Pressable>
        <Pressable onPress={() => goToScreen("visits")} style={styles.navItem} hitSlop={10}>
          <Text style={{ fontSize: 22, color: screen === "visits" ? mobileTokens.color.secondary : "rgba(255,255,255,0.4)" }}>📋</Text>
          <Text style={[styles.navLabel, screen === "visits" && styles.navLabelActive]}>История</Text>
        </Pressable>
        <Pressable onPress={() => goToScreen("booking")} style={styles.navItem} hitSlop={10}>
          <Text style={{ fontSize: 22, color: screen === "booking" ? mobileTokens.color.secondary : "rgba(255,255,255,0.4)" }}>🔧</Text>
          <Text style={[styles.navLabel, screen === "booking" && styles.navLabelActive]}>Сервис</Text>
        </Pressable>
        <Pressable onPress={() => goToScreen("chat")} style={styles.navItem} hitSlop={10}>
          <Text style={{ fontSize: 22, color: screen === "chat" ? mobileTokens.color.secondary : "rgba(255,255,255,0.4)" }}>👤</Text>
          <Text style={[styles.navLabel, screen === "chat" && styles.navLabelActive]}>Профиль</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeletonWrap: { gap: 16, padding: 20 },
  skeletonBlock: { backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 8, overflow: "hidden" },
  skeletonShimmer: { height: "100%", width: 80, backgroundColor: "rgba(255,255,255,0.03)" },
  loaderWrap: { padding: 40, alignItems: "center", gap: 12 },
  loaderText: { color: mobileTokens.color.textSecondary, fontSize: 13, fontWeight: "600" },

  // Brand & Welcome
  brandCard: {
    padding: 24,
    backgroundColor: "transparent",
    borderWidth: 0
  },
  brandTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: mobileTokens.color.textSecondary,
    letterSpacing: 4,
    textTransform: "uppercase",
    marginBottom: 8
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: "800",
    color: mobileTokens.color.textPrimary,
    letterSpacing: -0.5
  },

  // Gauge area
  bonusCard: {
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 280,
    overflow: "hidden"
  },
  gaugeContainer: {
    width: "100%",
    height: 220,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
    overflow: "hidden"
  },
  gaugeImage: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: 20,
    opacity: 0.5
  },
  bonusValue: {
    fontSize: 48,
    fontWeight: "800",
    color: mobileTokens.color.primary,
    textShadowColor: "rgba(162, 231, 255, 0.4)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10
  },
  bonusCaption: {
    fontSize: 10,
    fontWeight: "700",
    color: mobileTokens.color.secondary,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginTop: 4
  },

  // Action Grid
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 24
  },
  actionTile: {
    width: "48%",
    aspectRatio: 1,
    padding: 20,
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)"
  },
  actionTileBig: {
    width: "100%",
    aspectRatio: 4,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    backgroundColor: mobileTokens.color.secondary,
    borderRadius: 20
  },
  actionTileLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: mobileTokens.color.textPrimary
  },
  actionTileLabelDark: {
    fontSize: 15,
    fontWeight: "800",
    color: "#000000",
    marginLeft: 16
  },

  // Info Card
  infoCard: {
    marginHorizontal: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)"
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: mobileTokens.color.textPrimary
  },
  infoSubtitle: {
    fontSize: 12,
    color: mobileTokens.color.textSecondary,
    marginTop: 2
  },

  // Navigation
  navBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 90,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "rgba(19, 19, 19, 1)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
    zIndex: 9999,
    elevation: 8
  },
  navItem: {
    alignItems: "center",
    gap: 4
  },
  navLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: mobileTokens.color.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1
  },
  navLabelActive: {
    color: mobileTokens.color.secondary
  },

  // Common
  screenWrap: { flex: 1, backgroundColor: mobileTokens.color.background },
  pageScroll: { flex: 1 },
  header: {
    height: 60,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)"
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: mobileTokens.color.textPrimary,
    letterSpacing: 4
  },
  weatherWidget: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 20
  },
  weatherText: {
    fontSize: 10,
    fontWeight: "800",
    color: mobileTokens.color.textPrimary
  },
  root: {
    flex: 1,
    backgroundColor: mobileTokens.color.background
  },
  pressedSurface: {
    opacity: 0.7
  },
  pressedTile: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }]
  },
  toast: {
    position: "absolute",
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    zIndex: 1000
  },
  toastSuccess: { backgroundColor: mobileTokens.color.success },
  toastError: { backgroundColor: mobileTokens.color.error },
  toastText: { color: "#FFF", fontWeight: "700" }
});
