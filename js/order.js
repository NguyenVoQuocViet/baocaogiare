/* ============================================================
   order.js — Đặt dịch vụ: tính giá tự động, form 3 bước,
   tải file đính kèm, mã giảm giá. Dùng cho services.html
   và service-detail.html (form đặt nhanh).
   ============================================================ */
(function () {
  "use strict";

  const VND = (n) => new Intl.NumberFormat("vi-VN").format(Math.max(0, Math.round(n))) + "đ";
  const RUSH_RATE = 0.3; // Phụ phí hỏa tốc +30% khi deadline < 3 ngày
  const PROMOS = {
    STUDENT20: { rate: 0.2, label: "Giảm 20% cho sinh viên" },
    BAOCAO10: { rate: 0.1, label: "Giảm 10% đơn đầu tiên" }
  };

  const daysUntil = (dateStr) => {
    if (!dateStr) return Infinity;
    const target = new Date(dateStr + "T23:59:59");
    return (target - new Date()) / 86400000;
  };

  /* ============================================================
     1) FORM ĐẶT HÀNG 3 BƯỚC (services.html)
     ============================================================ */
  const form = document.getElementById("order-form");
  if (form) {
    const steps = Array.from(form.querySelectorAll(".form-step"));
    const indicators = Array.from(document.querySelectorAll("[data-step-indicator]"));
    const lines = Array.from(document.querySelectorAll("[data-step-line]"));
    const btnNext = document.getElementById("btn-next");
    const btnPrev = document.getElementById("btn-prev");
    const btnLabel = document.getElementById("btn-next-label");

    const serviceSelect = document.getElementById("service-select");
    const qtyInput = document.getElementById("qty-input");
    const qtyUnit = document.getElementById("qty-unit");
    const deadlineInput = document.getElementById("deadline-input");
    const promoInput = document.getElementById("promo-input");
    const promoMsg = document.getElementById("promo-msg");

    const elBase = document.getElementById("price-base");
    const elRush = document.getElementById("price-rush");
    const elDiscount = document.getElementById("price-discount");
    const elTotal = document.getElementById("price-total");
    const elTotalBar = document.getElementById("price-total-bar");
    const discountRow = document.getElementById("discount-row");

    let current = 1;
    const totalSteps = steps.length;

    // Deadline tối thiểu là ngày mai
    if (deadlineInput) {
      const tomorrow = new Date(Date.now() + 86400000);
      deadlineInput.min = tomorrow.toISOString().split("T")[0];
    }

    /* ----- Tính giá ----- */
    const getPricing = () => {
      const opt = serviceSelect.options[serviceSelect.selectedIndex];
      const unitPrice = Number(opt.dataset.price || 0);
      const qty = Math.max(1, Number(qtyInput && qtyInput.value) || 1);
      const base = unitPrice * qty;

      const rush = daysUntil(deadlineInput && deadlineInput.value) < 3 ? base * RUSH_RATE : 0;

      const code = (promoInput && promoInput.value.trim().toUpperCase()) || "";
      const promo = PROMOS[code];
      const discount = promo ? (base + rush) * promo.rate : 0;

      return { base, rush, discount, total: base + rush - discount, promo, code };
    };

    const renderPricing = () => {
      const p = getPricing();
      if (elBase) elBase.textContent = VND(p.base);
      if (elRush) elRush.textContent = p.rush > 0 ? "+" + VND(p.rush) : "0đ";
      if (elDiscount) elDiscount.textContent = p.discount > 0 ? "-" + VND(p.discount) : "0đ";
      if (discountRow) discountRow.style.display = p.discount > 0 ? "flex" : "none";
      if (elTotal) elTotal.textContent = VND(p.total);
      if (elTotalBar) elTotalBar.textContent = VND(p.total);

      if (promoMsg) {
        if (!promoInput.value.trim()) {
          promoMsg.textContent = "";
        } else if (p.promo) {
          promoMsg.textContent = "Áp dụng thành công: " + p.promo.label + ".";
          promoMsg.className = "text-xs mt-1 text-primary font-medium";
        } else {
          promoMsg.textContent = "Mã không hợp lệ hoặc đã hết hạn.";
          promoMsg.className = "text-xs mt-1 text-error font-medium";
        }
      }

      if (qtyUnit && serviceSelect) {
        qtyUnit.textContent = serviceSelect.options[serviceSelect.selectedIndex].dataset.unit || "trang";
      }
    };

    ["change", "input"].forEach((evt) => {
      form.addEventListener(evt, renderPricing);
    });
    renderPricing();

    /* ----- Điều hướng bước ----- */
    const validateStep = (idx) => {
      const stepEl = steps[idx - 1];
      let ok = true;
      stepEl.querySelectorAll("[required]").forEach((field) => {
        const empty = !field.value || (field.type === "checkbox" && !field.checked);
        field.classList.toggle("field-error", empty);
        if (empty) ok = false;
      });
      const radioGroup = stepEl.querySelector("[data-radio-required]");
      if (radioGroup) {
        const name = radioGroup.dataset.radioRequired;
        if (!stepEl.querySelector(`input[name="${name}"]:checked`)) ok = false;
      }
      return ok;
    };

    const goToStep = (n) => {
      current = Math.min(Math.max(n, 1), totalSteps);
      steps.forEach((s, i) => s.classList.toggle("is-active", i === current - 1));
      indicators.forEach((ind) => {
        const stepNo = Number(ind.dataset.stepIndicator);
        const circle = ind.querySelector("[data-step-circle]");
        const done = stepNo < current;
        const active = stepNo === current;
        ind.classList.toggle("opacity-40", !active && !done);
        if (circle) {
          circle.classList.toggle("bg-primary", active || done);
          circle.classList.toggle("text-white", active || done);
          circle.classList.toggle("bg-surface-container-highest", !active && !done);
          circle.classList.toggle("text-on-surface-variant", !active && !done);
          circle.innerHTML = done ? '<span class="material-symbols-outlined text-[18px]">check</span>' : String(stepNo);
        }
      });
      lines.forEach((line, i) => {
        line.classList.toggle("bg-primary", i < current - 1);
        line.classList.toggle("bg-surface-container-highest", i >= current - 1);
      });
      if (btnPrev) btnPrev.classList.toggle("hidden", current === 1);
      if (btnLabel) btnLabel.textContent = current === totalSteps ? "Xác nhận đặt đơn" : "Tiếp theo";

      // Bước xác nhận: đổ dữ liệu xem lại
      if (current === totalSteps) fillReview();
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const fillReview = () => {
      const p = getPricing();
      const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
      };
      set("review-service", serviceSelect.options[serviceSelect.selectedIndex].text);
      set("review-qty", (qtyInput ? qtyInput.value : "1") + " " + (qtyUnit ? qtyUnit.textContent : ""));
      set("review-deadline", deadlineInput.value ? new Date(deadlineInput.value).toLocaleDateString("vi-VN") : "—");
      const method = form.querySelector('input[name="payment"]:checked');
      set("review-payment", method ? method.dataset.label : "—");
      set("review-total", VND(p.total));
      const fileCount = fileStore.length;
      set("review-files", fileCount ? fileCount + " tệp đính kèm" : "Không có tệp");
    };

    if (btnNext) {
      btnNext.addEventListener("click", () => {
        if (!validateStep(current)) return;
        if (current < totalSteps) {
          goToStep(current + 1);
        } else {
          // Hoàn tất: hiện màn hình thành công
          const code = "ORD-" + String(Math.floor(1000 + Math.random() * 9000));
          const codeEl = document.getElementById("success-code");
          if (codeEl) codeEl.textContent = code;
          form.classList.add("hidden");
          const bar = document.getElementById("order-bottom-bar");
          if (bar) bar.classList.add("hidden");
          const stepsHead = document.getElementById("order-steps");
          if (stepsHead) stepsHead.classList.add("hidden");
          const success = document.getElementById("order-success");
          if (success) {
            success.classList.remove("hidden");
            success.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }
      });
    }
    if (btnPrev) btnPrev.addEventListener("click", () => goToStep(current - 1));
    goToStep(1);

    /* ----- Tải file đính kèm ----- */
    const fileInput = document.getElementById("file-input");
    const fileDrop = document.getElementById("file-drop");
    const fileList = document.getElementById("file-list");
    let fileStore = [];

    const renderFiles = () => {
      if (!fileList) return;
      fileList.innerHTML = "";
      fileStore.forEach((f, idx) => {
        const row = document.createElement("div");
        row.className = "file-chip flex items-center justify-between gap-3 bg-surface-container-low border border-outline-variant/40 rounded-xl px-4 py-2.5";
        row.innerHTML =
          '<div class="flex items-center gap-2 min-w-0">' +
          '<span class="material-symbols-outlined text-primary text-[20px]">draft</span>' +
          '<span class="text-sm truncate">' + f.name + '</span>' +
          '<span class="text-xs text-on-surface-variant flex-shrink-0">(' + (f.size / 1048576).toFixed(1) + ' MB)</span>' +
          "</div>" +
          '<button type="button" aria-label="Xóa tệp" data-remove="' + idx + '" class="text-on-surface-variant hover:text-error transition-colors flex-shrink-0">' +
          '<span class="material-symbols-outlined text-[20px]">close</span></button>';
        fileList.appendChild(row);
      });
      fileList.querySelectorAll("[data-remove]").forEach((btn) =>
        btn.addEventListener("click", () => {
          fileStore.splice(Number(btn.dataset.remove), 1);
          renderFiles();
        })
      );
    };

    if (fileInput) {
      fileInput.addEventListener("change", () => {
        fileStore = fileStore.concat(Array.from(fileInput.files));
        fileInput.value = "";
        renderFiles();
      });
    }
    if (fileDrop) {
      ["dragenter", "dragover"].forEach((evt) =>
        fileDrop.addEventListener(evt, (e) => {
          e.preventDefault();
          fileDrop.classList.add("border-primary", "bg-primary-container/5");
        })
      );
      ["dragleave", "drop"].forEach((evt) =>
        fileDrop.addEventListener(evt, (e) => {
          e.preventDefault();
          fileDrop.classList.remove("border-primary", "bg-primary-container/5");
        })
      );
      fileDrop.addEventListener("drop", (e) => {
        if (e.dataTransfer && e.dataTransfer.files.length) {
          fileStore = fileStore.concat(Array.from(e.dataTransfer.files));
          renderFiles();
        }
      });
    }

    // Hiệu ứng scale nhẹ khi focus vào ô nhập
    form.querySelectorAll("input, select, textarea").forEach((el) => {
      el.addEventListener("focus", () => {
        el.parentElement.classList.add("scale-[1.01]", "transition-transform");
      });
      el.addEventListener("blur", () => {
        el.parentElement.classList.remove("scale-[1.01]");
        el.classList.remove("field-error");
      });
    });
  }

  /* ============================================================
     2) FORM ĐẶT NHANH + CHỌN GÓI (service-detail.html)
     ============================================================ */
  const quickForm = document.getElementById("quick-form");
  if (quickForm) {
    const totalEl = document.getElementById("quick-total");
    const promoEl = document.getElementById("quick-promo");
    const promoMsgEl = document.getElementById("quick-promo-msg");
    const deadlineEl = document.getElementById("quick-deadline");
    const packageLabel = document.getElementById("quick-package-label");
    const fileEl = document.getElementById("quick-file");
    const fileNameEl = document.getElementById("quick-file-name");
    let basePrice = Number(quickForm.dataset.basePrice || 1500000);

    if (deadlineEl) {
      const tomorrow = new Date(Date.now() + 86400000);
      deadlineEl.min = tomorrow.toISOString().split("T")[0];
    }

    const renderQuick = () => {
      let total = basePrice;
      if (daysUntil(deadlineEl && deadlineEl.value) < 3) total += basePrice * RUSH_RATE;
      const code = (promoEl && promoEl.value.trim().toUpperCase()) || "";
      const promo = PROMOS[code];
      if (promo) total -= total * promo.rate;
      if (totalEl) totalEl.textContent = VND(total);
      if (promoMsgEl) {
        if (!code) promoMsgEl.textContent = "";
        else if (promo) {
          promoMsgEl.textContent = promo.label + " đã được áp dụng.";
          promoMsgEl.className = "text-xs text-primary font-medium";
        } else {
          promoMsgEl.textContent = "Mã không hợp lệ.";
          promoMsgEl.className = "text-xs text-error font-medium";
        }
      }
    };

    quickForm.addEventListener("input", renderQuick);
    quickForm.addEventListener("change", renderQuick);
    renderQuick();

    if (fileEl && fileNameEl) {
      fileEl.addEventListener("change", () => {
        fileNameEl.textContent = fileEl.files.length ? "Đã chọn: " + fileEl.files[0].name : "Chọn file";
      });
    }

    // Chọn gói dịch vụ → cập nhật giá form đặt nhanh
    document.querySelectorAll("[data-package]").forEach((btn) => {
      btn.addEventListener("click", () => {
        basePrice = Number(btn.dataset.price || basePrice);
        if (packageLabel) packageLabel.textContent = btn.dataset.package;
        document.querySelectorAll("[data-package]").forEach((b) =>
          b.classList.toggle("ring-2", b === btn)
        );
        renderQuick();
        const aside = document.getElementById("booking-aside");
        if (aside) aside.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    quickForm.addEventListener("submit", (e) => {
      e.preventDefault();
      let ok = true;
      quickForm.querySelectorAll("[required]").forEach((field) => {
        field.classList.toggle("field-error", !field.value);
        if (!field.value) ok = false;
      });
      if (!ok) return;
      const success = document.getElementById("quick-success");
      if (success) {
        quickForm.classList.add("hidden");
        success.classList.remove("hidden");
      }
    });
    quickForm.querySelectorAll("input, textarea").forEach((el) =>
      el.addEventListener("input", () => el.classList.remove("field-error"))
    );
  }
})();
