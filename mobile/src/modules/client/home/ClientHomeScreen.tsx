import React, { useEffect, useMemo, useRef, useState } from "react";
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
      <GlassCard elevated animated style={styles.brandCard}>
        <SkeletonBlock style={styles.brandSkeletonLogo} />
        <View style={styles.brandMeta}>
          <SkeletonBlock style={styles.skeletonTitleLine} />
          <SkeletonBlock style={styles.skeletonSubtitleLine} />
        </View>
      </GlassCard>

      <View style={styles.contactRow}>
        {Array.from({ length: 5 }).map((_, index) => (
          <SkeletonBlock key={index} style={styles.contactSkeleton} />
        ))}
      </View>

      <GlassCard elevated animated style={styles.actionGridCard}>
        <View style={styles.actionGrid}>
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonBlock key={index} style={styles.actionSkeleton} />
          ))}
        </View>
      </GlassCard>

      <GlassCard elevated animated style={styles.heroCard}>
        <SkeletonBlock style={styles.heroSkeleton} />
      </GlassCard>

      <SkeletonBlock style={styles.chatSkeleton} />

      <GlassCard elevated animated style={styles.bonusCard}>
        <SkeletonBlock style={styles.bonusCircleSkeleton} />
        <View style={styles.bonusMeta}>
          <SkeletonBlock style={styles.bonusNameSkeleton} />
          <SkeletonBlock style={styles.bonusMailSkeleton} />
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
        <GlassCard key={index} elevated style={styles.listCard}>
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
      setMessages(rows);
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
      <>
        <GlassCard elevated animated style={styles.brandCard}>
          <View style={styles.brandBadge}>
            <Text style={styles.brandLogo}>ЦР</Text>
          </View>
          <View style={styles.brandMeta}>
            <Text style={styles.brandTitle} numberOfLines={1}>ЦЕНТР РАДИУС</Text>
            <Text style={styles.brandSubtitle} numberOfLines={1}>Профессиональный автосервис</Text>
          </View>
          <AppButton
            label="Выход"
            variant="ghost"
            onPress={() => {
              fireHaptic("selection");
              props.onLogout();
            }}
            style={styles.logoutButton}
            haptic="selection"
          />
        </GlassCard>

        <View style={styles.socialDock}>
          {CONTACT_LINKS.map((item) => (
            <Pressable
              key={item.key}
              onPress={() => {
                fireHaptic("selection");
                openLink(item.url);
              }}
              style={({ pressed }) => [styles.socialIcon, pressed && styles.pressedSurface]}
            >
              <Text style={styles.socialIconLabel} numberOfLines={1} adjustsFontSizeToFit>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        <GlassCard elevated animated style={styles.actionGridCard}>
          <View style={styles.actionGrid}>
            <Pressable
              style={({ pressed }) => [styles.actionTile, pressed && styles.pressedTile]}
              onPress={() => {
                fireHaptic("impactLight");
                void ensureBranchesLoaded().then(() => goToScreen("booking", { haptic: null }));
              }}
            >
              <Text style={styles.actionTileLabel} numberOfLines={2} adjustsFontSizeToFit>Записаться</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.actionTile, pressed && styles.pressedTile]}
              onPress={() => {
                fireHaptic("impactLight");
                void ensureVisitsLoaded().then(() => goToScreen("visits", { haptic: null }));
              }}
            >
              <Text style={styles.actionTileLabel} numberOfLines={2} adjustsFontSizeToFit>История посещений</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.actionTile, pressed && styles.pressedTile]}
              onPress={() => {
                fireHaptic("impactLight");
                void ensureBonusHistoryLoaded().then(() => goToScreen("bonus-history", { haptic: null }));
              }}
            >
              <Text style={styles.actionTileLabel} numberOfLines={2} adjustsFontSizeToFit>История начислений</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.actionTile, pressed && styles.pressedTile]}
              onPress={() => {
                fireHaptic("impactLight");
                void ensureBonusHistoryLoaded().then(() => goToScreen("cashback", { haptic: null }));
              }}
            >
              <Text style={styles.actionTileLabel} numberOfLines={2} adjustsFontSizeToFit>Система кешбека</Text>
            </Pressable>
          </View>
        </GlassCard>

        <GlassCard elevated animated style={styles.heroCard}>
          <View style={styles.heroFrame}>
            <View style={styles.heroOverlay}>
              <Text style={styles.heroTitle} numberOfLines={1} adjustsFontSizeToFit>ЦЕНТР РАДИУС</Text>
              <Text style={styles.heroSubtitle} numberOfLines={1} adjustsFontSizeToFit>ПРЕМИУМ СЕРВИС</Text>
            </View>
            <Image source={HERO_IMAGE} resizeMode="cover" style={styles.heroImage} />
            <View pointerEvents="none" style={styles.heroGlassGlow} />
            <View pointerEvents="none" style={styles.heroTopFade} />
            <View pointerEvents="none" style={styles.heroBottomShade} />
          </View>
        </GlassCard>

        <Pressable
          style={({ pressed }) => [styles.chatCta, pressed && styles.pressedCta]}
          onPress={() => {
            fireHaptic("impactMedium");
            void ensureChatLoaded();
            goToScreen("chat", { haptic: null });
          }}
        >
          <Text style={styles.chatCtaLabel}>ЧАТ</Text>
          <Text style={styles.chatCtaHint}>Связаться с администратором</Text>
        </Pressable>

        <GlassCard elevated animated style={styles.bonusCard}>
          <View style={styles.bonusCircle}>
            <Text style={styles.bonusValue}>{bonusBalance}</Text>
            <Text style={styles.bonusCaption}>бонусов</Text>
          </View>
          <View style={styles.bonusMeta}>
            <Text style={styles.userName} numberOfLines={1} ellipsizeMode="tail">{clientName}</Text>
            <Text style={styles.userEmail} numberOfLines={1} ellipsizeMode="tail">{me?.email ?? ""}</Text>
          </View>
        </GlassCard>
      </>
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
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {toast ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            toast.type === "success" ? styles.toastSuccess : styles.toastError,
            { top: insets.top + 8 },
            { opacity: toastOpacity, transform: [{ translateY: toastTranslateY }] }
          ]}
        >
          <Text style={styles.toastText}>{toast.message}</Text>
        </Animated.View>
      ) : null}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        decelerationRate="normal"
        bounces
        alwaysBounceVertical
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
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: mobileTokens.color.background
  },
  content: {
    padding: mobileTokens.spacing[18],
    gap: mobileTokens.spacing[16]
  },
  skeletonWrap: {
    gap: mobileTokens.spacing[16]
  },
  skeletonBlock: {
    overflow: "hidden",
    borderRadius: mobileTokens.radius.card,
    backgroundColor: mobileTokens.color.glass
  },
  skeletonShimmer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 96,
    backgroundColor: mobileTokens.color.glass
  },
  brandSkeletonLogo: {
    width: 74,
    height: 58,
    borderRadius: mobileTokens.radius.card
  },
  skeletonTitleLine: {
    height: 20,
    width: "74%",
    borderRadius: mobileTokens.radius.button
  },
  skeletonSubtitleLine: {
    height: 14,
    width: "92%",
    borderRadius: mobileTokens.radius.button,
    marginTop: 8
  },
  contactSkeleton: {
    width: 54,
    height: 54,
    borderRadius: mobileTokens.radius.card
  },
  actionSkeleton: {
    width: "48%",
    minHeight: 78,
    borderRadius: mobileTokens.radius.card
  },
  heroSkeleton: {
    width: "100%",
    height: 220,
    borderRadius: 0
  },
  chatSkeleton: {
    minHeight: 114,
    borderRadius: mobileTokens.radius.card
  },
  bonusCircleSkeleton: {
    width: 132,
    height: 132,
    borderRadius: 66
  },
  bonusNameSkeleton: {
    height: 30,
    width: "92%",
    borderRadius: mobileTokens.radius.button
  },
  bonusMailSkeleton: {
    height: 16,
    width: "70%",
    borderRadius: mobileTokens.radius.button
  },
  messageSkeletonLeft: {
    width: "58%",
    height: 64,
    borderRadius: mobileTokens.radius.card
  },
  messageSkeletonRight: {
    width: "46%",
    height: 54,
    borderRadius: mobileTokens.radius.card,
    alignSelf: "flex-end"
  },
  messageSkeletonLeftWide: {
    width: "68%",
    height: 62,
    borderRadius: mobileTokens.radius.card
  },
  chatInputSkeleton: {
    width: "100%",
    minHeight: 92,
    borderRadius: mobileTokens.radius.card
  },
  chatButtonSkeleton: {
    width: "100%",
    height: 52,
    borderRadius: mobileTokens.radius.button
  },
  listTitleSkeleton: {
    width: "54%",
    height: 20,
    borderRadius: mobileTokens.radius.button
  },
  listSubtitleSkeleton: {
    width: "70%",
    height: 14,
    borderRadius: mobileTokens.radius.button,
    marginTop: 8
  },
  listValueSkeleton: {
    width: "38%",
    height: 24,
    borderRadius: mobileTokens.radius.button,
    marginTop: 14
  },
  listHintSkeleton: {
    width: "88%",
    height: 14,
    borderRadius: mobileTokens.radius.button,
    marginTop: 10
  },
  loaderWrap: {
    paddingVertical: 32,
    alignItems: "center",
    justifyContent: "center",
    gap: 10
  },
  loaderText: {
    color: mobileTokens.color.textSecondary,
    fontSize: 14
  },
  brandCard: {
    padding: mobileTokens.spacing[18],
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "rgba(23, 31, 47, 0.45)",
    borderRadius: mobileTokens.radius[32],
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)"
  },
  brandBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(23, 31, 47, 0.9)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: mobileTokens.color.primary,
    ...mobileTokens.shadow.neon
  },
  brandLogo: {
    fontSize: 32,
    fontWeight: "900",
    color: mobileTokens.color.primary,
    letterSpacing: -1
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: mobileTokens.color.textPrimary,
    letterSpacing: 1
  },
  brandSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
    color: mobileTokens.color.primaryAlt,
    textTransform: "uppercase",
    letterSpacing: 1
  },
  socialDock: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: mobileTokens.spacing[16],
    marginVertical: 10
  },
  socialIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(0, 229, 255, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    ...mobileTokens.shadow.glass
  },
  socialIconLabel: {
    color: mobileTokens.color.textPrimary,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  pressedSurface: {
    transform: [{ scale: 0.972 }],
    opacity: 0.92
  },
  actionGridCard: {
    padding: mobileTokens.spacing[14],
    backgroundColor: mobileTokens.color.glass,
    borderColor: mobileTokens.color.borderSoft
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  actionTile: {
    width: "48%",
    minHeight: 104,
    borderRadius: mobileTokens.radius[28],
    backgroundColor: "rgba(23, 31, 47, 0.45)",
    borderWidth: 1.2,
    borderColor: "rgba(0, 229, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    ...mobileTokens.shadow.glass
  },
  pressedTile: {
    transform: [{ scale: 0.962 }],
    opacity: 0.92
  },
  actionTileLabel: {
    textAlign: "center",
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "900",
    color: mobileTokens.color.textPrimary,
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  heroCard: {
    overflow: "hidden",
    backgroundColor: "rgba(15, 23, 42, 0.3)",
    borderRadius: mobileTokens.radius[32],
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    shadowOpacity: 0.15
  },
  heroFrame: {
    position: "relative",
    overflow: "hidden",
    borderRadius: mobileTokens.radius[32]
  },
  heroImage: {
    width: "100%",
    height: 240
  },
  heroGlassGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 96,
    backgroundColor: mobileTokens.color.glass
  },
  heroTopFade: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: mobileTokens.color.glass
  },
  heroBottomShade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 92,
    backgroundColor: "rgba(15,23,42,0.18)"
  },
  heroOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    padding: 32,
    justifyContent: "flex-end",
    backgroundColor: "rgba(7, 10, 13, 0.38)"
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: "900",
    color: mobileTokens.color.textPrimary,
    letterSpacing: 2
  },
  heroSubtitle: {
    fontSize: 13,
    fontWeight: "700",
    color: mobileTokens.color.primary,
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 3
  },
  chatCta: {
    minHeight: 128,
    borderRadius: mobileTokens.radius[32],
    backgroundColor: "rgba(23, 31, 47, 0.92)",
    borderWidth: 1.5,
    borderColor: "rgba(0, 229, 255, 0.25)",
    justifyContent: "center",
    paddingHorizontal: 32,
    ...mobileTokens.shadow.neon
  },
  pressedCta: {
    transform: [{ scale: 0.98 }],
    opacity: 0.98
  },
  chatCtaLabel: {
    color: mobileTokens.color.textPrimary,
    fontSize: 48,
    fontWeight: "900",
    letterSpacing: 3
  },
  chatCtaHint: {
    color: mobileTokens.color.primary,
    fontSize: 12,
    fontWeight: "800",
    marginTop: -2,
    textTransform: "uppercase",
    letterSpacing: 1
  },
  bonusCard: {
    padding: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
    backgroundColor: "rgba(23, 31, 47, 0.65)",
    borderRadius: mobileTokens.radius[32],
    borderWidth: 1,
    borderColor: "rgba(255, 179, 0, 0.15)",
    ...mobileTokens.shadow.gold
  },
  bonusCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: "rgba(255, 179, 0, 0.35)",
    backgroundColor: "rgba(7, 10, 13, 0.55)",
    alignItems: "center",
    justifyContent: "center",
    ...mobileTokens.shadow.gold
  },
  bonusValue: {
    fontSize: 48,
    lineHeight: 48,
    fontWeight: "900",
    color: mobileTokens.color.primaryAlt
  },
  bonusCaption: {
    marginTop: 2,
    fontSize: 15,
    fontWeight: "900",
    color: mobileTokens.color.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1
  },
  bonusMeta: {
    flex: 1,
    gap: 4
  },
  userName: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: "900",
    color: mobileTokens.color.textPrimary,
    textTransform: "uppercase",
    letterSpacing: 1
  },
  userEmail: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(148, 163, 184, 0.6)"
  },
  screenHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4
  },
  backButton: {
    minWidth: 74
  },
  pressedNav: {
    transform: [{ scale: 0.972 }],
    opacity: 0.9
  },
  backButtonPlaceholder: {
    width: 74
  },
  backButtonLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: mobileTokens.color.primaryAlt
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: mobileTokens.color.textPrimary
  },
  emptyCard: {
    padding: 22
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: mobileTokens.color.textPrimary
  },
  emptyDescription: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: mobileTokens.color.textSecondary
  },
  listCard: {
    padding: mobileTokens.spacing[18],
    marginBottom: 12
  },
  visitCardPressable: {
    marginBottom: 12
  },
  listTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: mobileTokens.color.textPrimary
  },
  listSubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: mobileTokens.color.textSecondary
  },
  listValue: {
    marginTop: 10,
    fontSize: 24,
    fontWeight: "800",
    color: mobileTokens.color.primaryAlt
  },
  listHint: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: mobileTokens.color.textSecondary
  },
  visitServiceTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: mobileTokens.spacing[8],
    marginTop: 14
  },
  visitServiceTag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: mobileTokens.color.glass,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.18)"
  },
  visitServiceTagText: {
    fontSize: 13,
    color: mobileTokens.color.textPrimary,
    fontWeight: "600"
  },
  visitSummaryRow: {
    flexDirection: "row",
    gap: mobileTokens.spacing[12],
    marginTop: 16
  },
  visitMetric: {
    flex: 1,
    padding: mobileTokens.spacing[14],
    borderRadius: mobileTokens.radius.card,
    backgroundColor: mobileTokens.color.glass,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.14)"
  },
  visitMetricLabel: {
    fontSize: 13,
    color: mobileTokens.color.textSecondary
  },
  visitMetricValue: {
    marginTop: 6,
    fontSize: 20,
    fontWeight: "800",
    color: mobileTokens.color.textPrimary
  },
  detailHeroCard: {
    padding: 20,
    marginBottom: 12,
    backgroundColor: mobileTokens.color.glass,
    borderColor: mobileTokens.color.borderSoft
  },
  detailHeroTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
    color: mobileTokens.color.textPrimary
  },
  detailHeroSubtitle: {
    marginTop: 8,
    fontSize: 16,
    color: mobileTokens.color.textSecondary
  },
  detailHeroHint: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: mobileTokens.color.textSecondary
  },
  detailTotalsCard: {
    padding: mobileTokens.spacing[16],
    marginBottom: 12
  },
  detailTotalsGrid: {
    gap: 10
  },
  detailTotalCell: {
    padding: mobileTokens.spacing[14],
    borderRadius: mobileTokens.radius.card,
    backgroundColor: mobileTokens.color.glass,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.14)"
  },
  detailTotalLabel: {
    fontSize: 13,
    color: mobileTokens.color.textSecondary
  },
  detailTotalValue: {
    marginTop: 6,
    fontSize: 20,
    fontWeight: "800",
    color: mobileTokens.color.primaryAlt
  },
  detailSectionTitle: {
    marginTop: 4,
    marginBottom: 12,
    fontSize: 22,
    fontWeight: "800",
    color: mobileTokens.color.textPrimary
  },
  serviceCard: {
    padding: mobileTokens.spacing[18],
    marginBottom: 12
  },
  serviceTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: mobileTokens.color.textPrimary
  },
  serviceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    gap: mobileTokens.spacing[12]
  },
  serviceLabel: {
    fontSize: 14,
    color: mobileTokens.color.textSecondary
  },
  serviceValue: {
    fontSize: 16,
    fontWeight: "700",
    color: mobileTokens.color.textPrimary
  },
  cashbackCard: {
    padding: 22,
    gap: mobileTokens.spacing[12],
    backgroundColor: mobileTokens.color.glass,
    borderColor: mobileTokens.color.borderSoft
  },
  cashbackTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: mobileTokens.color.textPrimary
  },
  cashbackValue: {
    fontSize: 42,
    fontWeight: "900",
    color: mobileTokens.color.primaryAlt
  },
  cashbackHint: {
    fontSize: 15,
    lineHeight: 22,
    color: mobileTokens.color.textSecondary
  },
  cardActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16
  },
  cardButton: {
    minWidth: 132
  },
  conversationTabs: {
    gap: 10,
    paddingBottom: 12
  },
  conversationTab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: mobileTokens.color.glass,
    borderWidth: 1,
    borderColor: mobileTokens.color.borderSoft
  },
  pressedTab: {
    transform: [{ scale: 0.976 }]
  },
  conversationTabActive: {
    backgroundColor: "#111827"
  },
  conversationTabLabel: {
    color: mobileTokens.color.textPrimary,
    fontWeight: "700"
  },
  conversationTabLabelActive: {
    color: mobileTokens.color.textPrimary
  },
  chatPanel: {
    padding: mobileTokens.spacing[16],
    minHeight: 520,
    backgroundColor: mobileTokens.color.glass,
    borderColor: mobileTokens.color.borderSoft
  },
  messagesList: {
    gap: 10,
    paddingBottom: 18,
    flexGrow: 1
  },
  messagesEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 24
  },
  messagesEmptyTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: mobileTokens.color.textPrimary,
    textAlign: "center"
  },
  messagesEmptyHint: {
    marginTop: 6,
    fontSize: 13,
    color: mobileTokens.color.textSecondary,
    textAlign: "center",
    lineHeight: 18
  },
  messageBubble: {
    maxWidth: "82%",
    flexShrink: 1,
    borderRadius: mobileTokens.radius.card,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  messageMine: {
    alignSelf: "flex-end",
    backgroundColor: mobileTokens.color.primaryAlt
  },
  messageOther: {
    alignSelf: "flex-start",
    backgroundColor: mobileTokens.color.glass,
    borderWidth: 1,
    borderColor: mobileTokens.color.borderSoft
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
    flexShrink: 1,
    color: mobileTokens.color.textPrimary
  },
  messageTextMine: {
    color: mobileTokens.color.textPrimary
  },
  messageMeta: {
    marginTop: 6,
    fontSize: 11,
    color: mobileTokens.color.textSecondary
  },
  messageMetaMine: {
    color: mobileTokens.color.textSecondary
  },
  chatComposer: {
    marginTop: 12,
    gap: 10
  },
  typingFeel: {
    marginTop: -2,
    fontSize: 12,
    color: mobileTokens.color.textSecondary,
    letterSpacing: 0.2
  },
  chatInput: {
    minHeight: 92,
    borderRadius: mobileTokens.radius.card,
    borderWidth: 1,
    borderColor: mobileTokens.color.borderSoft,
    backgroundColor: mobileTokens.color.glass,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: mobileTokens.color.textPrimary,
    textAlignVertical: "top",
    shadowcolor: mobileTokens.color.textPrimary,
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2
  },
  sendButton: {
    minHeight: 52
  },
  toast: {
    position: "absolute",
    left: 18,
    right: 18,
    zIndex: 20,
    borderRadius: mobileTokens.radius.button,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowcolor: mobileTokens.color.textPrimary,
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8
  },
  toastSuccess: {
    backgroundColor: "rgba(22, 163, 74, 0.94)"
  },
  toastError: {
    backgroundColor: "rgba(220, 38, 38, 0.94)"
  },
  toastText: {
    color: mobileTokens.color.textPrimary,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center"
  }
});
