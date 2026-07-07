/* ============================================================
   my-orders.js — Trang "Đơn hàng của tôi" (dành cho khách hàng).
   Lấy đơn của user đang đăng nhập, hiển thị trạng thái + giá chốt.
   Nạp SAU supabase-config.js + auth.js.
   ============================================================ */
(function () {
  "use strict";

  const sb = window.sb;
  const toast = window.showToast || function (m) { alert(m); };

  /* ---------- Helper định dạng ---------- */
  const VND = (n) => new Intl.NumberFormat("vi-VN").format(Math.max(0, Math.round(Number(n) || 0))) + "đ";
  const orderCode = (id) => "ORD-" + String(id).padStart(4, "0");
  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );
  const fmtDate = (v) => {
    if (!v) return "—";
    const d = new Date(v);
    return isNaN(d) ? esc(v) : d.toLocaleDateString("vi-VN");
  };

  // Nhãn + màu trạng thái (đồng bộ với khu admin)
  const STATUS_META = {
    pending: { label: "Chờ duyệt", cls: "bg-surface-variant text-on-primary-fixed-variant" },
    processing: { label: "Đang xử lý", cls: "bg-tertiary-fixed text-on-tertiary-fixed-variant" },
    completed: { label: "Hoàn thành", cls: "bg-primary-fixed text-on-primary-fixed-variant" },
    cancelled: { label: "Đã hủy", cls: "bg-error-container text-on-error-container" }
  };
  const statusBadge = (status) => {
    const st = STATUS_META[status] || STATUS_META.pending;
    return '<span class="inline-block px-3 py-1 rounded-full text-[12px] font-bold whitespace-nowrap ' + st.cls + '">' + st.label + "</span>";
  };

  // Cột giá: 0/null/chưa có → "Chờ Admin báo giá" (cam); đã chốt (>0) → số tiền nổi bật
  const priceCell = (n) =>
    Number(n) > 0
      ? '<span class="font-bold text-primary text-base whitespace-nowrap">' + VND(n) + "</span>"
      : '<span class="inline-flex items-center gap-1 font-semibold text-secondary whitespace-nowrap">' +
        '<span class="material-symbols-outlined text-[18px]">schedule</span>Chờ Admin báo giá</span>';

  /* ---------- DOM ---------- */
  const tbody = document.getElementById("orders-tbody");
  const loadingEl = document.getElementById("orders-loading");
  const emptyEl = document.getElementById("orders-empty");

  const showLoading = (on) => { if (loadingEl) loadingEl.style.display = on ? "flex" : "none"; };
  const showEmpty = (on) => { if (emptyEl) emptyEl.style.display = on ? "flex" : "none"; };

  function render(orders) {
    if (!tbody) return;
    if (!orders.length) {
      tbody.innerHTML = "";
      showEmpty(true);
      return;
    }
    showEmpty(false);
    tbody.innerHTML = orders
      .map(
        (o) =>
          '<tr class="hover:bg-surface-variant/20 transition-colors">' +
          '<td class="px-6 py-4 text-sm font-bold text-primary whitespace-nowrap">' + orderCode(o.id) + "</td>" +
          '<td class="px-6 py-4 text-sm font-medium max-w-[240px]"><span class="block truncate">' + esc(o.service_type || "—") + "</span></td>" +
          '<td class="px-6 py-4 text-sm text-on-surface-variant whitespace-nowrap">' + fmtDate(o.created_at) + "</td>" +
          '<td class="px-6 py-4 text-sm text-on-surface-variant whitespace-nowrap">' + fmtDate(o.deadline) + "</td>" +
          '<td class="px-6 py-4">' + statusBadge(o.status) + "</td>" +
          '<td class="px-6 py-4 text-right">' + priceCell(o.total_price) + "</td>" +
          "</tr>"
      )
      .join("");
  }

  async function loadMyOrders(userId) {
    showLoading(true);
    try {
      const { data, error } = await sb
        .from("orders")
        .select("id, service_type, created_at, deadline, status, total_price")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      render(data || []);
    } catch (err) {
      console.error("[MyOrders] load lỗi:", err);
      toast("Không tải được danh sách đơn hàng: " + (err.message || "lỗi kết nối"), "error");
      showEmpty(true);
    } finally {
      showLoading(false);
    }
  }

  /* ---------- Khởi động ---------- */
  (async function init() {
    if (!sb || !window.Auth) {
      toast("Không kết nối được máy chủ.", "error");
      showLoading(false);
      return;
    }
    // Bắt buộc đăng nhập; nếu chưa thì Auth tự chuyển sang trang đăng nhập kèm ?next=
    const user = await window.Auth.requireLogin({ next: "my-orders.html" });
    if (!user) return;
    await loadMyOrders(user.id);

    // Cập nhật realtime: đơn của user thay đổi (admin chốt giá / đổi trạng thái) → tải lại
    try {
      sb.channel("my-orders-" + user.id)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "orders", filter: "user_id=eq." + user.id },
          () => loadMyOrders(user.id)
        )
        .subscribe();
    } catch (e) {
      /* realtime là tùy chọn — bỏ qua nếu chưa bật */
    }
  })();
})();
