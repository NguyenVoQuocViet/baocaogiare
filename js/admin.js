/* ============================================================
   admin.js — Dashboard quản trị: biểu đồ doanh thu, dịch vụ
   phổ biến, bảng đơn hàng có lọc/tìm kiếm, đếm số liệu.
   Màu biểu đồ đã kiểm chứng CVD: #2563eb #c2410c #0d9488 #be185d
   ============================================================ */
(function () {
  "use strict";

  const sb = window.sb;
  const toast = window.showToast || function (m) { alert(m); };
  const orderCode = (id) => "ORD-" + String(id).padStart(4, "0");

  const VND = (n) => new Intl.NumberFormat("vi-VN").format(n) + "₫";

  const AC = window.AdminCommon || {};
  const STATUS_META = AC.STATUS_META;
  const orderView = AC.orderView;

  /* ---------- Thẻ thống kê (tính từ dữ liệu đơn hàng thật) ---------- */
  const renderStats = () => {
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    const revenue = orders
      .filter((o) => o.status !== "cancelled")
      .reduce((s, o) => s + Number(o.total_price || 0), 0);
    set("stat-revenue", VND(revenue));
    set("stat-total", orders.length);
    set("stat-pending", orders.filter((o) => o.status === "pending").length);
    set("stat-completed", orders.filter((o) => o.status === "completed").length);
  };

  /* ============================================================
     BẢNG ĐƠN HÀNG — dữ liệu thật từ Supabase + Realtime
     ============================================================ */
  const tbody = document.getElementById("orders-tbody");
  const searchInput = document.getElementById("order-search");
  const statusChips = Array.from(document.querySelectorAll("[data-status-filter]"));
  const emptyRow = document.getElementById("orders-empty");
  let activeStatus = "all";
  let orders = []; // bản ghi thật, mới nhất lên đầu
  const flashIds = new Set(); // id cần hiệu ứng nhấp nháy khi render

  const esc = AC.esc;
  const fmtDate = AC.fmtDate;
  const view = orderView;
  let notifCtl = null;

  const AVATAR_TINTS = [
    "bg-primary/10 text-primary",
    "bg-secondary-container/10 text-secondary",
    "bg-tertiary-container/20 text-tertiary",
    "bg-surface-variant text-on-surface-variant"
  ];

  const renderOrders = () => {
    if (!tbody) return;
    const kw = ((searchInput && searchInput.value) || "").toLowerCase().trim();
    const rows = orders
      .map(view)
      .filter((o) => {
        const okStatus = activeStatus === "all" || o.status === activeStatus;
        const contact = [o.phone, o.email].filter(Boolean).join(" · ");
        const okKw = !kw || (o.code + " " + o.customer + " " + o.service + " " + contact).toLowerCase().includes(kw);
        return okStatus && okKw;
      });

    tbody.innerHTML = rows
      .map((o, i) => {
        const contact = [o.phone, o.email].filter(Boolean).join(" · ");
        const firstFile = (o.file_url || "").split(/[\n,]+/).map((s) => s.trim()).filter(Boolean)[0];
        const fileBtn = firstFile
          ? '<a href="' + esc(firstFile) + '" target="_blank" rel="noopener" data-file-link title="Tải file tài liệu" class="text-primary hover:bg-primary/10 w-8 h-8 rounded-lg flex items-center justify-center transition-colors"><span class="material-symbols-outlined text-[20px]">download</span></a>'
          : '<span class="w-8 h-8 flex items-center justify-center text-outline" title="Không có tệp"><span class="material-symbols-outlined text-[20px]">block</span></span>';
        return (
          '<tr data-order-id="' + o.id + '" class="cursor-pointer hover:bg-surface-variant/20 transition-colors' + (flashIds.has(o.id) ? " row-flash" : "") + '">' +
          '<td class="px-6 py-4 text-sm font-bold text-primary whitespace-nowrap">' + o.code + "</td>" +
          '<td class="px-6 py-4"><div class="flex items-center gap-3">' +
          '<div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[12px] flex-shrink-0 ' + AVATAR_TINTS[i % AVATAR_TINTS.length] + '">' + esc(AC.initials(o.customer)) + "</div>" +
          '<div class="min-w-0"><span class="text-sm block whitespace-nowrap">' + esc(o.customer) + "</span>" +
          (contact ? '<span class="text-[11px] text-on-surface-variant block whitespace-nowrap">' + esc(contact) + "</span>" : "") +
          "</div></div></td>" +
          '<td class="px-6 py-4 text-sm whitespace-nowrap">' + esc(o.service) + "</td>" +
          '<td class="px-6 py-4 text-sm whitespace-nowrap">' + fmtDate(o.deadline) + "</td>" +
          '<td class="px-6 py-4">' + AC.statusBadge(o.status) + "</td>" +
          '<td class="px-6 py-4"><div class="flex items-center gap-1.5">' +
          fileBtn +
          AC.statusSelectHTML(o.status, o.id, 'data-order-id="' + o.id + '"') +
          '<button type="button" data-del-id="' + o.id + '" title="Xóa đơn hàng" class="text-on-surface-variant hover:text-error hover:bg-error/10 w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0"><span class="material-symbols-outlined text-[20px]">delete</span></button>' +
          "</div></td>" +
          "</tr>"
        );
      })
      .join("");

    if (emptyRow) emptyRow.style.display = rows.length > 0 ? "none" : "flex";
    flashIds.clear();

    // Đổi trạng thái ngay trên bảng
    tbody.querySelectorAll(".status-select").forEach((sel) =>
      sel.addEventListener("change", (e) => {
        e.stopPropagation();
        changeStatus(Number(sel.dataset.orderId), sel.value, sel);
      })
    );
    // Nút xóa đơn ngay trên bảng
    tbody.querySelectorAll("[data-del-id]").forEach((btn) =>
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        handleDelete(Number(btn.dataset.delId));
      })
    );
    // Click vào dòng để mở chi tiết (bỏ qua khi bấm vào các nút thao tác)
    tbody.querySelectorAll("tr[data-order-id]").forEach((tr) =>
      tr.addEventListener("click", (e) => {
        if (e.target.closest(".status-select, [data-del-id], [data-file-link]")) return;
        const raw = orders.find((o) => o.id === Number(tr.dataset.orderId));
        if (raw) AC.openOrderDrawer(raw, { onStatusChange: changeStatus, onDelete: handleDelete, onPriceChange: changePrice });
      })
    );

    if (notifCtl) notifCtl.render();
    renderStats();
  };

  // Xóa đơn hàng + tệp đính kèm trên Storage; trả về true nếu thành công
  async function handleDelete(orderId, fileUrl) {
    const item = orders.find((o) => o.id === orderId);
    const url = fileUrl !== undefined ? fileUrl : item ? item.file_url : null;
    if (!window.confirm("Xóa đơn " + orderCode(orderId) + " và tệp đính kèm? Hành động này không thể hoàn tác.")) {
      return false;
    }
    try {
      await AC.deleteOrderWithFile(orderId, url);
      orders = orders.filter((o) => o.id !== orderId);
      renderOrders();
      toast("Đã xóa đơn hàng và tệp tin đính kèm để giải phóng bộ nhớ thành công.", "success");
      return true;
    } catch (err) {
      console.error("[Admin] delete lỗi:", err);
      toast("Không xóa được đơn hàng: " + (err.message || "lỗi"), "error");
      return false;
    }
  }

  // Cập nhật trạng thái đơn xuống Supabase; trả về true nếu thành công
  async function changeStatus(orderId, newStatus, selEl) {
    if (selEl) selEl.classList.add("is-busy");
    try {
      await AC.updateOrderStatus(orderId, newStatus);
      const item = orders.find((o) => o.id === orderId);
      if (item) item.status = newStatus;
      toast("Đã cập nhật trạng thái đơn " + orderCode(orderId) + ".", "success");
      renderOrders();
      return true;
    } catch (err) {
      console.error("[Admin] update status lỗi:", err);
      toast("Không cập nhật được trạng thái: " + (err.message || "lỗi"), "error");
      if (selEl) selEl.classList.remove("is-busy");
      renderOrders();
      return false;
    }
  }

  // Đồng bộ giá vừa chốt vào state cục bộ + tải lại thống kê/bảng tại chỗ
  function changePrice(orderId, price) {
    const item = orders.find((o) => o.id === orderId);
    if (item) item.total_price = price;
    renderStats();
    renderOrders();
  }

  const ORDER_SELECT = "*, profiles(full_name, email, phone, university)";

  // Nạp toàn bộ đơn hàng (join profiles để lấy liên hệ khách)
  async function loadOrders() {
    try {
      const { data, error } = await sb
        .from("orders")
        .select(ORDER_SELECT)
        .order("created_at", { ascending: false });
      if (error) throw error;
      orders = data || [];
      renderOrders();
    } catch (err) {
      console.error("[Admin] load orders lỗi:", err);
      toast("Không tải được danh sách đơn hàng: " + (err.message || "lỗi"), "error");
    }
  }

  // Lấy 1 đơn kèm profiles (dùng khi realtime báo INSERT)
  async function fetchOne(id) {
    const { data, error } = await sb.from("orders").select(ORDER_SELECT).eq("id", id).single();
    if (error) throw error;
    return data;
  }

  // Đăng ký lắng nghe realtime INSERT/UPDATE trên bảng orders
  function subscribeRealtime() {
    sb.channel("orders-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, async (payload) => {
        try {
          if (orders.some((o) => o.id === payload.new.id)) return; // đã có
          const full = await fetchOne(payload.new.id);
          orders.unshift(full);
          flashIds.add(full.id);
          renderOrders();
          toast("Có đơn hàng mới: " + orderCode(full.id), "info", "Đơn mới");
        } catch (e) {
          loadOrders();
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, (payload) => {
        const idx = orders.findIndex((o) => o.id === payload.new.id);
        if (idx > -1) {
          // Giữ lại thông tin profiles đã join, cập nhật các cột còn lại
          orders[idx] = Object.assign({}, orders[idx], payload.new);
          flashIds.add(payload.new.id);
          renderOrders();
        } else {
          loadOrders();
        }
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "orders" }, (payload) => {
        const id = payload.old && payload.old.id;
        const before = orders.length;
        orders = orders.filter((o) => o.id !== id);
        if (orders.length !== before) renderOrders();
      })
      .subscribe();
  }

  statusChips.forEach((chip) =>
    chip.addEventListener("click", () => {
      activeStatus = chip.dataset.statusFilter;
      statusChips.forEach((c) => {
        const on = c === chip;
        c.classList.toggle("bg-primary-container", on);
        c.classList.toggle("text-on-primary-container", on);
        c.classList.toggle("bg-surface-container-high", !on);
        c.classList.toggle("text-on-surface-variant", !on);
      });
      renderOrders();
    })
  );
  if (searchInput) searchInput.addEventListener("input", renderOrders);

  /* ============================================================
     KHỞI ĐỘNG: bảo vệ tuyến đường (chỉ admin) rồi nạp dữ liệu
     ============================================================ */
  (async function initAdmin() {
    if (!sb || !window.Auth || !window.AdminCommon) {
      toast("Không kết nối được máy chủ.", "error");
      return;
    }
    AC.initSidebar();
    const ok = await window.Auth.requireAdmin();
    if (!ok) return; // đã bị điều hướng đi nơi khác
    notifCtl = AC.initNotifications(
      () => orders,
      (row) => AC.openOrderDrawer(row, { onStatusChange: changeStatus, onDelete: handleDelete, onPriceChange: changePrice })
    );
    await loadOrders();
    subscribeRealtime();
  })();
})();
