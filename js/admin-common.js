/* ============================================================
   admin-common.js — Tiện ích dùng chung cho khu vực quản trị:
   sidebar (drawer mobile), drawer chi tiết đơn hàng, dropdown
   thông báo, và các helper định dạng / trạng thái đơn.
   Nạp SAU supabase-config.js + auth.js, TRƯỚC script trang.
   Expose: window.AdminCommon
   ============================================================ */
(function () {
  "use strict";

  const sb = window.sb;
  const toast = window.showToast || function (m) { alert(m); };

  /* ---------- Helper định dạng ---------- */
  const VND = (n) => new Intl.NumberFormat("vi-VN").format(Number(n || 0)) + "₫";
  // Giá theo TỪNG đơn: 0 nghĩa là chưa báo giá (đơn mới, admin chưa nhập giá).
  const priceLabel = (n) => (Number(n) > 0 ? VND(n) : "Chưa báo giá");
  const orderCode = (id) => "ORD-" + String(id).padStart(4, "0");
  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );
  const nl2br = (s) => esc(s).replace(/\n/g, "<br>");
  const fmtDate = (v) => {
    if (!v) return "—";
    const d = new Date(v);
    return isNaN(d) ? esc(v) : d.toLocaleDateString("vi-VN");
  };
  const fmtDateTime = (v) => {
    if (!v) return "—";
    const d = new Date(v);
    return isNaN(d) ? esc(v) : d.toLocaleString("vi-VN");
  };
  const initials = (name) =>
    (name || "?").split(" ").filter(Boolean).slice(-2).map((w) => w[0]).join("").toUpperCase() || "?";

  /* ---------- Storage: tệp đính kèm ---------- */
  const BUCKET = "academic-files";

  // file_url có thể chứa nhiều link (ngăn bằng xuống dòng hoặc dấu phẩy)
  const splitUrls = (fileUrl) =>
    fileUrl ? String(fileUrl).split(/[\n,]+/).map((s) => s.trim()).filter(Boolean) : [];

  // Trích tên tệp (đường dẫn trong bucket) từ 1 Public URL
  const storagePathFromUrl = (u) => {
    const marker = "/" + BUCKET + "/";
    const i = u.indexOf(marker);
    return i > -1 ? decodeURIComponent(u.slice(i + marker.length).split("?")[0]) : null;
  };
  const extractStoragePaths = (fileUrl) => splitUrls(fileUrl).map(storagePathFromUrl).filter(Boolean);

  // Nút "Tải file tài liệu" cho Admin (hỗ trợ nhiều tệp)
  const fileLinksHTML = (fileUrl) => {
    const urls = splitUrls(fileUrl);
    if (!urls.length) return '<span class="text-sm text-on-surface-variant">Không có tệp đính kèm</span>';
    return urls
      .map(
        (u, i) =>
          '<a href="' + esc(u) + '" target="_blank" rel="noopener" class="inline-flex items-center gap-1.5 bg-primary/10 text-primary font-semibold text-sm px-3 py-2 rounded-lg hover:bg-primary/20 transition-colors">' +
          '<span class="material-symbols-outlined text-[18px]">download</span>Tải file tài liệu' +
          (urls.length > 1 ? " " + (i + 1) : "") +
          "</a>"
      )
      .join(" ");
  };

  // Xóa tệp trên Storage TRƯỚC rồi xóa đơn trong DB (ném lỗi nếu thất bại)
  async function deleteOrderWithFile(orderId, fileUrl) {
    const paths = extractStoragePaths(fileUrl);
    if (paths.length) {
      const { error: sErr } = await sb.storage.from(BUCKET).remove(paths);
      if (sErr) throw sErr;
    }
    // Dùng .select() để biết CHÍNH XÁC có dòng nào bị xóa hay không.
    // Nếu RLS chặn, Supabase trả về mảng rỗng mà KHÔNG báo lỗi -> phải tự bắt.
    const { data, error } = await sb.from("orders").delete().eq("id", orderId).select();
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error(
        "Xóa bị từ chối bởi RLS — bảng orders chưa có DELETE policy cho admin. " +
          "Hãy chạy: create policy \"orders_delete_admin\" on public.orders for delete using (public.is_admin());"
      );
    }
  }

  const STATUS_META = {
    pending: { label: "Chờ duyệt", cls: "bg-surface-variant text-on-primary-fixed-variant" },
    processing: { label: "Đang xử lý", cls: "bg-tertiary-fixed text-on-tertiary-fixed-variant" },
    completed: { label: "Hoàn thành", cls: "bg-primary-fixed text-on-primary-fixed-variant" },
    cancelled: { label: "Đã hủy", cls: "bg-error-container text-on-error-container" }
  };
  const STATUS_ORDER = ["pending", "processing", "completed", "cancelled"];

  // Chuẩn hóa 1 dòng DB (kèm profiles) thành dữ liệu hiển thị
  const orderView = (o) => {
    const p = o.profiles || {};
    return {
      id: o.id,
      code: orderCode(o.id),
      customer: p.full_name || p.email || "Khách vãng lai",
      email: p.email || "",
      phone: p.phone || "",
      university: p.university || "",
      service: o.service_type || "—",
      deadline: o.deadline,
      created: o.created_at,
      details: o.details || "",
      file_url: o.file_url || "",
      price: Number(o.total_price || 0),
      status: STATUS_META[o.status] ? o.status : "pending"
    };
  };

  const statusBadge = (status) => {
    const st = STATUS_META[status] || STATUS_META.pending;
    return '<span class="px-3 py-1 rounded-full text-[12px] font-bold whitespace-nowrap ' + st.cls + '">' + st.label + "</span>";
  };

  const statusSelectHTML = (status, id, attr) => {
    const cur = STATUS_META[status] ? status : "pending";
    return (
      '<select class="status-select ' + STATUS_META[cur].cls + '" ' + (attr || "") + ' aria-label="Đổi trạng thái">' +
      STATUS_ORDER.map((s) => '<option value="' + s + '"' + (s === cur ? " selected" : "") + ">" + STATUS_META[s].label + "</option>").join("") +
      "</select>"
    );
  };

  /* ---------- Sidebar (drawer trên mobile) ---------- */
  function initSidebar() {
    const sidebar = document.getElementById("admin-sidebar");
    const toggle = document.getElementById("sidebar-toggle");
    const backdrop = document.getElementById("sidebar-backdrop");
    if (!sidebar || !toggle) return;
    const set = (open) => {
      sidebar.classList.toggle("is-open", open);
      if (backdrop) backdrop.classList.toggle("is-visible", open);
    };
    toggle.addEventListener("click", () => set(!sidebar.classList.contains("is-open")));
    if (backdrop) backdrop.addEventListener("click", () => set(false));
  }

  /* ============================================================
     DRAWER CHI TIẾT ĐƠN HÀNG
     ============================================================ */
  let drawerEl, backdropEl, onStatusChangeCb, onDeleteCb, onPriceChangeCb;

  function ensureDrawer() {
    if (drawerEl) return;
    backdropEl = document.createElement("div");
    backdropEl.className = "drawer-backdrop";
    backdropEl.addEventListener("click", closeOrderDrawer);

    drawerEl = document.createElement("aside");
    drawerEl.className = "admin-drawer bg-surface";
    drawerEl.setAttribute("role", "dialog");
    drawerEl.setAttribute("aria-label", "Chi tiết đơn hàng");
    drawerEl.innerHTML =
      '<div class="flex items-center justify-between px-5 py-4 border-b border-outline-variant/30">' +
      '<h3 class="text-lg font-bold">Chi tiết đơn hàng</h3>' +
      '<button type="button" aria-label="Đóng" class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors" data-drawer-close>' +
      '<span class="material-symbols-outlined">close</span></button></div>' +
      '<div class="flex-1 overflow-y-auto p-5 space-y-5" id="drawer-body"></div>';

    document.body.appendChild(backdropEl);
    document.body.appendChild(drawerEl);
    drawerEl.querySelector("[data-drawer-close]").addEventListener("click", closeOrderDrawer);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeOrderDrawer();
    });
  }

  const infoRow = (label, valueHTML) =>
    '<div class="flex justify-between gap-4 py-2 border-b border-outline-variant/20">' +
    '<span class="text-sm text-on-surface-variant flex-shrink-0">' + label + "</span>" +
    '<span class="text-sm font-semibold text-right">' + valueHTML + "</span></div>";

  function openOrderDrawer(dbRow, opts) {
    ensureDrawer();
    opts = opts || {};
    onStatusChangeCb = opts.onStatusChange || null;
    onDeleteCb = opts.onDelete || null;
    onPriceChangeCb = opts.onPriceChange || null;
    const v = orderView(dbRow);

    const body = drawerEl.querySelector("#drawer-body");
    body.innerHTML =
      // Mã đơn + trạng thái
      '<div class="flex items-center justify-between">' +
      '<span class="text-xl font-black text-primary">' + v.code + "</span>" +
      '<span data-drawer-badge>' + statusBadge(v.status) + "</span>" +
      "</div>" +
      // Khách hàng
      '<div class="bg-surface-container-low rounded-2xl p-4 space-y-3">' +
      '<p class="text-xs font-bold uppercase tracking-wide text-on-surface-variant">Khách hàng</p>' +
      '<div class="flex items-center gap-3">' +
      '<div class="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold flex-shrink-0">' + esc(initials(v.customer)) + "</div>" +
      '<div class="min-w-0"><p class="font-semibold truncate">' + esc(v.customer) + "</p>" +
      (v.university ? '<p class="text-xs text-on-surface-variant truncate">' + esc(v.university) + "</p>" : "") +
      "</div></div>" +
      '<div class="flex flex-wrap gap-x-6 gap-y-1 text-sm pt-1">' +
      (v.phone ? '<a href="tel:' + esc(v.phone) + '" class="inline-flex items-center gap-1 text-primary hover:underline"><span class="material-symbols-outlined text-[18px]">call</span>' + esc(v.phone) + "</a>" : "") +
      (v.email ? '<a href="mailto:' + esc(v.email) + '" class="inline-flex items-center gap-1 text-primary hover:underline"><span class="material-symbols-outlined text-[18px]">mail</span>' + esc(v.email) + "</a>" : "") +
      "</div></div>" +
      // Thông tin đơn
      '<div>' +
      infoRow("Dịch vụ", esc(v.service)) +
      infoRow("Deadline", fmtDate(v.deadline)) +
      infoRow("Ngày đặt", fmtDateTime(v.created)) +
      infoRow("Tổng tiền", '<span data-drawer-price-display class="' + (Number(v.price) > 0 ? "text-primary" : "text-on-surface-variant") + ' text-base">' + priceLabel(v.price) + "</span>") +
      "</div>" +
      // Chốt giá dịch vụ (Admin nhập giá trực tiếp)
      '<div class="space-y-2">' +
      '<p class="text-xs font-bold uppercase tracking-wide text-on-surface-variant">Chốt giá dịch vụ</p>' +
      '<div class="flex items-center gap-2">' +
      '<div class="relative flex-1">' +
      '<input type="number" id="update-price-input" min="0" step="1000" inputmode="numeric" ' +
      'value="' + (Number(v.price) > 0 ? Number(v.price) : "") + '" placeholder="Nhập giá chốt (VNĐ)" ' +
      'class="input-focus-ring w-full bg-surface-container-lowest border border-outline-variant rounded-xl pl-4 pr-8 py-2.5 text-sm"/>' +
      '<span class="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm pointer-events-none">₫</span>' +
      "</div>" +
      '<button type="button" id="btn-update-price" class="bg-primary text-on-primary font-semibold px-4 py-2.5 rounded-xl text-sm tap-scale hover:opacity-90 transition-opacity flex items-center gap-1.5 flex-shrink-0">' +
      '<span class="material-symbols-outlined text-[18px]">payments</span>Cập nhật giá</button>' +
      "</div>" +
      '<p class="text-xs text-on-surface-variant">Nhập số tiền chốt rồi bấm “Cập nhật giá”. Để trống hoặc 0 nghĩa là chưa báo giá.</p>' +
      "</div>" +
      // Tệp đính kèm
      '<div class="space-y-2">' +
      '<p class="text-xs font-bold uppercase tracking-wide text-on-surface-variant">Tệp đính kèm</p>' +
      '<div class="flex flex-wrap gap-2">' + fileLinksHTML(v.file_url) + "</div>" +
      "</div>" +
      // Chi tiết yêu cầu
      '<div class="space-y-2">' +
      '<p class="text-xs font-bold uppercase tracking-wide text-on-surface-variant">Chi tiết yêu cầu</p>' +
      '<div class="bg-surface-container-low rounded-2xl p-4 text-sm leading-relaxed whitespace-pre-wrap">' + (v.details ? nl2br(v.details) : '<span class="text-on-surface-variant">Không có mô tả</span>') + "</div>" +
      "</div>" +
      // Đổi trạng thái
      '<div class="space-y-2">' +
      '<p class="text-xs font-bold uppercase tracking-wide text-on-surface-variant">Cập nhật trạng thái</p>' +
      statusSelectHTML(v.status, v.id, 'data-drawer-status="' + v.id + '"') +
      "</div>" +
      // Xóa đơn hàng (chỉ hiện khi có callback)
      (onDeleteCb
        ? '<div class="pt-2 border-t border-outline-variant/30">' +
          '<button type="button" data-drawer-delete="' + v.id + '" class="w-full flex items-center justify-center gap-2 border-2 border-error text-error font-semibold py-3 rounded-2xl hover:bg-error/5 transition-colors tap-scale">' +
          '<span class="material-symbols-outlined text-[20px]">delete</span>Xóa đơn hàng &amp; tệp đính kèm</button></div>'
        : "");

    const sel = body.querySelector("[data-drawer-status]");
    if (sel) {
      sel.addEventListener("change", async () => {
        if (onStatusChangeCb) {
          sel.classList.add("is-busy");
          const okUpdate = await onStatusChangeCb(Number(sel.dataset.drawerStatus), sel.value);
          sel.classList.remove("is-busy");
          if (okUpdate !== false) {
            // đồng bộ badge trong drawer
            const badge = body.querySelector("[data-drawer-badge]");
            if (badge) badge.innerHTML = statusBadge(sel.value);
            sel.className = "status-select " + (STATUS_META[sel.value] || STATUS_META.pending).cls;
          }
        }
      });
    }

    /* ----- Chốt giá đơn hàng ----- */
    const priceBtn = body.querySelector("#btn-update-price");
    const priceInput = body.querySelector("#update-price-input");
    if (priceBtn && priceInput) {
      const submitPrice = async () => {
        const raw = priceInput.value.trim();
        // Bắt lỗi: chưa nhập số tiền
        if (raw === "") {
          toast("Vui lòng nhập giá chốt cho đơn hàng.", "error", "Thiếu thông tin");
          priceInput.focus();
          return;
        }
        // Bắt lỗi: không phải số hợp lệ hoặc số âm
        const price = Number(raw);
        if (!Number.isFinite(price) || price < 0) {
          toast("Giá không hợp lệ. Vui lòng nhập số tiền lớn hơn hoặc bằng 0.", "error");
          priceInput.focus();
          return;
        }

        priceBtn.classList.add("is-busy");
        // Chỉ Admin mới được chốt giá (dùng đúng cơ chế kiểm tra quyền hiện có)
        const profile = window.Auth ? await window.Auth.getProfile() : null;
        if (!profile || profile.role !== "admin") {
          toast("Bạn không có quyền cập nhật giá đơn hàng.", "error", "Truy cập bị từ chối");
          priceBtn.classList.remove("is-busy");
          return;
        }

        try {
          const finalPrice = Math.round(price);
          await updateOrderPrice(v.id, finalPrice);
          dbRow.total_price = finalPrice; // đồng bộ dữ liệu gốc để lần mở sau đúng
          // Tải lại hiển thị giá ngay trong drawer
          const priceCell = body.querySelector("[data-drawer-price-display]");
          if (priceCell) {
            priceCell.className = (finalPrice > 0 ? "text-primary" : "text-on-surface-variant") + " text-base";
            priceCell.textContent = priceLabel(finalPrice);
          }
          priceInput.value = finalPrice > 0 ? finalPrice : "";
          toast("Đã cập nhật giá thành công!", "success");
          if (onPriceChangeCb) onPriceChangeCb(v.id, finalPrice); // để trang cập nhật thống kê/bảng
        } catch (err) {
          console.error("[Admin] update price lỗi:", err);
          toast(
            /Failed to fetch|network/i.test(err.message || "")
              ? "Lỗi kết nối mạng, vui lòng thử lại."
              : "Không cập nhật được giá: " + (err.message || "lỗi không xác định"),
            "error"
          );
        } finally {
          priceBtn.classList.remove("is-busy");
        }
      };
      priceBtn.addEventListener("click", submitPrice);
      priceInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          submitPrice();
        }
      });
    }

    const delBtn = body.querySelector("[data-drawer-delete]");
    if (delBtn) {
      delBtn.addEventListener("click", async () => {
        if (!onDeleteCb) return;
        delBtn.classList.add("is-busy");
        const ok = await onDeleteCb(v.id, v.file_url);
        if (ok !== false) closeOrderDrawer();
        else delBtn.classList.remove("is-busy");
      });
    }

    backdropEl.classList.add("is-open");
    drawerEl.classList.add("is-open");
    document.body.classList.add("menu-locked");
  }

  function closeOrderDrawer() {
    if (!drawerEl) return;
    backdropEl.classList.remove("is-open");
    drawerEl.classList.remove("is-open");
    document.body.classList.remove("menu-locked");
  }

  /* ============================================================
     DROPDOWN THÔNG BÁO (chuông)
     recentGetter() → mảng dbRow đơn hàng gần đây (đã sort mới nhất)
     onItemClick(dbRow) → xử lý khi bấm 1 thông báo (mở drawer / điều hướng)
     ============================================================ */
  function initNotifications(recentGetter, onItemClick) {
    const bell = document.getElementById("notif-bell");
    const menu = document.getElementById("notif-menu");
    if (!bell || !menu) return;

    const close = () => menu.classList.remove("is-open");

    const render = () => {
      const rows = (recentGetter() || []).slice(0, 6);
      const listEl = menu.querySelector("[data-notif-list]");
      const countEl = menu.querySelector("[data-notif-count]");
      const pending = (recentGetter() || []).filter((o) => o.status === "pending").length;
      if (countEl) countEl.textContent = pending ? pending + " đơn chờ duyệt" : "Không có đơn chờ duyệt";
      const dot = document.getElementById("notif-dot");
      if (dot) dot.style.display = pending ? "block" : "none";

      if (!listEl) return;
      if (!rows.length) {
        listEl.innerHTML = '<p class="px-4 py-6 text-center text-sm text-on-surface-variant">Chưa có thông báo nào.</p>';
        return;
      }
      listEl.innerHTML = rows
        .map((o) => {
          const v = orderView(o);
          return (
            '<button type="button" data-notif-id="' + v.id + '" class="w-full text-left px-4 py-3 hover:bg-surface-variant/40 transition-colors flex items-start gap-3 border-b border-outline-variant/20 last:border-0">' +
            '<span class="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0"><span class="material-symbols-outlined text-[20px]">receipt_long</span></span>' +
            '<span class="min-w-0"><span class="block text-sm font-semibold truncate">' + v.code + " · " + esc(v.customer) + "</span>" +
            '<span class="block text-xs text-on-surface-variant truncate">' + esc(v.service) + "</span>" +
            '<span class="inline-block mt-1">' + statusBadge(v.status) + "</span></span></button>"
          );
        })
        .join("");

      listEl.querySelectorAll("[data-notif-id]").forEach((btn) =>
        btn.addEventListener("click", () => {
          const id = Number(btn.dataset.notifId);
          const row = (recentGetter() || []).find((o) => o.id === id);
          close();
          if (row && onItemClick) onItemClick(row);
        })
      );
    };

    bell.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = !menu.classList.contains("is-open");
      if (open) render();
      menu.classList.toggle("is-open", open);
    });
    document.addEventListener("click", (e) => {
      if (!menu.contains(e.target) && e.target !== bell) close();
    });

    return { render };
  }

  /* ---------- Cập nhật trạng thái đơn (dùng chung) ---------- */
  async function updateOrderStatus(orderId, newStatus) {
    const { error } = await sb.from("orders").update({ status: newStatus }).eq("id", orderId);
    if (error) throw error;
  }

  /* ---------- Cập nhật giá chốt của đơn (dùng chung) ---------- */
  async function updateOrderPrice(orderId, price) {
    const { error } = await sb.from("orders").update({ total_price: price }).eq("id", orderId);
    if (error) throw error;
  }

  window.AdminCommon = {
    VND, priceLabel, orderCode, esc, nl2br, fmtDate, fmtDateTime, initials,
    STATUS_META, STATUS_ORDER, orderView, statusBadge, statusSelectHTML,
    initSidebar, openOrderDrawer, closeOrderDrawer, initNotifications, updateOrderStatus, updateOrderPrice,
    fileLinksHTML, extractStoragePaths, deleteOrderWithFile
  };
})();
