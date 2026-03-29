import {
  escapeHtml,
  formatDate,
  formatDateTime,
  formatTime,
  money,
  workHoursText
} from "/assets/client-home-utils.js";

export function renderClientHomeApp(state) {
  const {
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
    contactLinks
  } = state;

  function clientName() {
    const value = me?.fullName?.trim();
    return value && value.length > 0 ? value : session.email;
  }

  function unreadBadgeMarkup() {
    const total = Array.isArray(conversations)
      ? conversations.reduce((sum, conversation) => sum + Number(conversation.unreadCount || 0), 0)
      : 0;
    return total > 0 ? `<span class="client-chat-badge">${total}</span>` : `<span class="client-chat-badge">→</span>`;
  }

  function renderHeader() {
    return `
      <header class="glass card client-home-header">
        <div>
          <h1 class="title" style="font-size: 22px; margin-bottom: 4px;">Личный кабинет CRS</h1>
          <p class="subtitle">${escapeHtml(session.email)}</p>
        </div>
        <div class="client-home-header-actions">
          ${screen !== "home" ? '<button class="btn btn-secondary" type="button" data-action="go-home">На главную</button>' : ""}
          <button id="logout-btn" class="btn btn-secondary" type="button">Выйти</button>
        </div>
      </header>
    `;
  }

  function renderToast() {
    if (!toast) return "";
    return `
      <div class="client-toast client-toast-${toast.type}" role="status" aria-live="polite">
        ${escapeHtml(toast.message)}
      </div>
    `;
  }

  function renderBrand() {
    return `
      <section class="glass card client-brand-card">
        <p class="client-brand-logo">CRS</p>
        <div>
          <h2 class="client-brand-title">Centr Radius Service</h2>
          <p class="client-brand-subtitle">Премиальный сервис для ежедневного сопровождения автомобиля</p>
        </div>
      </section>
    `;
  }

  function renderContacts() {
    return `
      <section class="client-contact-row">
        ${contactLinks.map(
          (item) => `
            <a class="client-contact-link" href="${item.url}" target="_blank" rel="noreferrer">${item.label}</a>
          `
        ).join("")}
      </section>
    `;
  }

  function renderHero() {
    return `
      <section class="glass client-hero-card">
        <div class="client-hero-frame">
          <img class="client-hero-image" src="/assets/client-hero-car.png" alt="Автомобиль CRS" />
          <div class="client-hero-glow"></div>
          <div class="client-hero-top-fade"></div>
          <div class="client-hero-shadow"></div>
        </div>
      </section>
    `;
  }

  function renderActions() {
    return `
      <section class="client-action-grid">
        <button class="client-action-tile" type="button" data-action="open-booking">
          Записаться
          <span>Филиалы, контакты и быстрый маршрут</span>
        </button>
        <button class="client-action-tile" type="button" data-action="open-visits">
          История посещений
          <span>Все визиты и суммы в одном месте</span>
        </button>
        <button class="client-action-tile" type="button" data-action="open-bonus-history">
          История начислений
          <span>Начисления и списания по бонусному счёту</span>
        </button>
        <button class="client-action-tile" type="button" data-action="open-cashback">
          Система кешбека
          <span>Текущий баланс и правила использования</span>
        </button>
      </section>
    `;
  }

  function renderChatCta() {
    return `
      <button class="client-chat-cta" type="button" data-action="open-chat">
        <div>
          <p class="client-chat-title">ЧАТ</p>
          <p class="client-chat-subtitle">Быстрая связь с администратором сервиса</p>
        </div>
        ${unreadBadgeMarkup()}
      </button>
    `;
  }

  function renderBonusCard() {
    return `
      <section class="glass card client-bonus-card">
        <div class="client-bonus-circle">
          <p class="client-bonus-value">${escapeHtml(bonusBalance)}</p>
          <p class="client-bonus-caption">бонусов</p>
        </div>
        <div>
          <h2 class="client-user-name">${escapeHtml(clientName())}</h2>
          <p class="client-user-email">${escapeHtml(me?.email ?? session.email)}</p>
        </div>
      </section>
    `;
  }

  function renderEmpty(title, description) {
    return `
      <section class="glass card client-empty">
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(description)}</p>
      </section>
    `;
  }

  function renderLoading(text) {
    return `
      <section class="glass card client-skeleton-card client-fade" aria-label="${escapeHtml(text)}">
        <div class="client-skeleton-grid">
          <div class="client-skeleton-line is-short"></div>
          <div class="client-skeleton-line is-medium"></div>
          <div class="client-skeleton-block"></div>
        </div>
      </section>
    `;
  }

  function renderListSkeleton(rows = 3) {
    return `
      <section class="client-screen client-fade">
        <div class="client-skeleton-grid">
          ${Array.from({ length: rows }).map(() => `
            <section class="glass card client-skeleton-card client-list-skeleton">
              <div class="client-skeleton-line is-medium"></div>
              <div class="client-skeleton-line is-short"></div>
              <div class="client-skeleton-line is-short client-skeleton-value"></div>
              <div class="client-skeleton-line is-medium"></div>
            </section>
          `).join("")}
        </div>
      </section>
    `;
  }

  function renderHomeSkeleton() {
    return `
      <section class="client-screen client-fade">
        <section class="glass card client-skeleton-card">
          <div class="client-skeleton-grid">
            <div class="client-skeleton-line is-short"></div>
            <div class="client-skeleton-line is-medium"></div>
          </div>
        </section>
        <section class="client-contact-row">
          ${Array.from({ length: 5 }).map(() => '<div class="client-skeleton-block" style="min-height:58px;border-radius:18px;"></div>').join("")}
        </section>
        <section class="client-action-grid">
          ${Array.from({ length: 4 }).map(() => '<div class="client-skeleton-block"></div>').join("")}
        </section>
        <section class="glass client-hero-card"><div class="client-skeleton-block" style="min-height:270px;border-radius:0;"></div></section>
        <div class="client-skeleton-chat client-skeleton-block"></div>
        <section class="glass card client-bonus-card">
          <div class="client-skeleton-circle"></div>
          <div class="client-skeleton-grid">
            <div class="client-skeleton-line is-medium"></div>
            <div class="client-skeleton-line is-short"></div>
          </div>
        </section>
      </section>
    `;
  }

  function renderHomeScreen() {
    if (homeLoading) return renderHomeSkeleton();
    if (homeError) return renderEmpty("Не удалось открыть экран", homeError);
    return `
      <section class="client-screen client-fade">
        ${renderBrand()}
        ${renderContacts()}
        ${renderActions()}
        ${renderHero()}
        ${renderChatCta()}
        ${renderBonusCard()}
      </section>
    `;
  }

  function renderVisitsScreen() {
    if (visitsLoading && !visits) return renderListSkeleton(3);
    if (!visits?.length) {
      return renderEmpty("У вас пока нет визитов", "Начните с записи, и история посещений появится здесь.");
    }
    return `
      <section class="client-screen client-fade">
        <div class="client-section-header">
          <h2 class="client-section-title">История посещений</h2>
        </div>
        <div class="client-list">
          ${visits.map((visit) => `
            <article class="glass card client-list-card">
              <h3 class="client-list-title">${escapeHtml(formatDate(visit.visitDate))}</h3>
              <p class="client-list-subtitle">${escapeHtml(visit.branchName || "Филиал сервиса")}</p>
              <p class="client-list-value">${escapeHtml(money(visit.finalAmount))}</p>
              ${visit.comment ? `<p class="client-list-hint">${escapeHtml(visit.comment)}</p>` : ""}
            </article>
          `).join("")}
        </div>
      </section>
    `;
  }

  function renderBonusHistoryScreen() {
    if (bonusHistoryLoading && !bonusHistory) return renderListSkeleton(3);
    if (!bonusHistory?.length) {
      return renderEmpty("История бонусов пока пуста", "После первого начисления или списания все операции появятся здесь.");
    }
    return `
      <section class="client-screen client-fade">
        <div class="client-section-header">
          <h2 class="client-section-title">История начислений</h2>
        </div>
        <div class="client-list">
          ${bonusHistory.map((row) => `
            <article class="glass card client-list-card">
              <h3 class="client-list-title">${row.type === "accrual" ? "Начисление" : "Списание"}</h3>
              <p class="client-list-value">${escapeHtml(`${row.amount} бонусов`)}</p>
              <p class="client-list-subtitle">${escapeHtml(formatDateTime(row.createdAt))}</p>
              ${row.comment ? `<p class="client-list-hint">${escapeHtml(row.comment)}</p>` : ""}
            </article>
          `).join("")}
        </div>
      </section>
    `;
  }

  function renderCashbackScreen() {
    return `
      <section class="client-screen client-fade">
        <div class="client-section-header">
          <h2 class="client-section-title">Система кешбека</h2>
        </div>
        <article class="glass card client-list-card">
          <h3 class="client-list-title">Текущий бонусный баланс</h3>
          <p class="client-list-value">${escapeHtml(`${bonusBalance} бонусов`)}</p>
          <p class="client-list-hint">Бонусы накапливаются внутри сервиса и доступны для использования в следующих визитах.</p>
          <p class="client-list-hint">Операций в истории: ${escapeHtml(String(bonusHistory?.length ?? 0))}</p>
        </article>
      </section>
    `;
  }

  function renderBookingScreen() {
    if (branchesLoading && !branches) return renderListSkeleton(2);
    if (!branches?.length) {
      return renderEmpty("Запись пока недоступна", "Подходящие филиалы скоро появятся здесь. Пока можно написать нам в чат.");
    }
    return `
      <section class="client-screen client-fade">
        <div class="client-section-header">
          <h2 class="client-section-title">Записаться</h2>
        </div>
        <div class="client-list">
          ${branches.map((branch) => `
            <article class="glass card client-list-card">
              <h3 class="client-list-title">${escapeHtml(branch.name)}</h3>
              <p class="client-list-subtitle">${escapeHtml(branch.address)}</p>
              ${branch.phone ? `<p class="client-list-hint">Телефон: ${escapeHtml(branch.phone)}</p>` : ""}
              ${workHoursText(branch.workHours) ? `<p class="client-list-hint">График: ${escapeHtml(workHoursText(branch.workHours))}</p>` : ""}
              <div class="client-card-actions">
                ${branch.phone ? `<a class="btn btn-secondary" href="tel:${escapeHtml(branch.phone)}">Позвонить</a>` : ""}
                <button class="btn btn-secondary" type="button" data-action="open-chat">Написать в чат</button>
                <a class="btn btn-primary" target="_blank" rel="noreferrer" href="https://maps.apple.com/?ll=${encodeURIComponent(branch.lat)},${encodeURIComponent(branch.lng)}&q=${encodeURIComponent(branch.name)}">Маршрут</a>
              </div>
            </article>
          `).join("")}
        </div>
      </section>
    `;
  }

  function renderChatScreen() {
    if (chatLoading && !messages) return renderLoading("Загружаем диалог...");
    if (chatError) return renderEmpty("Не удалось открыть чат", chatError);
    if (!conversations?.length || !activeConversationId) {
      return renderEmpty("Диалог пока не начат", "Напишите первым, и администратор ответит в этом окне.");
    }

    const tabs = conversations.map((conversation) => `
      <button
        class="client-chat-tab ${conversation.id === activeConversationId ? "is-active" : ""}"
        type="button"
        data-conversation-id="${conversation.id}"
      >
        Чат${conversation.unreadCount > 0 ? ` (${conversation.unreadCount})` : ""}
      </button>
    `).join("");

    const messageMarkup = (messages ?? []).map((message) => {
      const mine = message.senderId === session.userId;
      return `
        <article class="client-message ${mine ? "mine" : "other"}">
          <p class="client-message-text">${escapeHtml(message.text || "")}</p>
          <p class="client-message-meta">${escapeHtml(formatTime(message.createdAt))}</p>
        </article>
      `;
    }).join("");

    return `
      <section class="client-screen client-fade">
        <div class="client-section-header">
          <h2 class="client-section-title">Чат</h2>
        </div>
        <div class="client-chat-tabs">${tabs}</div>
        <section class="glass card client-chat-panel">
          <div class="client-messages" id="client-chat-messages">
            ${messageMarkup || '<div class="client-loading">Сообщений пока нет. Напишите первым, и мы продолжим диалог здесь.</div>'}
          </div>
          <div class="client-chat-composer">
            <textarea id="chat-message-input" class="input client-chat-input" placeholder="Напишите сообщение">${escapeHtml(messageDraft)}</textarea>
            <p class="client-chat-feel">${messageDraft.trim().length > 0 ? "Печатаем сообщение..." : ""}</p>
            <button class="btn btn-primary" type="button" id="chat-send-btn" ${sendingMessage ? "disabled" : ""}>
              ${sendingMessage ? "Отправка..." : "Отправить"}
            </button>
          </div>
        </section>
      </section>
    `;
  }

  function renderCurrentScreen() {
    if (screen === "visits") return renderVisitsScreen();
    if (screen === "bonus-history") return renderBonusHistoryScreen();
    if (screen === "cashback") return renderCashbackScreen();
    if (screen === "booking") return renderBookingScreen();
    if (screen === "chat") return renderChatScreen();
    return renderHomeScreen();
  }

  app.innerHTML = `
    ${renderToast()}
    ${renderHeader()}
    <div class="client-screen-stage client-screen-stage-${transitionDirection}">
      ${renderCurrentScreen()}
    </div>
  `;
}
