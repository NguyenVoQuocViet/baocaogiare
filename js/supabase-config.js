/* ============================================================
   supabase-config.js — Khởi tạo kết nối Supabase (dùng chung)
   Nạp SAU thẻ <script> CDN của @supabase/supabase-js VÀ sau js/env.js.
   Cung cấp:
     • window.sb        → Supabase client
     • window.showToast → thông báo nổi (success / error / info)

   Cấu hình kết nối KHÔNG hardcode trong file này. Hai giá trị dưới đây
   được nạp từ `window.ENV` do file js/env.js sinh ra lúc build (từ biến
   môi trường SUPABASE_URL / SUPABASE_ANON_KEY trên Vercel hoặc .env local).
   Xem hướng dẫn cấu hình trong README.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Đọc cấu hình từ biến môi trường (đã nhúng qua js/env.js) ---------- */
  const ENV = window.ENV || {};
  const SUPABASE_URL = ENV.SUPABASE_URL;
  const SUPABASE_ANON_KEY = ENV.SUPABASE_ANON_KEY;

  /* ---------- Khởi tạo client ---------- */
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    // Thiếu biến môi trường: dừng khởi tạo và báo lỗi rõ ràng thay vì fail âm thầm.
    console.error(
      "[Supabase] Thiếu SUPABASE_URL hoặc SUPABASE_ANON_KEY.\n" +
        "  • Local: tạo file .env (xem .env.example) rồi chạy `npm run build`.\n" +
        "  • Vercel: Settings → Environment Variables → thêm 2 biến này rồi Redeploy.\n" +
        "  → File js/env.js chưa được sinh hoặc chưa có giá trị."
    );
    // Hiện thông báo trực quan cho người dùng cuối khi trang đã sẵn sàng.
    document.addEventListener("DOMContentLoaded", function () {
      if (typeof window.showToast === "function") {
        window.showToast(
          "Trang chưa được cấu hình kết nối máy chủ. Vui lòng liên hệ quản trị viên.",
          "error",
          "Chưa cấu hình Supabase"
        );
      }
    });
  } else if (!window.supabase || typeof window.supabase.createClient !== "function") {
    // Thư viện CDN expose global `supabase` (có hàm createClient).
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
