import { authFetchJson } from "/assets/app.js";
import {
  formatWorkspaceError,
  initAdminWorkspace,
  renderWorkspaceState
} from "/assets/admin-workspace.js";

const session = initAdminWorkspace();

if (session) {
  // CSS для fade-in новых сообщений и word-wrap длинных
  const styleEl = document.createElement("style");
  styleEl.textContent = `
    @keyframes msgFadeIn { from { opacity:0; transform:translateY(5px); } to { opacity:1; transform:none; } }
    .workspace-msg.msg-new { animation: msgFadeIn 180ms ease-out both; }
    .workspace-msg { white-space: pre-wrap; word-break: break-word; }
  `;
  document.head.appendChild(styleEl);

  const chatState = document.getElementById("chat-state");
  const conversationList = document.getElementById("conv-list");
  const chatPanel = document.getElementById("chat-panel");
  const toast = document.getElementById("toast");

  let toastTimer = null;
  let activeConversationId = null;
  let pollInterval = null;
  let lastMessageIds = "";
  let prevMessageIds = new Set();

  // Тихое обновление сообщений — не трогает поле ввода, не дёргает скролл
  const renderMessagesOnly = (messages) => {
    const msgs = document.getElementById("msgs");
    if (!msgs) return;
    const newIds = messages.map((m) => m.id).join(",");
    if (newIds === lastMessageIds) return; // ничего нового — не перерисовываем
    lastMessageIds = newIds;

    const atBottom = msgs.scrollHeight - msgs.scrollTop - msgs.clientHeight < 80;

    msgs.innerHTML = "";
    if (!messages.length) {
      msgs.innerHTML = '<p class="workspace-empty">Сообщений пока нет. Начните диалог первым.</p>';
      prevMessageIds = new Set();
      return;
    }
    for (const message of messages) {
      const mine = message.senderId === session.userId;
      const isNew = !prevMessageIds.has(message.id);
      const node = document.createElement("div");
      node.className = `workspace-msg ${mine ? "mine" : "other"}${isNew ? " msg-new" : ""}`;
      node.innerHTML = `${message.text || ""}<div class="workspace-msg-meta">${formatTime(message.createdAt)}</div>`;
      msgs.appendChild(node);
    }
    prevMessageIds = new Set(messages.map((m) => m.id));
    if (atBottom) {
      msgs.scrollTop = msgs.scrollHeight;
    }
  };

  const startPolling = (conversationId) => {
    stopPolling();
    pollInterval = window.setInterval(async () => {
      try {
        const msgs = await authFetchJson(`/chat/conversations/${conversationId}/messages`);
        renderMessagesOnly(msgs);
      } catch (_) {}
    }, 5000);
  };

  const stopPolling = () => {
    if (pollInterval) { window.clearInterval(pollInterval); pollInterval = null; }
  };

  window.addEventListener("beforeunload", stopPolling);

  // Всегда показываем русский текст — если ошибка выглядит как английская, берём fallback
  const chatErrorText = (error, fallback) => {
    const msg = formatWorkspaceError(error, fallback);
    return /[а-яёА-ЯЁ]/.test(msg) ? msg : fallback;
  };

  const showToast = (text, tone = "success") => {
    toast.textContent = text;
    toast.className = `workspace-toast ${tone} show`;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.className = "workspace-toast";
    }, 2200);
  };

  const formatTime = (iso) => {
    if (!iso) return "";
    const date = new Date(iso);
    if (isNaN(date.getTime())) return "";
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 86400000);
    const time = date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    if (date >= todayStart) return time;
    if (date >= yesterdayStart) return `вчера, ${time}`;
    return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }).replace(".", "") + `, ${time}`;
  };

  const renderConversationPreview = (conversation) => {
    const lastMessage = conversation.lastMessage?.text || "Сообщений пока нет";
    const lastAt = conversation.lastMessage?.createdAt
      ? ` · ${formatTime(conversation.lastMessage.createdAt)}`
      : "";
    return `${lastMessage}${lastAt}`;
  };

  const renderConversationList = (conversations) => {
    conversationList.innerHTML = "";

    if (!conversations.length) {
      renderWorkspaceState(
        chatState,
        "default",
        "Диалогов пока нет",
        "Когда клиент напишет первым, диалог появится здесь автоматически.",
        "Чат"
      );
      conversationList.innerHTML =
        '<div class="workspace-panel workspace-panel-compact"><p class="workspace-empty">Диалогов пока нет.</p></div>';
      chatPanel.innerHTML =
        '<div id="no-conv" class="workspace-panel workspace-panel-compact" style="color:#94a3b8;padding:32px;text-align:center;">Ожидаем первого обращения от клиента.</div>';
      return;
    }

    renderWorkspaceState(
      chatState,
      "success",
      "Чат активен",
      "Новые сообщения обновляются автоматически каждые 5 секунд.",
      "Актуально"
    );

    for (const conversation of conversations) {
      const item = document.createElement("div");
      item.className =
        "workspace-chat-item" + (conversation.id === activeConversationId ? " active" : "");
      item.dataset.id = conversation.id;
      const unreadBadge =
        conversation.unreadCount > 0
          ? `<span class="unread-badge">${conversation.unreadCount}</span>`
          : "";
      const clientLabel = conversation.clientName || conversation.clientEmail || "Клиент";
      item.innerHTML = `
        <div class="workspace-chat-name">${clientLabel}${unreadBadge}</div>
        <div class="workspace-chat-preview">${renderConversationPreview(conversation)}</div>
      `;
      item.addEventListener("click", () => {
        void openConversation(conversation, conversations);
      });
      conversationList.appendChild(item);
    }
  };

  // Полный рендер панели — при первом открытии диалога
  const renderMessages = (messages) => {
    lastMessageIds = ""; // сбрасываем кэш, чтобы renderMessagesOnly всегда отрисовал
    prevMessageIds = new Set(); // при смене диалога все сообщения — "старые", без анимации
    chatPanel.innerHTML = `
      <div class="workspace-chat-board">
        <div class="workspace-chat-messages" id="msgs"></div>
        <div class="workspace-chat-compose">
          <textarea id="msg-text" class="input" rows="2" placeholder="Введите сообщение..."></textarea>
          <button class="btn btn-primary" id="send-btn" style="align-self:flex-end">Отправить</button>
        </div>
      </div>
    `;
    renderMessagesOnly(messages);
    // При первичной загрузке всегда скроллим вниз
    const msgs = document.getElementById("msgs");
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
  };

  const bindMessageComposer = (conversationId) => {
    const sendButton = document.getElementById("send-btn");
    const textInput = document.getElementById("msg-text");

    const syncSendState = () => {
      sendButton.disabled = !textInput.value.trim();
    };
    syncSendState();
    textInput.addEventListener("input", syncSendState);

    sendButton.addEventListener("click", async () => {
      const text = textInput.value.trim();
      if (!text) return;
      const draft = textInput.value;
      textInput.value = "";
      sendButton.disabled = true;
      sendButton.textContent = "Отправка...";
      try {
        await authFetchJson(`/chat/conversations/${conversationId}/messages`, {
          method: "POST",
          body: { clientMessageId: crypto.randomUUID(), text }
        });
        const msgs = await authFetchJson(`/chat/conversations/${conversationId}/messages`);
        lastMessageIds = "";
        renderMessagesOnly(msgs);
        // После отправки всегда скроллим вниз
        const msgsEl = document.getElementById("msgs");
        if (msgsEl) msgsEl.scrollTop = msgsEl.scrollHeight;
        showToast("Сообщение отправлено");
      } catch (error) {
        textInput.value = draft; // возвращаем текст при ошибке
        showToast(chatErrorText(error, "Не удалось отправить сообщение. Попробуйте ещё раз."), "error");
      } finally {
        sendButton.disabled = false;
        sendButton.textContent = "Отправить";
      }
    });

    textInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendButton.click();
      }
    });
  };

  const openConversation = async (conversationOrId, currentList = null) => {
    const conversationId =
      typeof conversationOrId === "string" ? conversationOrId : conversationOrId.id;
    activeConversationId = conversationId;

    document.querySelectorAll(".workspace-chat-item").forEach((item) => {
      item.classList.toggle("active", item.dataset.id === conversationId);
    });

    chatPanel.innerHTML =
      '<div class="workspace-panel workspace-panel-compact"><p class="workspace-empty" style="padding:24px;text-align:center;color:#94a3b8;">Загружаем переписку...</p></div>';

    try {
      const messages = await authFetchJson(`/chat/conversations/${conversationId}/messages`);
      renderMessages(messages);
      bindMessageComposer(conversationId);
      startPolling(conversationId);
    } catch (error) {
      chatPanel.innerHTML = `<div class="workspace-panel workspace-panel-compact"><p class="error" style="padding:24px;">${chatErrorText(error, "Не удалось загрузить переписку. Нажмите на диалог ещё раз.")}</p></div>`;
      showToast(chatErrorText(error, "Не удалось открыть диалог"), "error");
      return;
    }

    if (!currentList) return;
    const conversation = currentList.find((item) => item.id === conversationId);
    if (!conversation) return;
  };

  const loadConversations = async (preferredConversationId = activeConversationId) => {
    renderWorkspaceState(
      chatState,
      "default",
      "Загружаем диалоги",
      "Получаем список обращений из сервера.",
      "Чат"
    );

    try {
      const conversations = await authFetchJson("/chat/conversations");
      renderConversationList(conversations);

      if (!conversations.length) return;

      const nextConversation =
        conversations.find((item) => item.id === preferredConversationId) || conversations[0];
      await openConversation(nextConversation, conversations);
    } catch (error) {
      const message = chatErrorText(error, "Не удалось загрузить диалоги. Обновите страницу.");
      renderWorkspaceState(
        chatState,
        "error",
        "Не удалось загрузить чат",
        message,
        "Ошибка"
      );
      conversationList.innerHTML =
        '<div class="workspace-panel workspace-panel-compact"><p class="workspace-empty">Не удалось загрузить диалоги. Обновите страницу.</p></div>';
      chatPanel.innerHTML =
        '<div id="no-conv" class="workspace-panel workspace-panel-compact" style="color:#94a3b8;padding:32px;text-align:center;">Не удалось открыть диалог. Обновите страницу.</div>';
      showToast(message, "error");
    }
  };

  void loadConversations();
}
