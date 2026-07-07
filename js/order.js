/* ============================================================
   order.js — Đặt dịch vụ: tính giá tự động, form 3 bước,
   tải file đính kèm, mã giảm giá. Dùng cho services.html
   trong services.html.
   ============================================================ */
(function () {
  "use strict";

  const sb = window.sb;
  const toast = window.showToast || function (m) { alert(m); };

  // Lấy user đang đăng nhập (hoặc null)
  async function getSessionUser() {
    if (!sb) return null;
    const { data } = await sb.auth.getUser();
    return (data && data.user) || null;
  }

  // Đẩy một đơn hàng lên Supabase, trả về bản ghi đã tạo (hoặc ném lỗi)
  async function insertOrder(row) {
    const { data, error } = await sb.from("orders").insert([row]).select().single();
    if (error) throw error;
    return data;
  }

  /* ---------- Tải tệp lên Supabase Storage ---------- */
  const BUCKET = "academic-files";

  // Tạo tên file độc nhất, an toàn cho Storage (bỏ dấu, thêm mốc thời gian)
  const uniqueFileName = (name) => {
    const dot = name.lastIndexOf(".");
    const ext = dot > -1 ? name.slice(dot).toLowerCase() : "";
    const base = (dot > -1 ? name.slice(0, dot) : name)
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "") // bỏ dấu tiếng Việt
      .replace(/đ/gi, "d")
      .replace(/[^\w-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "tep";
    return Date.now() + "_" + base + ext;
  };

  // Upload 1 file, trả về Public URL (ném lỗi nếu thất bại)
  async function uploadFile(file) {
    const path = uniqueFileName(file.name);
    const { error } = await sb.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false
    });
    if (error) throw error;
    const { data: urlData } = sb.storage.from(BUCKET).getPublicUrl(path);
    return urlData.publicUrl;
  }

  // Sinh mã đơn hiển thị từ id thật của DB
  const orderCode = (id) => "ORD-" + String(id).padStart(4, "0");

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
    const deadlineInput = document.getElementById("deadline-input");
    const ppNote = document.getElementById("pp-price-note"); // chú thích giá PowerPoint theo slide
    const bigProjectField = document.getElementById("bigproject-field"); // khối "Loại bài tập lớn"
    const bigProjectType = document.getElementById("bigproject-type"); // select loại bài tập lớn

    let current = 1;
    const totalSteps = steps.length;

    /* ----- Bắt buộc đăng nhập mới được đặt dịch vụ ----- */
    let sessionUser = null;
    const nextParam = () =>
      encodeURIComponent((location.pathname.split("/").pop() || "services.html") + "#dat-hang");

    const loginBanner = document.createElement("div");
    loginBanner.className =
      "hidden mb-6 rounded-2xl border border-primary/30 bg-primary/5 px-5 py-4 flex items-start gap-3";
    loginBanner.innerHTML =
      '<span class="material-symbols-outlined text-primary flex-shrink-0">lock</span>' +
      '<div class="text-sm min-w-0"><p class="font-semibold text-on-surface">Bạn cần đăng nhập để đặt dịch vụ.</p>' +
      '<p class="text-on-surface-variant mt-0.5">Đăng nhập giúp lưu đơn và theo dõi tiến độ. ' +
      '<a class="text-primary font-semibold hover:underline" data-login-link href="login.html">Đăng nhập</a> · ' +
      '<a class="text-primary font-semibold hover:underline" href="register.html">Đăng ký</a></p></div>';
    form.prepend(loginBanner);

    const refreshAuthState = async () => {
      sessionUser = await getSessionUser();
      loginBanner.classList.toggle("hidden", !!sessionUser);
      const link = loginBanner.querySelector("[data-login-link]");
      if (link) link.setAttribute("href", "login.html?next=" + nextParam());
    };
    refreshAuthState();

    // Trả về true nếu đã đăng nhập; nếu chưa thì hiện thông báo + chuyển tới trang đăng nhập
    const ensureLoggedIn = async () => {
      if (sessionUser) return true;
      sessionUser = await getSessionUser(); // kiểm tra lại phòng khi vừa đăng nhập ở tab khác
      if (sessionUser) {
        loginBanner.classList.add("hidden");
        return true;
      }
      toast("Vui lòng đăng nhập để đặt dịch vụ.", "info");
      loginBanner.classList.remove("hidden");
      loginBanner.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => (window.location.href = "login.html?next=" + nextParam()), 1200);
      return false;
    };

    // Deadline tối thiểu là ngày mai
    if (deadlineInput) {
      const tomorrow = new Date(Date.now() + 86400000);
      deadlineInput.min = tomorrow.toISOString().split("T")[0];
    }

    /* ----- Đổi dịch vụ (onchange) -----
       Không còn tính tổng tiền: giá do Admin báo sau khi xem yêu cầu.
       Chỉ hiện chú thích đơn giá theo slide khi chọn PowerPoint. */
    const applyServiceMode = () => {
      const isPowerPoint = serviceSelect.value === "powerpoint";
      if (ppNote) ppNote.classList.toggle("hidden", !isPowerPoint);

      // "Bài tập lớn môn học" (value="thesis") → hiện chọn loại bài tập lớn, bắt buộc chọn
      const isBigProject = serviceSelect.value === "thesis";
      if (bigProjectField) bigProjectField.classList.toggle("hidden", !isBigProject);
      if (bigProjectType) {
        if (isBigProject) {
          bigProjectType.setAttribute("required", "");
        } else {
          bigProjectType.removeAttribute("required");
          bigProjectType.value = "";
          bigProjectType.classList.remove("field-error");
        }
      }
    };

    if (serviceSelect) serviceSelect.addEventListener("change", applyServiceMode);
    applyServiceMode(); // đồng bộ chú thích theo dịch vụ đang chọn

    /* ----- Bấm "Đặt ngay" ở thẻ dịch vụ → tự chọn đúng dịch vụ ----- */
    document.querySelectorAll("[data-service]").forEach((link) => {
      link.addEventListener("click", () => {
        const val = link.dataset.service;
        const opt = Array.from(serviceSelect.options).find((o) => o.value === val);
        if (opt) {
          serviceSelect.value = val;
          applyServiceMode();
        }
      });
    });

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
      const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
      };
      const bigProject =
        serviceSelect.value === "thesis" && bigProjectType && bigProjectType.value ? bigProjectType.value : "";
      set(
        "review-service",
        serviceSelect.options[serviceSelect.selectedIndex].text + (bigProject ? " · " + bigProject : "")
      );
      set("review-deadline", deadlineInput.value ? new Date(deadlineInput.value).toLocaleDateString("vi-VN") : "—");
      const method = form.querySelector('input[name="payment"]:checked');
      set("review-payment", method ? method.dataset.label : "—");
      const fileCount = fileStore.length;
      set("review-files", fileCount ? fileCount + " tệp đính kèm" : "Không có tệp");
    };

    const showSuccess = (code) => {
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
    };

    // Gửi đơn hàng lên Supabase (bước cuối)
    const submitOrder = async () => {
      // Bắt buộc đăng nhập trước khi đặt dịch vụ
      const user = await getSessionUser();
      if (!user) {
        toast("Vui lòng đăng nhập để hoàn tất đặt dịch vụ.", "info");
        const next = encodeURIComponent((location.pathname.split("/").pop() || "services.html") + "#dat-hang");
        setTimeout(() => (window.location.href = "login.html?next=" + next), 900);
        return;
      }

      const serviceText = serviceSelect.options[serviceSelect.selectedIndex].text;
      const note = (document.getElementById("order-note") || {}).value || "";
      const name = (document.getElementById("customer-name") || {}).value || "";
      const phone = (document.getElementById("customer-phone") || {}).value || "";
      const method = form.querySelector('input[name="payment"]:checked');
      const payLabel = method ? method.dataset.label : "";
      const fileNames = fileStore.map((f) => f.name).join(", ");
      const bigProject =
        serviceSelect.value === "thesis" && bigProjectType ? bigProjectType.value : "";

      const details = [
        bigProject ? "Loại bài tập lớn: " + bigProject : "",
        payLabel ? "Thanh toán: " + payLabel : "",
        name || phone ? "Liên hệ: " + [name, phone].filter(Boolean).join(" - ") : "",
        fileNames ? "Tệp đính kèm: " + fileNames : "",
        "Ghi chú: " + note
      ]
        .filter(Boolean)
        .join("\n");

      const row = {
        user_id: user.id,
        service_type: serviceText,
        deadline: deadlineInput && deadlineInput.value ? deadlineInput.value : null,
        details: details,
        file_url: null,
        total_price: 0, // Chưa báo giá — Admin sẽ cập nhật giá sau khi xem yêu cầu
        status: "pending"
      };

      btnNext.classList.add("is-busy");
      const label = btnLabel ? btnLabel.textContent : "";
      const restore = () => {
        btnNext.classList.remove("is-busy");
        if (btnLabel) btnLabel.textContent = label;
      };

      // 1) Tải tệp đính kèm lên Storage TRƯỚC (nếu có). Lỗi tải file -> dừng, không tạo đơn.
      if (fileStore.length) {
        if (btnLabel) btnLabel.textContent = "Đang tải tệp...";
        try {
          const urls = [];
          for (const f of fileStore) urls.push(await uploadFile(f));
          row.file_url = urls.join("\n");
        } catch (err) {
          console.error("[Order] upload lỗi:", err);
          toast(
            "Tải tệp lên thất bại: " +
              (/Payload too large|exceeded|size/i.test(err.message || "")
                ? "tệp vượt quá dung lượng cho phép."
                : err.message || "lỗi kết nối") +
              " Đơn hàng chưa được tạo.",
            "error"
          );
          restore();
          return;
        }
      }

      // 2) Chèn đơn hàng vào bảng orders
      if (btnLabel) btnLabel.textContent = "Đang gửi...";
      try {
        const created = await insertOrder(row);
        toast("Đơn hàng đã được ghi nhận. Chúng tôi sẽ liên hệ sớm!", "success", "Đặt dịch vụ thành công");
        showSuccess(orderCode(created.id));
      } catch (err) {
        console.error("[Order] insert lỗi:", err);
        toast(
          /Failed to fetch|network/i.test(err.message || "")
            ? "Lỗi kết nối mạng, vui lòng thử lại."
            : "Không gửi được đơn hàng: " + (err.message || "lỗi không xác định"),
          "error"
        );
        restore();
      }
    };

    if (btnNext) {
      btnNext.addEventListener("click", async () => {
        if (!validateStep(current)) return;
        // Chặn ngay từ bước 1: chưa đăng nhập thì không cho tiếp tục đặt dịch vụ
        if (current === 1 && !(await ensureLoggedIn())) return;
        if (current < totalSteps) {
          goToStep(current + 1);
        } else {
          submitOrder();
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
})();
