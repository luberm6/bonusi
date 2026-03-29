import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import type { AuthSession } from "../../../app/navigation/role-navigation-resolver";
import { mobileEnv } from "../../../shared/config/mobile-env";
import { mobileTokens } from "../../../shared/design/tokens";
import { AppButton } from "../../../shared/ui/AppButton";
import { GlassCard } from "../../../shared/ui/GlassCard";

type ClientHomeProps = {
  session: AuthSession;
  accessToken: string;
};

type ScreenKey = "home" | "booking" | "visits" | "bonus-history" | "cashback" | "chat";

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
  comment?: string | null;
  branchName?: string | null;
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

function getWorkHoursText(value: BranchRow["workHours"]): string | null {
  if (!value || typeof value !== "object") return null;
  const candidate = (value as { text?: unknown }).text;
  return typeof candidate === "string" && candidate.trim().length > 0 ? candidate.trim() : null;
}

const HERO_IMAGE = require("./assets/client-hero-car.png");

const CONTACT_LINKS = [
  { key: "vk", label: "VK", url: "https://vk.com" },
  { key: "ig", label: "IG", url: "https://instagram.com" },
  { key: "tg", label: "TG", url: "https://t.me" },
  { key: "mail", label: "@", url: "mailto:info@centr-radius-service.ru" },
  { key: "phone", label: "PH", url: "tel:+78000000000" }
] as const;

function randomId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
  const json = text ? (JSON.parse(text) as T & { message?: string }) : ({} as T & { message?: string });
  if (!response.ok) {
    throw new Error(json.message || `Request failed (${response.status})`);
  }
  return json as T;
}

function ScreenHeader(props: { title: string; onBack: () => void }) {
  return (
    <View style={styles.screenHeader}>
      <Pressable onPress={props.onBack} style={styles.backButton}>
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

  useEffect(() => {
    const animation = Animated.loop(
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
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return <Animated.View style={[styles.skeletonBlock, props.style, { opacity }]} />;
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

function MotionScreen(props: { motionKey: string; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(12);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      })
    ]).start();
  }, [opacity, props.motionKey, translateY]);

  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{props.children}</Animated.View>;
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
        {new Date(props.createdAt).toLocaleTimeString("ru-RU", {
          hour: "2-digit",
          minute: "2-digit"
        })}
      </Text>
    </Animated.View>
  );
}

export function ClientHomeScreen(props: ClientHomeProps) {
  const [screen, setScreen] = useState<ScreenKey>("home");
  const [loadingHome, setLoadingHome] = useState(true);
  const [homeError, setHomeError] = useState<string | null>(null);
  const [me, setMe] = useState<UserMe | null>(null);
  const [bonusBalance, setBonusBalance] = useState<number>(0);
  const [visits, setVisits] = useState<VisitRow[] | null>(null);
  const [bonusHistory, setBonusHistory] = useState<BonusHistoryRow[] | null>(null);
  const [branches, setBranches] = useState<BranchRow[] | null>(null);
  const [conversations, setConversations] = useState<ConversationRow[] | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[] | null>(null);
  const [messageText, setMessageText] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [submittingMessage, setSubmittingMessage] = useState(false);
  const chatScrollRef = useRef<ScrollView | null>(null);

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
        setHomeError(error instanceof Error ? error.message : "Не удалось загрузить главный экран");
      } finally {
        if (mounted) setLoadingHome(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [props.accessToken, props.session.userId]);

  useEffect(() => {
    if (screen !== "chat" || !messages) return;
    const timer = setTimeout(() => {
      chatScrollRef.current?.scrollToEnd({ animated: true });
    }, 90);
    return () => clearTimeout(timer);
  }, [messages, screen]);

  async function ensureVisitsLoaded() {
    if (visits) return;
    const rows = await requestJson<VisitRow[]>(
      `/visits?clientId=${encodeURIComponent(props.session.userId)}`,
      props.accessToken
    );
    setVisits(rows);
  }

  async function ensureBonusHistoryLoaded() {
    if (bonusHistory) return;
    const rows = await requestJson<BonusHistoryRow[]>(
      `/bonuses/history?client_id=${encodeURIComponent(props.session.userId)}`,
      props.accessToken
    );
    setBonusHistory(rows);
  }

  async function ensureBranchesLoaded() {
    if (branches) return;
    const rows = await requestJson<BranchRow[]>("/branches", props.accessToken);
    setBranches(rows.filter((branch) => branch.isActive));
  }

  async function ensureChatLoaded() {
    if (conversations && activeConversationId) return;
    setChatLoading(true);
    setChatError(null);
    try {
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
      setChatError(error instanceof Error ? error.message : "Не удалось загрузить чат");
    } finally {
      setChatLoading(false);
    }
  }

  async function openConversation(conversationId: string) {
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
      setChatError(error instanceof Error ? error.message : "Не удалось загрузить сообщения");
    } finally {
      setChatLoading(false);
    }
  }

  async function sendMessage() {
    if (!activeConversationId || !messageText.trim()) return;
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
            text: messageText.trim()
          })
        }
      );
      setMessageText("");
      await openConversation(activeConversationId);
    } catch (error) {
      setChatError(error instanceof Error ? error.message : "Не удалось отправить сообщение");
    } finally {
      setSubmittingMessage(false);
    }
  }

  function openLink(url: string) {
    void Linking.openURL(url);
  }

  function openBranchRoute(branch: BranchRow) {
    const label = encodeURIComponent(branch.name);
    const url = `https://maps.apple.com/?ll=${branch.lat},${branch.lng}&q=${label}`;
    void Linking.openURL(url);
  }

  function renderHome() {
    if (loadingHome) {
      return <HomeSkeleton />;
    }

    if (homeError) {
      return <EmptyState title="Экран недоступен" description={homeError} />;
    }

    return (
      <>
        <GlassCard elevated animated style={styles.brandCard}>
          <Text style={styles.brandLogo}>CRS</Text>
          <View style={styles.brandMeta}>
            <Text style={styles.brandTitle}>Centr Radius Service</Text>
            <Text style={styles.brandSubtitle}>Премиальный сервис для ежедневного сопровождения автомобиля</Text>
          </View>
        </GlassCard>

        <View style={styles.contactRow}>
          {CONTACT_LINKS.map((item) => (
            <Pressable
              key={item.key}
              onPress={() => openLink(item.url)}
              style={({ pressed }) => [styles.contactIcon, pressed && styles.pressedSurface]}
            >
              <Text style={styles.contactIconLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        <GlassCard elevated animated style={styles.actionGridCard}>
          <View style={styles.actionGrid}>
            <Pressable
              style={({ pressed }) => [styles.actionTile, pressed && styles.pressedTile]}
              onPress={() => void ensureBranchesLoaded().then(() => setScreen("booking"))}
            >
              <Text style={styles.actionTileLabel}>Записаться</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.actionTile, pressed && styles.pressedTile]}
              onPress={() => void ensureVisitsLoaded().then(() => setScreen("visits"))}
            >
              <Text style={styles.actionTileLabel}>История посещений</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.actionTile, pressed && styles.pressedTile]}
              onPress={() => void ensureBonusHistoryLoaded().then(() => setScreen("bonus-history"))}
            >
              <Text style={styles.actionTileLabel}>История начислений</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.actionTile, pressed && styles.pressedTile]}
              onPress={() => void ensureBonusHistoryLoaded().then(() => setScreen("cashback"))}
            >
              <Text style={styles.actionTileLabel}>Система кешбека</Text>
            </Pressable>
          </View>
        </GlassCard>

        <GlassCard elevated animated style={styles.heroCard}>
          <Image source={HERO_IMAGE} resizeMode="cover" style={styles.heroImage} />
        </GlassCard>

        <Pressable
          style={({ pressed }) => [styles.chatCta, pressed && styles.pressedCta]}
          onPress={() => {
            void ensureChatLoaded();
            setScreen("chat");
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
            <Text style={styles.userName}>{clientName}</Text>
            <Text style={styles.userEmail}>{me?.email ?? ""}</Text>
          </View>
        </GlassCard>
      </>
    );
  }

  function renderVisits() {
    return (
      <>
        <ScreenHeader title="История посещений" onBack={() => setScreen("home")} />
        {!visits?.length ? (
          <EmptyState title="Пусто" description="Как только появятся визиты, они отобразятся здесь." />
        ) : (
          visits.map((visit) => (
            <GlassCard key={visit.id} elevated style={styles.listCard}>
              <Text style={styles.listTitle}>{new Date(visit.visitDate).toLocaleDateString("ru-RU")}</Text>
              <Text style={styles.listSubtitle}>{visit.branchName || "Филиал автосервиса"}</Text>
              <Text style={styles.listValue}>
                {typeof visit.finalAmount === "number" ? `${visit.finalAmount.toFixed(2)} ₽` : "Сумма уточняется"}
              </Text>
              {visit.comment ? <Text style={styles.listHint}>{visit.comment}</Text> : null}
            </GlassCard>
          ))
        )}
      </>
    );
  }

  function renderBonusHistory() {
    return (
      <>
        <ScreenHeader title="История начислений" onBack={() => setScreen("home")} />
        {!bonusHistory?.length ? (
          <EmptyState title="Пусто" description="История бонусов появится после первой операции." />
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
        <ScreenHeader title="Система кешбека" onBack={() => setScreen("home")} />
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
        <ScreenHeader title="Записаться" onBack={() => setScreen("home")} />
        {!branches?.length ? (
          <EmptyState title="Нет доступных филиалов" description="Когда филиалы станут доступны, они появятся здесь." />
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
                  <AppButton label="Позвонить" variant="secondary" onPress={() => openLink(`tel:${branch.phone}`)} style={styles.cardButton} />
                ) : null}
                <AppButton
                  label="Написать в чат"
                  variant="secondary"
                  onPress={() => {
                    void ensureChatLoaded();
                    setScreen("chat");
                  }}
                  style={styles.cardButton}
                />
                <AppButton label="Маршрут" onPress={() => openBranchRoute(branch)} style={styles.cardButton} />
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
        <ScreenHeader title="Чат" onBack={() => setScreen("home")} />
        {chatLoading ? (
          <ChatSkeleton />
        ) : chatError ? (
          <EmptyState title="Чат недоступен" description={chatError} />
        ) : !conversations?.length || !activeConversationId ? (
          <EmptyState title="Диалогов пока нет" description="Как только администратор откроет диалог, он появится здесь." />
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.conversationTabs}>
              {conversations.map((conversation) => (
                <Pressable
                  key={conversation.id}
                  onPress={() => void openConversation(conversation.id)}
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
              <ScrollView ref={chatScrollRef} contentContainerStyle={styles.messagesList}>
                {(messages ?? []).map((message) => {
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
                  placeholder="Напишите сообщение"
                  placeholderTextColor="#94A3B8"
                  multiline
                  style={styles.chatInput}
                />
                {messageText.trim().length > 0 ? <Text style={styles.typingFeel}>Печатаем сообщение...</Text> : null}
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
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <MotionScreen motionKey={screen}>
          {screen === "home" && renderHome()}
          {screen === "visits" && renderVisits()}
          {screen === "bonus-history" && renderBonusHistory()}
          {screen === "cashback" && renderCashback()}
          {screen === "booking" && renderBooking()}
          {screen === "chat" && renderChat()}
        </MotionScreen>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#E9EDF5"
  },
  content: {
    padding: 18,
    gap: 16
  },
  skeletonWrap: {
    gap: 16
  },
  skeletonBlock: {
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.78)"
  },
  brandSkeletonLogo: {
    width: 74,
    height: 58,
    borderRadius: 20
  },
  skeletonTitleLine: {
    height: 20,
    width: "74%",
    borderRadius: 10
  },
  skeletonSubtitleLine: {
    height: 14,
    width: "92%",
    borderRadius: 10,
    marginTop: 8
  },
  contactSkeleton: {
    width: 54,
    height: 54,
    borderRadius: 18
  },
  actionSkeleton: {
    width: "48%",
    minHeight: 78,
    borderRadius: 18
  },
  heroSkeleton: {
    width: "100%",
    height: 220,
    borderRadius: 0
  },
  chatSkeleton: {
    minHeight: 114,
    borderRadius: 22
  },
  bonusCircleSkeleton: {
    width: 132,
    height: 132,
    borderRadius: 66
  },
  bonusNameSkeleton: {
    height: 30,
    width: "92%",
    borderRadius: 14
  },
  bonusMailSkeleton: {
    height: 16,
    width: "70%",
    borderRadius: 10
  },
  messageSkeletonLeft: {
    width: "58%",
    height: 64,
    borderRadius: 18
  },
  messageSkeletonRight: {
    width: "46%",
    height: 54,
    borderRadius: 18,
    alignSelf: "flex-end"
  },
  messageSkeletonLeftWide: {
    width: "68%",
    height: 62,
    borderRadius: 18
  },
  chatInputSkeleton: {
    width: "100%",
    minHeight: 92,
    borderRadius: 20
  },
  chatButtonSkeleton: {
    width: "100%",
    height: 52,
    borderRadius: 16
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
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "rgba(255,255,255,0.82)"
  },
  brandLogo: {
    fontSize: 40,
    fontWeight: "800",
    color: "#FF6B1A",
    letterSpacing: 1
  },
  brandMeta: {
    flex: 1
  },
  brandTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: mobileTokens.color.textPrimary
  },
  brandSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: mobileTokens.color.textSecondary
  },
  contactRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10
  },
  contactIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: "#161616",
    alignItems: "center",
    justifyContent: "center",
    ...mobileTokens.shadow.soft
  },
  pressedSurface: {
    transform: [{ scale: 0.97 }],
    opacity: 0.92
  },
  contactIconLabel: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800"
  },
  actionGridCard: {
    padding: 14
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  actionTile: {
    width: "48%",
    minHeight: 78,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    ...mobileTokens.shadow.soft
  },
  pressedTile: {
    transform: [{ scale: 0.97 }],
    opacity: 0.96
  },
  actionTileLabel: {
    textAlign: "center",
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "700",
    color: "#111827"
  },
  heroCard: {
    overflow: "hidden",
    backgroundColor: "#D9DDE4",
    shadowOpacity: 0.14
  },
  heroImage: {
    width: "100%",
    height: 220
  },
  chatCta: {
    minHeight: 114,
    borderRadius: 22,
    backgroundColor: "#1F1F1F",
    justifyContent: "center",
    paddingHorizontal: 24,
    ...mobileTokens.shadow.glass
  },
  pressedCta: {
    transform: [{ scale: 0.985 }],
    opacity: 0.97
  },
  chatCtaLabel: {
    color: "#FFFFFF",
    fontSize: 44,
    fontWeight: "800",
    letterSpacing: 1
  },
  chatCtaHint: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 14,
    marginTop: 4
  },
  bonusCard: {
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    backgroundColor: "rgba(255,255,255,0.88)"
  },
  bonusCircle: {
    width: 132,
    height: 132,
    borderRadius: 66,
    borderWidth: 5,
    borderColor: "#101010",
    alignItems: "center",
    justifyContent: "center"
  },
  bonusValue: {
    fontSize: 38,
    lineHeight: 40,
    fontWeight: "900",
    color: "#101010"
  },
  bonusCaption: {
    marginTop: 4,
    fontSize: 17,
    fontWeight: "700",
    color: "#101010",
    textTransform: "uppercase"
  },
  bonusMeta: {
    flex: 1,
    gap: 8
  },
  userName: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "300",
    color: "#0F172A",
    textTransform: "uppercase"
  },
  userEmail: {
    fontSize: 14,
    color: mobileTokens.color.textSecondary
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
    padding: 18,
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
  cashbackCard: {
    padding: 22,
    gap: 12
  },
  cashbackTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: mobileTokens.color.textPrimary
  },
  cashbackValue: {
    fontSize: 42,
    fontWeight: "900",
    color: "#FF6B1A"
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
    backgroundColor: "rgba(255,255,255,0.78)",
    borderWidth: 1,
    borderColor: mobileTokens.color.borderSoft
  },
  pressedTab: {
    transform: [{ scale: 0.98 }]
  },
  conversationTabActive: {
    backgroundColor: "#111827"
  },
  conversationTabLabel: {
    color: mobileTokens.color.textPrimary,
    fontWeight: "700"
  },
  conversationTabLabelActive: {
    color: "#FFFFFF"
  },
  chatPanel: {
    padding: 16,
    minHeight: 520
  },
  messagesList: {
    gap: 10,
    paddingBottom: 18
  },
  messageBubble: {
    maxWidth: "82%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  messageMine: {
    alignSelf: "flex-end",
    backgroundColor: mobileTokens.color.primaryAlt
  },
  messageOther: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.92)"
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
    color: mobileTokens.color.textPrimary
  },
  messageTextMine: {
    color: "#FFFFFF"
  },
  messageMeta: {
    marginTop: 6,
    fontSize: 11,
    color: mobileTokens.color.textSecondary
  },
  messageMetaMine: {
    color: "rgba(255,255,255,0.72)"
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
    borderRadius: 20,
    borderWidth: 1,
    borderColor: mobileTokens.color.borderSoft,
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: mobileTokens.color.textPrimary,
    textAlignVertical: "top"
  },
  sendButton: {
    minHeight: 52
  }
});
