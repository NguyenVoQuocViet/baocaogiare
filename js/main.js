/* ============================================================
   main.js — Tương tác chung cho mọi trang
   Menu mobile, header khi cuộn, scroll reveal, anchor mượt
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Menu mobile (overlay kính + stagger) ---------- */
  const menuToggle = document.getElementById("menu-toggle");
  const mobileMenu = document.getElementById("mobile-menu");

  if (menuToggle && mobileMenu) {
    const closeButtons = mobileMenu.querySelectorAll("[data-menu-close]");

    const setMenu = (open) => {
      mobileMenu.classList.toggle("is-open", open);
      menuToggle.classList.toggle("is-open-toggle", open);
      menuToggle.setAttribute("aria-expanded", String(open));
      document.body.classList.toggle("menu-locked", open);
    };

    menuToggle.addEventListener("click", () => {
      setMenu(!mobileMenu.classList.contains("is-open"));
    });
    closeButtons.forEach((btn) => btn.addEventListener("click", () => setMenu(false)));
    mobileMenu.querySelectorAll("a").forEach((link) =>
      link.addEventListener("click", () => setMenu(false))
    );
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setMenu(false);
    });
  }

  /* ---------- Header đổ bóng khi cuộn ---------- */
  const header = document.querySelector(".site-header");
  if (header) {
    let ticking = false;
    const update = () => {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
      ticking = false;
    };
    window.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          window.requestAnimationFrame(update);
          ticking = true;
        }
      },
      { passive: true }
    );
    update();
  }

  /* ---------- Scroll reveal ---------- */
  const revealItems = document.querySelectorAll(".reveal");
  if (revealItems.length && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    revealItems.forEach((el, i) => {
      // Stagger nhẹ cho các phần tử anh em trong cùng lưới
      if (!el.style.getPropertyValue("--reveal-delay")) {
        const siblings = el.parentElement
          ? Array.from(el.parentElement.children).filter((c) => c.classList.contains("reveal"))
          : [];
        const idx = siblings.indexOf(el);
        el.style.setProperty("--reveal-delay", `${Math.max(idx, 0) * 70}ms`);
      }
      io.observe(el);
    });
  } else {
    revealItems.forEach((el) => el.classList.add("is-visible"));
  }

  /* ---------- Cuộn mượt cho anchor nội trang ---------- */
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (e) => {
      const id = anchor.getAttribute("href");
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  /* ---------- Đánh dấu tab đang hoạt động ở bottom-nav ---------- */
  const page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  document.querySelectorAll("[data-nav-page]").forEach((item) => {
    const isActive = item.dataset.navPage === page;
    item.classList.toggle("bg-primary-container", isActive);
    item.classList.toggle("text-on-primary-container", isActive);
    item.classList.toggle("rounded-2xl", isActive);
    item.classList.toggle("text-on-surface-variant", !isActive);
    const icon = item.querySelector(".material-symbols-outlined");
    if (icon) icon.classList.toggle("is-filled", isActive);
  });

  /* ---------- Năm hiện tại ở footer ---------- */
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
})();
