import { authFetchJson, featureFlags, getApiBase } from "/assets/app.js";
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
    let markedRead = false;
    for (const message of messages) {
      const mine = message.senderId === session.userId;
      if (!mine && !message.readAt) {
        authFetchJson(`/chat/messages/${message.id}/read`, { method: "POST" }).catch(() => {});
        message.readAt = new Date().toISOString();
        markedRead = true;
      }
      
      const isNew = !prevMessageIds.has(message.id);
      const node = document.createElement("div");
      node.className = `workspace-msg ${mine ? "mine" : "other"}${isNew ? " msg-new" : ""}`;
      let attachmentsHtml = "";
      if (message.attachments && message.attachments.length > 0) {
        const getFullUrl = (url) => {
          if (!url) return "";
          if (url.startsWith("http") || url.startsWith("data:")) return url;
          const base = getApiBase() || "";
          const cleanBase = base.replace(/\/api\/v1\/?$/, "");
          return cleanBase.replace(/\/+$/, "") + "/" + url.replace(/^\/+/, "");
        };
        attachmentsHtml = message.attachments.map(att => {
          const fullUrl = getFullUrl(att.fileUrl);
          if (att.fileType === "image" || (att.fileType && att.fileType.startsWith("image/"))) {
            return `<div class="msg-attachment" style="margin-top:6px;"><a href="${fullUrl}" target="_blank"><img src="${fullUrl}" style="max-width:200px;max-height:150px;border-radius:6px;display:block;"></a></div>`;
          } else {
            return `<div class="msg-attachment" style="margin-top:6px;"><a href="${fullUrl}" target="_blank" style="color:#00bcd4;text-decoration:none;font-size:12px;display:inline-flex;align-items:center;gap:4px;">📄 ${att.fileName || 'Документ'}</a></div>`;
          }
        }).join("");
      }
      let resolvedText = message.text || message.body || message.content || message.message || message.preview || "";
      if (!resolvedText && (!message.attachments || message.attachments.length === 0)) {
        resolvedText = "[Пустое сообщение]";
      }
      node.innerHTML = `${resolvedText}${attachmentsHtml}<div class="workspace-msg-meta">${formatTime(message.createdAt)}</div>`;
      msgs.appendChild(node);
    }
    prevMessageIds = new Set(messages.map((m) => m.id));
    if (atBottom) {
      msgs.scrollTop = msgs.scrollHeight;
    }
    
    if (markedRead) {
      authFetchJson("/chat/conversations").then((conversations) => {
        renderConversationList(conversations);
      }).catch(() => {});
    }
  };

  const startPolling = (conversationId) => {
    stopPolling();
    pollInterval = window.setInterval(async () => {
      try {
        const [msgs, conversations] = await Promise.all([
          authFetchJson(`/chat/conversations/${conversationId}/messages`),
          authFetchJson("/chat/conversations")
        ]);
        renderMessagesOnly(msgs);
        renderConversationList(conversations);
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
        <div class="workspace-chat-compose" style="flex-direction: column; align-items: stretch;">
          <div id="file-preview-bar" style="display:none;align-items:center;gap:8px;background:rgba(255,255,255,0.05);padding:6px 12px;border-radius:4px;margin-bottom:8px;">
            <span id="file-preview-icon" style="font-size:16px;">📄</span>
            <span id="file-preview-name" style="font-size:12px;color:#fff;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"></span>
            <button id="file-cancel-btn" style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:14px;padding:4px;">✕</button>
          </div>
          <textarea id="msg-text" class="input" rows="2" placeholder="Введите сообщение..."></textarea>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:4px 0;width:100%;">
            <div style="display:flex;align-items:center;gap:8px;">
              <input type="checkbox" id="repair-history-chk" style="width:16px;height:16px;cursor:pointer;accent-color:#00bcd4;">
              <label for="repair-history-chk" style="font-size:12px;color:#94a3b8;cursor:pointer;user-select:none;">
                Сохранить в историю ремонта
              </label>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <input type="file" id="file-input" style="display:none;" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx">
              <button class="btn btn-outline" id="attach-btn" style="background:transparent;border:1px solid #475569;color:#94a3b8;padding:6px 12px;font-size:12px;border-radius:4px;cursor:pointer;display:flex;align-items:center;gap:4px;">
                📎 Прикрепить файл
              </button>
              <button class="btn btn-primary" id="send-btn">Отправить</button>
            </div>
          </div>
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
    const fileInput = document.getElementById("file-input");
    const attachBtn = document.getElementById("attach-btn");
    const filePreviewBar = document.getElementById("file-preview-bar");
    const filePreviewName = document.getElementById("file-preview-name");
    const filePreviewIcon = document.getElementById("file-preview-icon");
    const fileCancelBtn = document.getElementById("file-cancel-btn");
    let selectedFile = null;

    const chatBoard = chatPanel.querySelector(".workspace-chat-board");
    if (chatBoard) {
      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        chatBoard.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
        }, false);
      });

      ['dragenter', 'dragover'].forEach(eventName => {
        chatBoard.addEventListener(eventName, () => {
          chatBoard.style.outline = "2px dashed #00bcd4";
          chatBoard.style.outlineOffset = "-4px";
          chatBoard.style.backgroundColor = "rgba(0, 188, 212, 0.05)";
        }, false);
      });

      ['dragleave', 'drop'].forEach(eventName => {
        chatBoard.addEventListener(eventName, () => {
          chatBoard.style.outline = "";
          chatBoard.style.outlineOffset = "";
          chatBoard.style.backgroundColor = "";
        }, false);
      });

      chatBoard.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const file = dt.files[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
          showToast("Файл слишком большой. Максимальный размер 10 МБ", "error");
          return;
        }

        selectedFile = file;
        filePreviewName.textContent = file.name;
        if (file.type && file.type.startsWith("image/")) {
          filePreviewIcon.textContent = "🖼️";
        } else {
          filePreviewIcon.textContent = "📄";
        }
        filePreviewBar.style.display = "flex";
        syncSendState();
      }, false);
    }

    const readAsBase64 = (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result.split(",")[1];
          resolve(base64);
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
      });
    };

    const syncSendState = () => {
      sendButton.disabled = !textInput.value.trim() && !selectedFile;
    };
    syncSendState();
    textInput.addEventListener("input", syncSendState);

    attachBtn.addEventListener("click", () => {
      fileInput.click();
    });

    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) {
        showToast("Файл слишком большой. Максимальный размер 10 МБ", "error");
        fileInput.value = "";
        return;
      }
      selectedFile = file;
      filePreviewName.textContent = file.name;
      if (file.type && file.type.startsWith("image/")) {
        filePreviewIcon.textContent = "🖼️";
      } else {
        filePreviewIcon.textContent = "📄";
      }
      filePreviewBar.style.display = "flex";
      syncSendState();
    });

    fileCancelBtn.addEventListener("click", () => {
      selectedFile = null;
      fileInput.value = "";
      filePreviewBar.style.display = "none";
      syncSendState();
    });

    sendButton.addEventListener("click", async () => {
      const text = textInput.value.trim();
      if (!text && !selectedFile) return;

      const draftText = textInput.value;
      const draftFile = selectedFile;
      const repairHistoryChk = document.getElementById("repair-history-chk");
      const isRepairHistory = repairHistoryChk ? repairHistoryChk.checked : false;

      textInput.value = "";
      selectedFile = null;
      fileInput.value = "";
      filePreviewBar.style.display = "none";
      if (repairHistoryChk) repairHistoryChk.checked = false;
      sendButton.disabled = true;
      sendButton.textContent = "Отправка...";

      try {
        const messageText = text || (draftFile ? draftFile.name : "");
        const responseData = await authFetchJson(`/chat/conversations/${conversationId}/messages`, {
          method: "POST",
          body: {
            clientMessageId: crypto.randomUUID(),
            text: messageText,
            ...(isRepairHistory && draftFile ? { isRepairHistory: true } : {})
          }
        });

        const messageId = responseData?.message?.id;
        if (draftFile && messageId) {
          const contentBase64 = await readAsBase64(draftFile);
          await authFetchJson("/files/upload", {
            method: "POST",
            body: {
              messageId,
              fileName: draftFile.name,
              fileType: draftFile.type || "application/octet-stream",
              size: draftFile.size,
              contentBase64
            }
          });
        }

        const msgs = await authFetchJson(`/chat/conversations/${conversationId}/messages`);
        lastMessageIds = "";
        renderMessagesOnly(msgs);
        const msgsEl = document.getElementById("msgs");
        if (msgsEl) msgsEl.scrollTop = msgsEl.scrollHeight;
        showToast("Сообщение отправлено");
      } catch (error) {
        textInput.value = draftText;
        selectedFile = draftFile;
        if (draftFile) {
          filePreviewName.textContent = draftFile.name;
          filePreviewIcon.textContent = (draftFile.type && draftFile.type.startsWith("image/")) ? "🖼️" : "📄";
          filePreviewBar.style.display = "flex";
        }
        showToast(chatErrorText(error, "Не удалось отправить сообщение. Попробуйте ещё раз."), "error");
      } finally {
        sendButton.disabled = false;
        sendButton.textContent = "Отправить";
        syncSendState();
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
