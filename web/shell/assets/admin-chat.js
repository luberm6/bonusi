import { authFetchJson } from "/assets/app.js";
import {
  formatWorkspaceError,
  initAdminWorkspace,
  renderWorkspaceState
} from "/assets/admin-workspace.js";

const session = initAdminWorkspace();

if (session) {
  const chatState = document.getElementById("chat-state");
  const conversationList = document.getElementById("conv-list");
  const chatPanel = document.getElementById("chat-panel");
  const toast = document.getElementById("toast");

  let toastTimer = null;
  let activeConversationId = null;

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
    return new Date(iso).toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit"
    });
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
        "Когда появится первое обращение, оно отобразится в рабочем списке.",
        "Чат"
      );
      conversationList.innerHTML =
        '<div class="workspace-panel workspace-panel-compact"><p class="workspace-empty">Диалогов пока нет.</p></div>';
      chatPanel.innerHTML =
        '<div id="no-conv" class="workspace-panel workspace-panel-compact">Диалогов пока нет. Когда появится первый, он отобразится здесь.</div>';
      return;
    }

    renderWorkspaceState(
      chatState,
      "success",
      "Диалоги синхронизированы",
      "Список обращений получен из backend и готов к работе.",
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
      item.innerHTML = `
        <div class="workspace-chat-name">${conversation.participantId || "Клиент"}${unreadBadge}</div>
        <div class="workspace-chat-preview">${renderConversationPreview(conversation)}</div>
      `;
      item.addEventListener("click", () => {
        void openConversation(conversation, conversations);
      });
      conversationList.appendChild(item);
    }
  };

  const renderMessages = (messages) => {
    chatPanel.innerHTML = `
      <div class="workspace-chat-board">
        <div class="workspace-chat-messages" id="msgs"></div>
        <div class="workspace-chat-compose">
          <textarea id="msg-text" class="input" rows="2" placeholder="Введите сообщение..."></textarea>
          <button class="btn btn-primary" id="send-btn" style="align-self:flex-end">Отправить</button>
        </div>
      </div>
    `;

    const messagesElement = document.getElementById("msgs");
    if (!messages.length) {
      messagesElement.innerHTML =
        '<p class="workspace-empty">Сообщений пока нет. Начните диалог первым.</p>';
      return;
    }

    for (const message of messages) {
      const mine = message.senderId === session.userId;
      const node = document.createElement("div");
      node.className = `workspace-msg ${mine ? "mine" : "other"}`;
      node.innerHTML = `${message.text || ""}<div class="workspace-msg-meta">${formatTime(message.createdAt)}</div>`;
      messagesElement.appendChild(node);
    }
    messagesElement.scrollTop = messagesElement.scrollHeight;
  };

  const bindMessageComposer = (conversationId) => {
    const sendButton = document.getElementById("send-btn");
    const textInput = document.getElementById("msg-text");

    sendButton.addEventListener("click", async () => {
      const text = textInput.value.trim();
      if (!text) return;

      textInput.value = "";
      sendButton.disabled = true;
      try {
        await authFetchJson(`/chat/conversations/${conversationId}/messages`, {
          method: "POST",
          body: { clientMessageId: crypto.randomUUID(), text }
        });
        showToast("Сообщение отправлено");
        await loadConversations(conversationId);
      } catch (error) {
        showToast(formatWorkspaceError(error, "Не удалось отправить сообщение"), "error");
      } finally {
        sendButton.disabled = false;
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
      '<div class="workspace-panel workspace-panel-compact"><p class="workspace-empty">Открываем диалог...</p></div>';

    try {
      const messages = await authFetchJson(`/chat/conversations/${conversationId}/messages`);
      renderMessages(messages);
      bindMessageComposer(conversationId);
    } catch (error) {
      chatPanel.innerHTML = `<div class="workspace-panel workspace-panel-compact"><p class="error">${formatWorkspaceError(error, "Не удалось открыть диалог")}</p></div>`;
      showToast(formatWorkspaceError(error, "Не удалось открыть диалог"), "error");
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
      "Синхронизируем обращения и последние сообщения.",
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
      const message = formatWorkspaceError(error, "Не удалось загрузить диалоги");
      renderWorkspaceState(
        chatState,
        "error",
        "Не удалось загрузить диалоги",
        message,
        "Ошибка"
      );
      conversationList.innerHTML =
        '<div class="workspace-panel workspace-panel-compact"><p class="workspace-empty">Не удалось загрузить диалоги.</p></div>';
      chatPanel.innerHTML =
        '<div id="no-conv" class="workspace-panel workspace-panel-compact">Не удалось открыть диалог.</div>';
      showToast(message, "error");
    }
  };

  void loadConversations();
}
