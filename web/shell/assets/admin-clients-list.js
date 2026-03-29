import { formatAdminDate, initAdminListPage } from "/assets/admin-list-page.js";

initAdminListPage({
  fetchPath: "/users",
  normalizeItems: (items) => items.filter((user) => user.role === "client"),
  badgeLabel: "Клиенты",
  emptyTitle: "Клиентская база пока пустая",
  emptyText: "Создайте первого клиента, чтобы открыть запись, визиты и бонусный контур.",
  emptyRowHtml:
    '<tr><td colspan="5"><p class="workspace-empty">Клиентов пока нет. Создайте первую запись, чтобы начать работу.</p></td></tr>',
  successTitle: () => "Клиентская база актуальна",
  successText: (items) => `Найдено клиентов: ${items.length}.`,
  renderRows: ({ items, tableBodyElement }) => {
    for (const client of items) {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td><strong>${client.fullName || "Без имени"}</strong></td>
        <td>${client.email}</td>
        <td>${client.phone || "—"}</td>
        <td><span class="${client.isActive ? "badge-on" : "badge-off"}">${client.isActive ? "Активен" : "Отключен"}</span></td>
        <td>${formatAdminDate(client.lastSeen)}</td>
      `;
      tableBodyElement.appendChild(row);
    }
  }
});
