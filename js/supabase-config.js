/* ============================================================
   supabase-config.js — Khởi tạo kết nối Supabase (dùng chung)
   Nạp SAU thẻ <script> CDN của @supabase/supabase-js.
   Cung cấp:
     • window.sb        → Supabase client
     • window.showToast → thông báo nổi (success / error / info)
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Thông tin cấu hình kết nối ---------- */
  const SUPABASE_URL = "https://fsweklelshzetgolpfrr.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_Yj98QUozMguKGTKXbO59Mw_qFiIZwaE";

  /* ---------- Khởi tạo client ---------- */
  // Thư viện CDN expose global `supabase` (có hàm createClient).
  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    console.error(
      "[Supabase] Chưa nạp được thư viện @supabase/supabase-js. " +
        "Hãy kiểm tra thẻ <script> CDN đặt TRƯỚC supabase-config.js."
    );
  } else {
    window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }

  /* ============================================================
     showToast — Thông báo nổi đẹp mắt, tự biến mất.
     showToast("Nội dung", "success" | "error" | "info", "Tiêu đề?")
     ============================================================ */
  const ICONS = {
    success: "check_circle",
    error: "error",
    info: "info"
  };
  const TITLES = {
    success: "Thành công",
    error: "Có lỗi xảy ra",
    info: "Thông báo"
  };

  function getStack() {
    let stack = document.getElementById("toast-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.id = "toast-stack";
      stack.className = "toast-stack";
      stack.setAttribute("role", "status");
      stack.setAttribute("aria-live", "polite");
      document.body.appendChild(stack);
    }
    return stack;
  }

  window.showToast = function (message, type, title) {
    type = type || "info";
    const stack = getStack();

    const toast = document.createElement("div");
    toast.className = "toast toast--" + type;
    toast.innerHTML =
      '<span class="material-symbols-outlined toast__icon">' +
      (ICONS[type] || ICONS.info) +
      "</span>" +
      '<div class="toast__body">' +
      '<p class="toast__title">' +
      (title || TITLES[type] || TITLES.info) +
      "</p>" +
      (message ? '<p class="toast__msg">' + message + "</p>" : "") +
      "</div>";

    stack.appendChild(toast);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => toast.classList.add("is-visible"))
    );

    const remove = () => {
      toast.classList.add("is-leaving");
      toast.addEventListener("transitionend", () => toast.remove(), { once: true });
      setTimeout(() => toast.remove(), 600);
    };
    setTimeout(remove, 4200);
    toast.addEventListener("click", remove);
  };
})();
