import { initAdminListPage } from "/assets/admin-list-page.js";

initAdminListPage({
  fetchPath: "/branches",
  badgeLabel: "Филиалы",
  emptyTitle: "Сеть филиалов пока пустая",
  emptyText: "Добавьте первый филиал, чтобы запись и карта начали показывать точки сервиса.",
  emptyRowHtml:
    '<tr><td colspan="5"><p class="workspace-empty">Филиалов пока нет. Создайте первую точку обслуживания.</p></td></tr>',
  successTitle: () => "Филиалы синхронизированы",
  successText: (items) => `Найдено филиалов: ${items.length}.`,
  renderRows: ({ items, tableBodyElement }) => {
    for (const branch of items) {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td><strong>${branch.name}</strong></td>
        <td>${branch.address}</td>
        <td>${branch.phone || "—"}</td>
        <td><span class="${branch.isActive ? "badge-on" : "badge-off"}">${branch.isActive ? "Активен" : "Отключен"}</span></td>
        <td>${Number(branch.lat).toFixed(6)}, ${Number(branch.lng).toFixed(6)}</td>
      `;
      tableBodyElement.appendChild(row);
    }
  }
});
