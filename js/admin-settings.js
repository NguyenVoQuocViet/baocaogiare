/* ============================================================
   admin-settings.js — Trang Cài đặt: xem & cập nhật hồ sơ
   quản trị viên, đăng xuất.
   ============================================================ */
(function () {
  "use strict";

  const sb = window.sb;
  const AC = window.AdminCommon || {};
  const toast = window.showToast || function (m) { alert(m); };

  const form = document.getElementById("settings-form");
  const nameEl = document.getElementById("settings-name");
  const phoneEl = document.getElementById("settings-phone");
  const uniEl = document.getElementById("settings-university");
  const emailEl = document.getElementById("settings-email");
  const roleEl = document.getElementById("settings-role");
  const signoutBtn = document.getElementById("settings-signout");
  let currentUserId = null;
  let allOrders = [];

  function fillForm(p) {
    if (nameEl) nameEl.value = p.full_name || "";
    if (phoneEl) phoneEl.value = p.phone || "";
    if (uniEl) uniEl.value = p.university || "";
    if (emailEl) emailEl.value = p.email || "";
    if (roleEl) roleEl.textContent = p.role === "admin" ? "Quản trị viên" : "Người dùng";
  }

  async function loadProfile(userId) {
    const { data, error } = await sb
      .from("profiles")
      .select("id, full_name, email, phone, university, role")
      .eq("id", userId)
      .single();
    if (error) throw error;
    return data;
  }

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!currentUserId) return;
      const submitBtn = form.querySelector('[type="submit"]');
      if (submitBtn) submitBtn.classList.add("is-busy");
      try {
        const { error } = await sb
          .from("profiles")
          .update({
            full_name: nameEl.value.trim(),
            phone: phoneEl.value.trim(),
            university: uniEl.value.trim()
          })
          .eq("id", currentUserId);
        if (error) throw error;
        toast("Đã lưu thông tin hồ sơ.", "success");
        // Cập nhật tên hiển thị trên sidebar/header
        document.querySelectorAll("[data-auth-name]").forEach((el) => (el.textContent = nameEl.value.trim() || el.textContent));
      } catch (err) {
        console.error("[Settings] update lỗi:", err);
        toast("Không lưu được: " + (err.message || "lỗi"), "error");
      } finally {
        if (submitBtn) submitBtn.classList.remove("is-busy");
      }
    });
  }

  if (signoutBtn) {
    signoutBtn.addEventListener("click", () => window.Auth.signOut());
  }

  async function loadOrdersForBell() {
    try {
      const { data } = await sb
        .from("orders")
        .select("*, profiles(full_name, email, phone, university)")
        .order("created_at", { ascending: false })
        .limit(10);
      allOrders = data || [];
    } catch (e) {
      allOrders = [];
    }
  }

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

  function changePrice(orderId, price) {
    const o = allOrders.find((x) => x.id === orderId);
    if (o) o.total_price = price;
  }

  (async function init() {
    if (!sb || !window.Auth || !window.AdminCommon) {
      toast("Không kết nối được máy chủ.", "error");
      return;
    }
    AC.initSidebar();
    const res = await window.Auth.requireAdmin();
    if (!res) return;
    currentUserId = res.user.id;
    fillForm(res.profile);
    await loadOrdersForBell();
    AC.initNotifications(
      () => allOrders,
      (o) => AC.openOrderDrawer(o, { onStatusChange: changeStatus, onPriceChange: changePrice })
    );
  })();
})();
