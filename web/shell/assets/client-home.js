import { guard, bindLogout, startSessionAutoRefresh, authFetchJson } from "/assets/app.js";
import { renderClientHomeApp } from "/assets/client-home-render.js";
import { friendlyErrorMessage, randomId } from "/assets/client-home-utils.js";

const session = guard(["client"]);

if (session) {
  startSessionAutoRefresh();

  const app = document.getElementById("app");
  const CONTACT_LINKS = [
    { key: "vk", label: "ВК", url: "https://vk.com" },
    { key: "ig", label: "Instagram", url: "https://instagram.com" },
    { key: "tg", label: "Telegram", url: "https://t.me" },
    { key: "mail", label: "Email", url: "mailto:info@centr-radius-service.ru" },
    { key: "phone", label: "Телефон", url: "tel:+78000000000" }
  ];

  let screen = "home";
  let me = null;
  let bonusBalance = 0;
  let homeLoading = true;
  let homeError = null;
  let visits = null;
  let visitsLoading = false;
  let bonusHistory = null;
  let bonusHistoryLoading = false;
  let branches = null;
  let branchesLoading = false;
  let conversations = null;
  let messages = null;
  let activeConversationId = null;
  let chatLoading = false;
  let chatError = null;
  let sendingMessage = false;
  let messageDraft = "";
  let transitionDirection = "forward";
  let toast = null;
  const SCREEN_DEPTH = {
    home: 0,
    booking: 1,
    visits: 1,
    "bonus-history": 1,
    cashback: 1,
    chat: 1
  };

  function showToast(type, message) {
    toast = { type, message };
    renderApp();
    window.clearTimeout(showToast._timer);
    showToast._timer = window.setTimeout(() => {
      toast = null;
      renderApp();
    }, 2200);
  }

  function goToScreen(nextScreen) {
    transitionDirection = (SCREEN_DEPTH[nextScreen] ?? 0) >= (SCREEN_DEPTH[screen] ?? 0) ? "forward" : "backward";
    screen = nextScreen;
    renderApp();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderApp() {
    renderClientHomeApp({
      app,
      session,
      screen,
      me,
      bonusBalance,
      homeLoading,
      homeError,
      visits,
      visitsLoading,
      bonusHistory,
      bonusHistoryLoading,
      branches,
      branchesLoading,
      conversations,
      messages,
      activeConversationId,
      chatLoading,
      chatError,
      sendingMessage,
      messageDraft,
      transitionDirection,
      toast,
      contactLinks: CONTACT_LINKS
    });

    bindLogout("logout-btn");
    app.querySelector('[data-action="go-home"]')?.addEventListener("click", () => {
      goToScreen("home");
    });

    app.querySelectorAll('[data-action="open-booking"]').forEach((element) => {
      element.addEventListener("click", async () => {
        await ensureBranchesLoaded();
        goToScreen("booking");
      });
    });

    app.querySelectorAll('[data-action="open-visits"]').forEach((element) => {
      element.addEventListener("click", async () => {
        await ensureVisitsLoaded();
        goToScreen("visits");
      });
    });

    app.querySelectorAll('[data-action="open-bonus-history"]').forEach((element) => {
      element.addEventListener("click", async () => {
        await ensureBonusHistoryLoaded();
        goToScreen("bonus-history");
      });
    });

    app.querySelectorAll('[data-action="open-cashback"]').forEach((element) => {
      element.addEventListener("click", async () => {
        await ensureBonusHistoryLoaded();
        goToScreen("cashback");
      });
    });

    app.querySelectorAll('[data-action="open-chat"]').forEach((element) => {
      element.addEventListener("click", async () => {
        await ensureChatLoaded();
        goToScreen("chat");
      });
    });

    app.querySelectorAll("[data-conversation-id]").forEach((element) => {
      element.addEventListener("click", async () => {
        const conversationId = element.getAttribute("data-conversation-id");
        if (!conversationId || conversationId === activeConversationId) return;
        await openConversation(conversationId);
        renderApp();
      });
    });

    const sendButton = document.getElementById("chat-send-btn");
    const messageInput = document.getElementById("chat-message-input");
    const messagesContainer = document.getElementById("client-chat-messages");
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    if (sendButton && messageInput) {
      sendButton.addEventListener("click", async () => {
        await sendMessage();
      });
      messageInput.addEventListener("input", () => {
        messageDraft = messageInput.value;
        const feel = document.querySelector(".client-chat-feel");
        if (feel) {
          feel.textContent = messageDraft.trim().length > 0 ? "Печатаем сообщение..." : "";
        }
      });
      messageInput.addEventListener("keydown", async (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          await sendMessage();
        }
      });
    }
  }

  async function loadHome() {
    homeLoading = true;
    homeError = null;
    renderApp();
    try {
      const [mePayload, bonusPayload] = await Promise.all([
        authFetchJson("/users/me"),
        authFetchJson(`/bonuses/balance?client_id=${encodeURIComponent(session.userId)}`)
      ]);
      me = mePayload;
      bonusBalance = typeof bonusPayload.balance === "number" ? bonusPayload.balance : 0;
    } catch (error) {
      homeError = friendlyErrorMessage(error, "Не удалось открыть главный экран. Попробуйте ещё раз чуть позже.");
      showToast("error", homeError);
    } finally {
      homeLoading = false;
      renderApp();
    }
  }

  async function ensureVisitsLoaded() {
    if (visits || visitsLoading) return;
    visitsLoading = true;
    renderApp();
    try {
      visits = await authFetchJson(`/visits?clientId=${encodeURIComponent(session.userId)}`);
    } catch (error) {
      visits = [];
      const message = friendlyErrorMessage(error, "Не удалось загрузить визиты. Попробуйте ещё раз чуть позже.");
      homeError = homeError || message;
      showToast("error", message);
    } finally {
      visitsLoading = false;
    }
  }

  async function ensureBonusHistoryLoaded() {
    if (bonusHistory || bonusHistoryLoading) return;
    bonusHistoryLoading = true;
    renderApp();
    try {
      bonusHistory = await authFetchJson(`/bonuses/history?client_id=${encodeURIComponent(session.userId)}`);
    } catch (error) {
      bonusHistory = [];
      const message = friendlyErrorMessage(error, "Не удалось загрузить историю бонусов. Попробуйте ещё раз чуть позже.");
      homeError = homeError || message;
      showToast("error", message);
    } finally {
      bonusHistoryLoading = false;
    }
  }

  async function ensureBranchesLoaded() {
    if (branches || branchesLoading) return;
    branchesLoading = true;
    renderApp();
    try {
      const payload = await authFetchJson("/branches");
      branches = Array.isArray(payload) ? payload.filter((branch) => branch.isActive !== false) : [];
    } catch (error) {
      branches = [];
      const message = friendlyErrorMessage(error, "Не удалось загрузить филиалы. Попробуйте ещё раз чуть позже.");
      homeError = homeError || message;
      showToast("error", message);
    } finally {
      branchesLoading = false;
    }
  }

  async function ensureChatLoaded() {
    if (conversations || chatLoading) return;
    chatLoading = true;
    chatError = null;
    renderApp();
    try {
      conversations = await authFetchJson("/chat/conversations");
      if (conversations.length > 0) {
        await openConversation(conversations[0].id);
      } else {
        activeConversationId = null;
        messages = [];
      }
    } catch (error) {
      chatError = friendlyErrorMessage(error, "Не удалось открыть чат. Попробуйте ещё раз чуть позже.");
      showToast("error", chatError);
    } finally {
      chatLoading = false;
    }
  }

  async function openConversation(conversationId) {
    activeConversationId = conversationId;
    chatLoading = true;
    chatError = null;
    renderApp();
    try {
      messages = await authFetchJson(`/chat/conversations/${encodeURIComponent(conversationId)}/messages`);
    } catch (error) {
      chatError = friendlyErrorMessage(error, "Не удалось открыть диалог. Попробуйте ещё раз чуть позже.");
      showToast("error", chatError);
    } finally {
      chatLoading = false;
    }
  }

  async function refreshConversations() {
    conversations = await authFetchJson("/chat/conversations");
    if (!activeConversationId && conversations.length > 0) {
      activeConversationId = conversations[0].id;
    }
  }

  async function sendMessage() {
    const text = messageDraft.trim();
    if (!text || !activeConversationId || sendingMessage) return;
    sendingMessage = true;
    renderApp();
    try {
      await authFetchJson(`/chat/conversations/${encodeURIComponent(activeConversationId)}/messages`, {
        method: "POST",
        body: {
          clientMessageId: randomId(),
          text
        }
      });
      messageDraft = "";
      showToast("success", "Сообщение отправлено");
      await refreshConversations();
      await openConversation(activeConversationId);
    } catch (error) {
      chatError = friendlyErrorMessage(error, "Не удалось отправить сообщение. Попробуйте ещё раз чуть позже.");
      showToast("error", chatError);
    } finally {
      sendingMessage = false;
      renderApp();
    }
  }

  renderApp();
  void loadHome();
}
