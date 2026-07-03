/* ============================================================
   admin.js — Dashboard quản trị: biểu đồ doanh thu, dịch vụ
   phổ biến, bảng đơn hàng có lọc/tìm kiếm, đếm số liệu.
   Màu biểu đồ đã kiểm chứng CVD: #2563eb #c2410c #0d9488 #be185d
   ============================================================ */
(function () {
  "use strict";

  const VND = (n) => new Intl.NumberFormat("vi-VN").format(n) + "₫";

  /* ---------- Dữ liệu giả lập ---------- */
  const REVENUE_BY_RANGE = {
    week: {
      labels: ["T2", "T3", "T4", "T5", "T6", "T7", "CN"],
      values: [8200000, 12400000, 17800000, 11300000, 19600000, 15200000, 9100000]
    },
    month: {
      labels: ["Tuần 1", "Tuần 2", "Tuần 3", "Tuần 4"],
      values: [61200000, 74800000, 58300000, 81500000]
    },
    year: {
      labels: ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"],
      values: [182, 174, 231, 205, 248, 296, 312, 287, 342, 371, 398, 425].map((v) => v * 1000000)
    }
  };

  const POPULAR_SERVICES = [
    { name: "Viết luận văn", share: 42, color: "#2563eb" },
    { name: "Phân tích dữ liệu", share: 28, color: "#c2410c" },
    { name: "Dịch thuật học thuật", share: 18, color: "#0d9488" },
    { name: "Gõ văn bản", share: 12, color: "#be185d" }
  ];

  const ORDERS = [
    { code: "ORD-8921", customer: "Nguyễn Hoàng", service: "Viết luận MBA", deadline: "24/10/2026", status: "processing" },
    { code: "ORD-8922", customer: "Minh Tú", service: "Phân tích SPSS", deadline: "22/10/2026", status: "pending" },
    { code: "ORD-8923", customer: "Phạm Gia Hân", service: "Thiết kế PowerPoint", deadline: "20/10/2026", status: "done" },
    { code: "ORD-8924", customer: "Đỗ Nhật Long", service: "Soạn thảo Word", deadline: "19/10/2026", status: "done" },
    { code: "ORD-8925", customer: "Vũ Hải Yến", service: "Thiết kế Canva", deadline: "26/10/2026", status: "processing" },
    { code: "ORD-8926", customer: "Lâm Bảo Ngọc", service: "Dịch thuật tài liệu", deadline: "28/10/2026", status: "pending" },
    { code: "ORD-8927", customer: "Trịnh Công Duy", service: "Hỗ trợ Luận văn", deadline: "18/10/2026", status: "cancelled" },
    { code: "ORD-8928", customer: "Hồ Thanh Trúc", service: "Viết tiểu luận", deadline: "30/10/2026", status: "done" }
  ];

  const STATUS_META = {
    pending: { label: "Chờ duyệt", cls: "bg-surface-variant text-on-primary-fixed-variant" },
    processing: { label: "Đang xử lý", cls: "bg-tertiary-fixed text-on-tertiary-fixed-variant" },
    done: { label: "Hoàn thành", cls: "bg-primary-fixed text-on-primary-fixed-variant" },
    cancelled: { label: "Đã hủy", cls: "bg-error-container text-on-error-container" }
  };

  /* ---------- Sidebar (drawer trên mobile) ---------- */
  const sidebar = document.getElementById("admin-sidebar");
  const sidebarToggle = document.getElementById("sidebar-toggle");
  const backdrop = document.getElementById("sidebar-backdrop");
  if (sidebar && sidebarToggle) {
    const setSidebar = (open) => {
      sidebar.classList.toggle("is-open", open);
      if (backdrop) backdrop.classList.toggle("is-visible", open);
    };
    sidebarToggle.addEventListener("click", () => setSidebar(!sidebar.classList.contains("is-open")));
    if (backdrop) backdrop.addEventListener("click", () => setSidebar(false));
  }

  /* ---------- Đếm số liệu thống kê ---------- */
  const animateCount = (el) => {
    const target = Number(el.dataset.countup || 0);
    const isMoney = el.dataset.money !== undefined;
    const duration = 900;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const val = Math.round(target * eased);
      el.textContent = isMoney ? VND(val) : new Intl.NumberFormat("vi-VN").format(val);
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  document.querySelectorAll("[data-countup]").forEach(animateCount);

  /* ---------- Biểu đồ doanh thu (cột, 1 chuỗi, màu primary) ---------- */
  const chartEl = document.getElementById("revenue-chart");
  const chartRange = document.getElementById("chart-range");
  const tooltip = document.getElementById("chart-tooltip");

  const renderChart = (rangeKey) => {
    if (!chartEl) return;
    const data = REVENUE_BY_RANGE[rangeKey] || REVENUE_BY_RANGE.week;
    const max = Math.max(...data.values);
    chartEl.innerHTML = "";

    data.labels.forEach((label, i) => {
      const value = data.values[i];
      const col = document.createElement("div");
      col.className = "flex-1 min-w-0 flex flex-col items-center gap-2 h-full justify-end";

      const barWrap = document.createElement("div");
      barWrap.className = "w-full max-w-10 h-full flex items-end rounded-t cursor-pointer group relative";

      const bar = document.createElement("div");
      bar.className = "chart-bar-fill w-full rounded-t-[4px] group-hover:opacity-100 opacity-80 transition-opacity";
      bar.style.height = (value / max) * 100 + "%";
      bar.style.backgroundColor = "#2563eb";
      bar.setAttribute("role", "img");
      bar.setAttribute("aria-label", label + ": " + VND(value));
      barWrap.appendChild(bar);

      const lab = document.createElement("span");
      lab.className = "text-xs text-on-surface-variant flex-shrink-0";
      lab.textContent = label;

      col.appendChild(barWrap);
      col.appendChild(lab);
      chartEl.appendChild(col);

      // Tooltip theo từng cột
      barWrap.addEventListener("mouseenter", () => {
        if (!tooltip) return;
        tooltip.textContent = label + " · " + VND(value);
        const chartBox = chartEl.getBoundingClientRect();
        const barBox = barWrap.getBoundingClientRect();
        tooltip.style.left = barBox.left - chartBox.left + barBox.width / 2 + "px";
        tooltip.style.top = barBox.bottom - chartBox.top - (value / max) * barBox.height + "px";
        tooltip.classList.add("is-visible");
      });
      barWrap.addEventListener("mouseleave", () => {
        if (tooltip) tooltip.classList.remove("is-visible");
      });
    });

    // Kích hoạt hiệu ứng mọc cột sau khi gắn DOM
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        chartEl.querySelectorAll(".chart-bar-fill").forEach((b) => b.classList.add("is-grown"))
      )
    );
  };

  renderChart("week");
  if (chartRange) chartRange.addEventListener("change", () => renderChart(chartRange.value));

  /* ---------- Dịch vụ phổ biến (thanh tiến độ) ---------- */
  const popularEl = document.getElementById("popular-services");
  if (popularEl) {
    popularEl.innerHTML = POPULAR_SERVICES.map(
      (s) =>
        '<div class="space-y-2">' +
        '<div class="flex justify-between text-sm">' +
        '<span class="flex items-center gap-2"><span class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background:' + s.color + '"></span>' + s.name + "</span>" +
        '<span class="font-bold">' + s.share + "%</span>" +
        "</div>" +
        '<div class="h-2 w-full bg-surface-variant rounded-full overflow-hidden">' +
        '<div class="progress-fill h-full rounded-full" data-share="' + s.share + '" style="background:' + s.color + '"></div>' +
        "</div></div>"
    ).join("");

    // Chạy thanh tiến độ khi cuộn tới
    const grow = () => popularEl.querySelectorAll(".progress-fill").forEach((f) => (f.style.width = f.dataset.share + "%"));
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            grow();
            io.disconnect();
          }
        },
        { threshold: 0.3 }
      );
      io.observe(popularEl);
    } else grow();
  }

  /* ---------- Bảng đơn hàng: render + lọc + tìm kiếm ---------- */
  const tbody = document.getElementById("orders-tbody");
  const searchInput = document.getElementById("order-search");
  const statusChips = Array.from(document.querySelectorAll("[data-status-filter]"));
  const emptyRow = document.getElementById("orders-empty");
  let activeStatus = "all";

  const initials = (name) =>
    name.split(" ").filter(Boolean).slice(-2).map((w) => w[0]).join("").toUpperCase();

  const AVATAR_TINTS = [
    "bg-primary/10 text-primary",
    "bg-secondary-container/10 text-secondary",
    "bg-tertiary-container/20 text-tertiary",
    "bg-surface-variant text-on-surface-variant"
  ];

  const renderOrders = () => {
    if (!tbody) return;
    const kw = ((searchInput && searchInput.value) || "").toLowerCase().trim();
    const rows = ORDERS.filter((o) => {
      const okStatus = activeStatus === "all" || o.status === activeStatus;
      const okKw = !kw || (o.code + " " + o.customer + " " + o.service).toLowerCase().includes(kw);
      return okStatus && okKw;
    });

    tbody.innerHTML = rows
      .map((o, i) => {
        const st = STATUS_META[o.status];
        return (
          '<tr class="hover:bg-surface-variant/20 transition-colors">' +
          '<td class="px-6 py-4 text-sm font-bold text-primary whitespace-nowrap">' + o.code + "</td>" +
          '<td class="px-6 py-4"><div class="flex items-center gap-3">' +
          '<div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[12px] flex-shrink-0 ' + AVATAR_TINTS[i % AVATAR_TINTS.length] + '">' + initials(o.customer) + "</div>" +
          '<span class="text-sm whitespace-nowrap">' + o.customer + "</span></div></td>" +
          '<td class="px-6 py-4 text-sm whitespace-nowrap">' + o.service + "</td>" +
          '<td class="px-6 py-4 text-sm whitespace-nowrap">' + o.deadline + "</td>" +
          '<td class="px-6 py-4"><span class="px-3 py-1 rounded-full text-[12px] font-bold whitespace-nowrap ' + st.cls + '">' + st.label + "</span></td>" +
          '<td class="px-6 py-4"><button aria-label="Thao tác với đơn ' + o.code + '" class="text-on-surface-variant hover:text-primary transition-colors"><span class="material-symbols-outlined">more_vert</span></button></td>' +
          "</tr>"
        );
      })
      .join("");

    if (emptyRow) emptyRow.style.display = rows.length > 0 ? "none" : "flex";
  };

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
  renderOrders();
})();
