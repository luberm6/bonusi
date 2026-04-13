import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { mobileEnv } from "../../../shared/config/mobile-env";
import type { AuthSession } from "../../../app/navigation/role-navigation-resolver";
import type { 
  UserMe, 
  BonusBalance, 
  VisitRow, 
  BonusHistoryRow, 
  BranchRow, 
  ConversationRow, 
  MessageRow 
} from "./types";

type ToastState = { type: "success" | "error"; message: string } | null;

interface ClientDataContextValues {
  session: AuthSession;
  accessToken: string;
  onLogout: () => void;
  me: UserMe | null;
  bonusBalance: number;
  visits: VisitRow[] | null;
  visitsLoading: boolean;
  bonusHistory: BonusHistoryRow[] | null;
  bonusHistoryLoading: boolean;
  branches: BranchRow[] | null;
  branchesLoading: boolean;
  conversations: ConversationRow[] | null;
  activeConversationId: string | null;
  messages: MessageRow[] | null;
  chatLoading: boolean;
  toast: ToastState;
  
  ensureVisitsLoaded: () => Promise<void>;
  ensureBonusHistoryLoaded: () => Promise<void>;
  ensureBranchesLoaded: () => Promise<void>;
  ensureChatLoaded: () => Promise<void>;
  openConversation: (id: string) => Promise<void>;
  sendMessage: (text: string) => Promise<boolean>;
  presentToast: (type: "success" | "error", message: string) => void;
}

const ClientDataContext = createContext<ClientDataContextValues | null>(null);

export function useClientData() {
  const ctx = useContext(ClientDataContext);
  if (!ctx) throw new Error("useClientData must be used inside ClientDataProvider");
  return ctx;
}

// Утилита для запросов
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
  const json = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(json.message || json.error || "Ошибка запроса");
  }
  return json as T;
}

export function ClientDataProvider(props: {
  session: AuthSession;
  accessToken: string;
  onLogout: () => void;
  children: ReactNode;
}) {
  const [me, setMe] = useState<UserMe | null>(null);
  const [bonusBalance, setBonusBalance] = useState<number>(0);
  const [visits, setVisits] = useState<VisitRow[] | null>(null);
  const [visitsLoading, setVisitsLoading] = useState(false);
  const [bonusHistory, setBonusHistory] = useState<BonusHistoryRow[] | null>(null);
  const [bonusHistoryLoading, setBonusHistoryLoading] = useState(false);
  const [branches, setBranches] = useState<BranchRow[] | null>(null);
  const [branchesLoading, setBranchesLoading] = useState(false);
  
  const [conversations, setConversations] = useState<ConversationRow[] | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[] | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  
  const [toast, setToast] = useState<ToastState>(null);

  const presentToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 2500);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [meData, balanceData] = await Promise.all([
          requestJson<UserMe>("/users/me", props.accessToken),
          requestJson<{balance: number}>(`/bonuses/balance?client_id=${encodeURIComponent(props.session.userId)}`, props.accessToken)
        ]);
        if (!mounted) return;
        setMe(meData);
        setBonusBalance(Number(balanceData.balance ?? 0));
      } catch (err) {
        console.warn(err);
      }
    })();
    return () => { mounted = false; };
  }, [props.accessToken, props.session.userId]);

  const ensureVisitsLoaded = useCallback(async () => {
    if (visits) return;
    setVisitsLoading(true);
    try {
      const rows = await requestJson<VisitRow[]>(
        `/clients/${encodeURIComponent(props.session.userId)}/visits`,
        props.accessToken
      );
      setVisits(rows);
    } catch {
      presentToast("error", "Не удалось загрузить посещения");
    } finally {
      setVisitsLoading(false);
    }
  }, [visits, props.session.userId, props.accessToken, presentToast]);

  const ensureBonusHistoryLoaded = useCallback(async () => {
    if (bonusHistory) return;
    setBonusHistoryLoading(true);
    try {
      const rows = await requestJson<BonusHistoryRow[]>(
        `/bonuses/history?client_id=${encodeURIComponent(props.session.userId)}`,
        props.accessToken
      );
      setBonusHistory(rows);
    } catch {
      presentToast("error", "Не удалось загрузить историю бонусов");
    } finally {
      setBonusHistoryLoading(false);
    }
  }, [bonusHistory, props.session.userId, props.accessToken, presentToast]);

  const ensureBranchesLoaded = useCallback(async () => {
    if (branches) return;
    setBranchesLoading(true);
    try {
      const rows = await requestJson<BranchRow[]>("/branches", props.accessToken);
      setBranches(rows.filter((b) => b.isActive));
    } catch {
      presentToast("error", "Не удалось загрузить филиалы");
    } finally {
      setBranchesLoading(false);
    }
  }, [branches, props.accessToken, presentToast]);

  const ensureChatLoaded = useCallback(async () => {
    if (conversations && activeConversationId) return;
    setChatLoading(true);
    try {
      await requestJson("/chat/conversations/ensure", props.accessToken, { method: "POST", body: JSON.stringify({}) });
      const convs = await requestJson<ConversationRow[]>("/chat/conversations", props.accessToken);
      setConversations(convs);
      
      const firstId = convs[0]?.id ?? null;
      setActiveConversationId(firstId);
      if (firstId) {
        const rows = await requestJson<MessageRow[]>(`/chat/conversations/${encodeURIComponent(firstId)}/messages`, props.accessToken);
        setMessages(rows);
      } else {
        setMessages([]);
      }
    } catch {
      presentToast("error", "Чат недоступен");
    } finally {
      setChatLoading(false);
    }
  }, [conversations, activeConversationId, props.accessToken, presentToast]);

  const openConversation = useCallback(async (id: string) => {
    setActiveConversationId(id);
    setChatLoading(true);
    try {
      const rows = await requestJson<MessageRow[]>(`/chat/conversations/${encodeURIComponent(id)}/messages`, props.accessToken);
      setMessages(rows);
    } catch {
      presentToast("error", "Не удалось открыть диалог");
    } finally {
      setChatLoading(false);
    }
  }, [props.accessToken, presentToast]);

  const sendMessage = useCallback(async (text: string) => {
    if (!activeConversationId) return false;
    try {
      await requestJson(`/chat/conversations/${encodeURIComponent(activeConversationId)}/messages`, props.accessToken, {
        method: "POST",
        body: JSON.stringify({
          clientMessageId: Date.now().toString(),
          text
        })
      });
      // Обновляем список локально
      const rows = await requestJson<MessageRow[]>(`/chat/conversations/${encodeURIComponent(activeConversationId)}/messages`, props.accessToken);
      setMessages(rows);
      return true;
    } catch {
      presentToast("error", "Сообщение не отправлено");
      return false;
    }
  }, [activeConversationId, props.accessToken, presentToast]);

  // Polling чата (оптимизированный)
  useEffect(() => {
    if (!activeConversationId) return;
    const timer = setInterval(async () => {
      try {
        const rows = await requestJson<MessageRow[]>(`/chat/conversations/${encodeURIComponent(activeConversationId)}/messages`, props.accessToken);
        setMessages(prev => {
           if (!prev || prev.length !== rows.length) return rows;
           if (rows.length > 0 && (prev[prev.length-1].id !== rows[rows.length-1].id || prev[prev.length-1].readAt !== rows[rows.length-1].readAt)) {
             return rows;
           }
           return prev;
        });
      } catch {}
    }, 5000);
    return () => clearInterval(timer);
  }, [activeConversationId, props.accessToken]);

  return (
    <ClientDataContext.Provider value={{
      session: props.session,
      accessToken: props.accessToken,
      onLogout: props.onLogout,
      me, bonusBalance,
      visits, visitsLoading,
      bonusHistory, bonusHistoryLoading,
      branches, branchesLoading,
      conversations, activeConversationId, messages, chatLoading,
      toast,
      ensureVisitsLoaded, ensureBonusHistoryLoaded, ensureBranchesLoaded, ensureChatLoaded,
      openConversation, sendMessage, presentToast
    }}>
      {props.children}
    </ClientDataContext.Provider>
  );
}
