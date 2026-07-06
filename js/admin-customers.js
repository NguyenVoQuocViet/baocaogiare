/* ============================================================
   admin-customers.js — Trang Khách hàng: danh sách hồ sơ khách,
   số đơn, tổng chi tiêu; bấm để xem chi tiết + các đơn của họ.
   ============================================================ */
(function () {
  "use strict";

  const sb = window.sb;
  const AC = window.AdminCommon || {};
  const toast = window.showToast || function (m) { alert(m); };
  const { esc, VND, fmtDate, initials, statusBadge } = AC;

  const tbody = document.getElementById("customers-tbody");
  const searchInput = document.getElementById("customer-search");
  const emptyEl = document.getElementById("customers-empty");
  let customers = []; // { p, orders, count, total }
  let allOrders = [];

  /* ---------- Drawer chi tiết khách hàng ---------- */
  let drawer, backdrop;
  function ensureDrawer() {
    if (drawer) return;
    backdrop = document.createElement("div");
    backdrop.className = "drawer-backdrop";
    backdrop.addEventListener("click", closeDrawer);
    drawer = document.createElement("aside");
    drawer.className = "admin-drawer bg-surface";
    drawer.innerHTML =
      '<div class="flex items-center justify-between px-5 py-4 border-b border-outline-variant/30">' +
      '<h3 class="text-lg font-bold">Chi tiết khách hàng</h3>' +
      '<button type="button" aria-label="Đóng" class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors" data-close><span class="material-symbols-outlined">close</span></button></div>' +
      '<div class="flex-1 overflow-y-auto p-5 space-y-5" id="cust-body"></div>';
    document.body.appendChild(backdrop);
    document.body.appendChild(drawer);
    drawer.querySelector("[data-close]").addEventListener("click", closeDrawer);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDrawer(); });
  }
  function closeDrawer() {
    if (!drawer) return;
    backdrop.classList.remove("is-open");
    drawer.classList.remove("is-open");
    document.body.classList.remove("menu-locked");
  }
  function openDrawer(c) {
    ensureDrawer();
    const p = c.p;
    const name = p.full_name || p.email || "Khách vãng lai";
    const body = drawer.querySelector("#cust-body");
    const ordersHTML = c.orders.length
      ? c.orders
          .map(
            (o) =>
              '<button type="button" data-order-id="' + o.id + '" class="w-full text-left bg-surface-container-low rounded-xl p-3 hover:bg-surface-variant/40 transition-colors flex items-center justify-between gap-3">' +
              '<span class="min-w-0"><span class="block text-sm font-bold text-primary">' + AC.orderCode(o.id) + "</span>" +
              '<span class="block text-xs text-on-surface-variant truncate">' + esc(o.service_type || "—") + "</span></span>" +
              '<span class="text-right flex-shrink-0"><span class="block">' + statusBadge(o.status) + "</span>" +
              '<span class="block text-xs mt-1 font-semibold">' + VND(o.total_price) + "</span></span></button>"
          )
          .join("")
      : '<p class="text-sm text-on-surface-variant">Khách hàng chưa có đơn nào.</p>';

    body.innerHTML =
      '<div class="flex items-center gap-3">' +
      '<div class="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xl flex-shrink-0">' + esc(initials(name)) + "</div>" +
      '<div class="min-w-0"><p class="text-lg font-bold truncate">' + esc(name) + "</p>" +
      '<span class="inline-block text-[11px] font-bold px-2 py-0.5 rounded-full ' + (p.role === "admin" ? "bg-primary-container text-on-primary-container" : "bg-surface-variant text-on-surface-variant") + '">' + (p.role === "admin" ? "Quản trị viên" : "Khách hàng") + "</span></div></div>" +
      '<div class="bg-surface-container-low rounded-2xl p-4 space-y-2 text-sm">' +
      row("Email", p.email ? '<a class="text-primary hover:underline" href="mailto:' + esc(p.email) + '">' + esc(p.email) + "</a>" : "—") +
      row("Số điện thoại", p.phone ? '<a class="text-primary hover:underline" href="tel:' + esc(p.phone) + '">' + esc(p.phone) + "</a>" : "—") +
      row("Trường", esc(p.university || "—")) +
      row("Tham gia", fmtDate(p.created_at)) +
      "</div>" +
      '<div class="grid grid-cols-2 gap-3">' +
      '<div class="bg-surface-container-low rounded-2xl p-4 text-center"><p class="text-2xl font-black text-primary">' + c.count + '</p><p class="text-xs text-on-surface-variant">Đơn hàng</p></div>' +
      '<div class="bg-surface-container-low rounded-2xl p-4 text-center"><p class="text-lg font-black text-primary">' + VND(c.total) + '</p><p class="text-xs text-on-surface-variant">Tổng chi tiêu</p></div>' +
      "</div>" +
      '<div class="space-y-2"><p class="text-xs font-bold uppercase tracking-wide text-on-surface-variant">Đơn hàng của khách</p><div class="space-y-2">' + ordersHTML + "</div></div>";

    body.querySelectorAll("[data-order-id]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const o = allOrders.find((x) => x.id === Number(btn.dataset.orderId));
        if (o) { closeDrawer(); AC.openOrderDrawer(o, { onStatusChange: changeStatus, onDelete: handleDelete }); }
      })
    );

    backdrop.classList.add("is-open");
    drawer.classList.add("is-open");
    document.body.classList.add("menu-locked");
  }
  const row = (label, val) =>
    '<div class="flex justify-between gap-4"><span class="text-on-surface-variant">' + label + '</span><span class="font-semibold text-right">' + val + "</span></div>";

  async function changeStatus(orderId, newStatus) {
    try {
      await AC.updateOrderStatus(orderId, newStatus);
      const o = allOrders.find((x) => x.id === orderId);
      if (o) o.status = newStatus;
      toast("Đã cập nhật trạng thái đơn " + AC.orderCode(orderId) + ".", "success");
      return true;
    } catch (err) {
      toast("Không cập nhật được: " + (err.message || "lỗi"), "error");
      return false;
    }
  }

  async function handleDelete(orderId, fileUrl) {
    const o = allOrders.find((x) => x.id === orderId);
    const url = fileUrl !== undefined ? fileUrl : o ? o.file_url : null;
    if (!window.confirm("Xóa đơn " + AC.orderCode(orderId) + " và tệp đính kèm? Hành động này không thể hoàn tác.")) {
      return false;
    }
    try {
      await AC.deleteOrderWithFile(orderId, url);
      toast("Đã xóa đơn hàng và tệp tin đính kèm để giải phóng bộ nhớ thành công.", "success");
      await load(); // nạp lại danh sách khách + số đơn
      return true;
    } catch (err) {
      console.error("[Customers] delete lỗi:", err);
      toast("Không xóa được đơn hàng: " + (err.message || "lỗi"), "error");
      return false;
    }
  }

  /* ---------- Render bảng ---------- */
  function render() {
    if (!tbody) return;
    const kw = ((searchInput && searchInput.value) || "").toLowerCase().trim();
    const rows = customers.filter((c) => {
      const p = c.p;
      return !kw || ((p.full_name || "") + " " + (p.email || "") + " " + (p.phone || "") + " " + (p.university || "")).toLowerCase().includes(kw);
    });

    tbody.innerHTML = rows
      .map((c) => {
        const p = c.p;
        const name = p.full_name || p.email || "Khách vãng lai";
        return (
          '<tr data-cust-id="' + p.id + '" class="cursor-pointer hover:bg-surface-variant/20 transition-colors">' +
          '<td class="px-6 py-4"><div class="flex items-center gap-3">' +
          '<div class="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[13px] flex-shrink-0">' + esc(initials(name)) + "</div>" +
          '<div class="min-w-0"><span class="text-sm font-semibold block whitespace-nowrap">' + esc(name) + "</span>" +
          '<span class="text-[11px] text-on-surface-variant block whitespace-nowrap">' + esc(p.email || "") + "</span></div></div></td>" +
          '<td class="px-6 py-4 text-sm whitespace-nowrap">' + esc(p.phone || "—") + "</td>" +
          '<td class="px-6 py-4 text-sm whitespace-nowrap">' + esc(p.university || "—") + "</td>" +
          '<td class="px-6 py-4 text-sm font-bold text-center">' + c.count + "</td>" +
          '<td class="px-6 py-4 text-sm font-semibold whitespace-nowrap">' + VND(c.total) + "</td>" +
          '<td class="px-6 py-4 text-sm whitespace-nowrap text-on-surface-variant">' + fmtDate(p.created_at) + "</td>" +
          "</tr>"
        );
      })
      .join("");

    if (emptyEl) emptyEl.style.display = rows.length ? "none" : "flex";

    tbody.querySelectorAll("tr[data-cust-id]").forEach((tr) =>
      tr.addEventListener("click", () => {
        const c = customers.find((x) => x.p.id === tr.dataset.custId);
        if (c) openDrawer(c);
      })
    );

    // Cập nhật thẻ tổng quan
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set("stat-total-customers", customers.length);
    set("stat-total-orders", allOrders.length);
    set("stat-total-revenue", VND(allOrders.reduce((s, o) => s + Number(o.total_price || 0), 0)));
  }

  async function load() {
    try {
      const [pRes, oRes] = await Promise.all([
        sb.from("profiles").select("id, full_name, email, phone, university, role, created_at").order("created_at", { ascending: false }),
        sb.from("orders").select("*, profiles(full_name, email, phone, university)").order("created_at", { ascending: false })
      ]);
      if (pRes.error) throw pRes.error;
      if (oRes.error) throw oRes.error;
      allOrders = oRes.data || [];

      const byUser = {};
      allOrders.forEach((o) => {
        (byUser[o.user_id] = byUser[o.user_id] || []).push(o);
      });
      customers = (pRes.data || []).map((p) => {
        const list = byUser[p.id] || [];
        return { p, orders: list, count: list.length, total: list.reduce((s, o) => s + Number(o.total_price || 0), 0) };
      });
      render();
    } catch (err) {
      console.error("[Customers] load lỗi:", err);
      toast("Không tải được danh sách khách hàng: " + (err.message || "lỗi"), "error");
    }
  }

  if (searchInput) searchInput.addEventListener("input", render);

  (async function init() {
    if (!sb || !window.Auth || !window.AdminCommon) {
      toast("Không kết nối được máy chủ.", "error");
      return;
    }
    AC.initSidebar();
    const ok = await window.Auth.requireAdmin();
    if (!ok) return;
    AC.initNotifications(
      () => allOrders,
      (o) => AC.openOrderDrawer(o, { onStatusChange: changeStatus, onDelete: handleDelete })
    );
    await load();
  })();
})();
