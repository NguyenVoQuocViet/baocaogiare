/* ============================================================
   auth.js — Đăng ký, Đăng nhập phân quyền, Bảo vệ tuyến đường,
   Đăng xuất. Dùng Supabase Auth + bảng `profiles`.
   Nạp SAU supabase-config.js (cần window.sb, window.showToast).

   Public API (window.Auth):
     • getUser()            → user hiện tại (hoặc null)
     • getProfile()         → { role, full_name, ... } (hoặc null)
     • requireLogin(opts)   → đảm bảo đã đăng nhập, nếu chưa → về login
     • requireAdmin()       → chỉ cho admin, sai quyền → đá về trang chủ
     • signOut()            → đăng xuất và về trang login
   ============================================================ */
(function () {
  "use strict";

  const sb = window.sb;
  const toast = window.showToast || function (m) { alert(m); };
  const LOGIN_PAGE = "login.html";
  const HOME_PAGE = "index.html";
  const ADMIN_PAGE = "admin-dashboard.html";

  /* ---------- Dịch lỗi Supabase sang tiếng Việt ---------- */
  function viError(err) {
    const msg = (err && (err.message || err.error_description || "")) + "";
    if (/Invalid login credentials/i.test(msg)) return "Email hoặc mật khẩu không chính xác.";
    if (/Email not confirmed/i.test(msg)) return "Tài khoản chưa xác nhận email. Vui lòng kiểm tra hộp thư.";
    if (/User already registered|already been registered/i.test(msg)) return "Email này đã được đăng ký. Hãy đăng nhập.";
    if (/Password should be at least/i.test(msg)) return "Mật khẩu phải có ít nhất 6 ký tự.";
    if (/rate limit|too many/i.test(msg)) return "Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút.";
    if (/Failed to fetch|NetworkError|network/i.test(msg)) return "Lỗi kết nối mạng. Kiểm tra Internet rồi thử lại.";
    if (/Unable to validate email address/i.test(msg)) return "Địa chỉ email không hợp lệ.";
    return msg || "Đã có lỗi xảy ra, vui lòng thử lại.";
  }

  /* ---------- Truy vấn hồ sơ (profiles) theo user id ---------- */
  async function fetchProfile(userId) {
    try {
      const { data, error } = await sb
        .from("profiles")
        .select("id, email, full_name, phone, university, role")
        .eq("id", userId)
        .single();
      if (error) throw error;
      return data;
    } catch (e) {
      console.warn("[Auth] Không lấy được profile:", e.message);
      return null;
    }
  }

  async function getUser() {
    if (!sb) return null;
    const { data } = await sb.auth.getUser();
    return (data && data.user) || null;
  }

  async function getProfile() {
    const user = await getUser();
    if (!user) return null;
    return fetchProfile(user.id);
  }

  /* ============================================================
     ĐĂNG XUẤT
     ============================================================ */
  async function signOut(redirect) {
    try {
      await sb.auth.signOut();
    } catch (e) {
      /* vẫn điều hướng dù lỗi */
    }
    if (redirect !== false) window.location.href = LOGIN_PAGE;
  }

  /* ============================================================
     BẢO VỆ TUYẾN ĐƯỜNG (Route Guards)
     ============================================================ */
  // Trang chỉ cần đăng nhập
  async function requireLogin(opts) {
    opts = opts || {};
    const user = await getUser();
    if (!user) {
      if (opts.silent !== true) toast("Vui lòng đăng nhập để tiếp tục.", "info");
      const next = encodeURIComponent(opts.next || location.pathname.split("/").pop() || HOME_PAGE);
      window.location.href = LOGIN_PAGE + "?next=" + next;
      return null;
    }
    return user;
  }

  // Trang chỉ dành cho admin
  async function requireAdmin() {
    const user = await getUser();
    if (!user) {
      toast("Bạn cần đăng nhập bằng tài khoản quản trị.", "info");
      window.location.href = LOGIN_PAGE + "?next=" + encodeURIComponent(ADMIN_PAGE);
      return null;
    }
    const profile = await fetchProfile(user.id);
    if (!profile || profile.role !== "admin") {
      toast("Bạn không có quyền truy cập trang quản trị.", "error", "Truy cập bị từ chối");
      setTimeout(() => (window.location.href = HOME_PAGE), 900);
      return null;
    }
    return { user, profile };
  }

  /* ============================================================
     ĐIỀU HƯỚNG SAU ĐĂNG NHẬP theo vai trò
     ============================================================ */
  function routeByRole(role, nextParam) {
    if (role === "admin") {
      window.location.href = ADMIN_PAGE;
      return;
    }
    // Người dùng thường: ưu tiên trang họ định vào (nếu an toàn), mặc định trang chủ
    if (nextParam && nextParam !== ADMIN_PAGE) {
      window.location.href = nextParam;
    } else {
      window.location.href = HOME_PAGE;
    }
  }

  /* ============================================================
     FORM ĐĂNG NHẬP (login.html)
     ============================================================ */
  function bindLoginForm() {
    const form = document.getElementById("login-form");
    if (!form) return;

    const emailEl = document.getElementById("login-email");
    const passEl = document.getElementById("login-password");
    const submitBtn = form.querySelector('[type="submit"]');
    const params = new URLSearchParams(location.search);
    const nextParam = params.get("next");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = emailEl.value.trim();
      const password = passEl.value;

      if (!email || !password) {
        toast("Vui lòng nhập đầy đủ email và mật khẩu.", "error");
        return;
      }

      submitBtn.classList.add("is-busy");
      const originalHTML = submitBtn.innerHTML; // giữ nguyên cả icon để khôi phục đúng
      submitBtn.textContent = "Đang đăng nhập...";

      try {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // Lấy vai trò để điều hướng
        const profile = await fetchProfile(data.user.id);
        const role = (profile && profile.role) || "user";
        toast("Chào mừng bạn quay lại!", "success");
        setTimeout(() => routeByRole(role, nextParam), 600);
      } catch (err) {
        toast(viError(err), "error");
        submitBtn.classList.remove("is-busy");
        submitBtn.innerHTML = originalHTML;
      }
    });
  }

  /* ============================================================
     FORM ĐĂNG KÝ (register.html)
     Trigger DB sẽ tự tạo dòng trong `profiles` từ options.data.
     ============================================================ */
  function bindRegisterForm() {
    const form = document.getElementById("register-form");
    if (!form) return;

    const nameEl = document.getElementById("register-name");
    const emailEl = document.getElementById("register-email");
    const phoneEl = document.getElementById("register-phone");
    const uniEl = document.getElementById("register-university");
    const passEl = document.getElementById("register-password");
    const confirmEl = document.getElementById("register-confirm");
    const submitBtn = form.querySelector('[type="submit"]');

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const full_name = nameEl.value.trim();
      const email = emailEl.value.trim();
      const phone = phoneEl.value.trim();
      const university = uniEl ? uniEl.value.trim() : "";
      const password = passEl.value;
      const confirm = confirmEl ? confirmEl.value : password;

      if (!full_name || !email || !password) {
        toast("Vui lòng nhập họ tên, email và mật khẩu.", "error");
        return;
      }
      if (password.length < 6) {
        toast("Mật khẩu phải có ít nhất 6 ký tự.", "error");
        return;
      }
      if (password !== confirm) {
        toast("Mật khẩu xác nhận không khớp.", "error");
        return;
      }

      submitBtn.classList.add("is-busy");
      const originalHTML = submitBtn.innerHTML; // giữ nguyên cả icon để khôi phục đúng
      submitBtn.textContent = "Đang tạo tài khoản...";

      try {
        const { data, error } = await sb.auth.signUp({
          email,
          password,
          options: {
            // Trigger `handle_new_user` đọc các trường này để đổ vào profiles
            data: { full_name, phone, university, email }
          }
        });
        if (error) throw error;

        if (data.session) {
          // Email confirmation tắt → đã đăng nhập luôn
          toast("Đăng ký thành công! Đang chuyển hướng...", "success");
          setTimeout(() => routeByRole("user", null), 700);
        } else {
          // Cần xác nhận email
          toast(
            "Tài khoản đã được tạo. Vui lòng kiểm tra email để xác nhận trước khi đăng nhập.",
            "success",
            "Đăng ký thành công"
          );
          setTimeout(() => (window.location.href = LOGIN_PAGE), 1600);
        }
      } catch (err) {
        toast(viError(err), "error");
        submitBtn.classList.remove("is-busy");
        submitBtn.innerHTML = originalHTML;
      }
    });
  }

  /* ============================================================
     CẬP NHẬT THANH ĐIỀU HƯỚNG theo trạng thái đăng nhập
     Các phần tử [data-auth-action] sẽ đổi thành nút Đăng xuất
     khi đã đăng nhập, kèm tên người dùng.
     ============================================================ */
  async function refreshAuthNav() {
    const actions = document.querySelectorAll("[data-auth-action]");
    if (!actions.length) return;

    const user = await getUser();
    if (!user) return; // giữ nguyên "Đăng nhập"

    const profile = await fetchProfile(user.id);
    const name = (profile && profile.full_name) || user.email || "Tài khoản";
    const isAdmin = profile && profile.role === "admin";

    actions.forEach((el) => {
      el.textContent = "Đăng xuất";
      el.setAttribute("href", "#");
      el.setAttribute("title", "Đăng xuất khỏi: " + name);
      el.addEventListener("click", (e) => {
        e.preventDefault();
        signOut();
      });
    });

    // Tên hiển thị thuần (không tiền tố) — cho header/avatar
    document.querySelectorAll("[data-auth-name]").forEach((el) => {
      el.textContent = name;
    });
    // Hiện các phần tử chỉ dành cho người đã đăng nhập (vd: "Đơn hàng của tôi", "Đăng xuất")
    document.querySelectorAll("[data-auth-user-only]").forEach((el) => el.classList.remove("hidden"));
    // Ẩn các phần tử chỉ dành cho khách chưa đăng nhập (vd: "Đăng nhập", "Đăng ký")
    document.querySelectorAll("[data-auth-guest-only]").forEach((el) => el.classList.add("hidden"));
    // Hiện lời chào / lối tắt tới dashboard nếu là admin
    document.querySelectorAll("[data-auth-greeting]").forEach((el) => {
      el.textContent = "Xin chào, " + name;
      el.classList.remove("hidden");
    });
    if (isAdmin) {
      document.querySelectorAll("[data-auth-admin-only]").forEach((el) => el.classList.remove("hidden"));
    }
  }

  /* ============================================================
     Khởi động
     ============================================================ */
  window.Auth = { getUser, getProfile, requireLogin, requireAdmin, signOut };

  document.addEventListener("DOMContentLoaded", () => {
    if (!sb) {
      toast("Không kết nối được máy chủ. Vui lòng tải lại trang.", "error");
      return;
    }
    bindLoginForm();
    bindRegisterForm();
    refreshAuthNav();
  });
})();
