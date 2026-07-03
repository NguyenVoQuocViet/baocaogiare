# 📚 Báo cáo giá rẻ — Academic & Office Excellence

Website dịch vụ Word, PowerPoint, Canva, tiểu luận, CV và luận văn dành cho sinh viên — xây dựng bằng **HTML5 + Tailwind CSS**, responsive hoàn toàn giữa desktop và mobile trên cùng một trang.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E?style=flat&logo=javascript&logoColor=black)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

---

## ✨ Tính năng

- **Trang chủ** — hero, 6 dịch vụ nổi bật, quy trình 4 bước, lý do chọn dịch vụ, đánh giá khách hàng.
- **Danh sách dịch vụ** — bộ lọc theo phân loại + khoảng giá + tag nhanh + tìm kiếm realtime, có empty state.
- **Đặt hàng nhanh 3 bước** — Thông tin → Thanh toán → Xác nhận, kèm **tính giá tự động** (phụ phí hỏa tốc, mã giảm giá), kéo-thả file đính kèm.
- **Chi tiết dịch vụ** — 3 gói giá (Cơ bản / Nâng cao / Premium), form đặt nhanh, đánh giá khách hàng, FAQ accordion.
- **Dashboard quản trị** — thống kê count-up, biểu đồ doanh thu tương tác (7 ngày/30 ngày/năm), bảng đơn hàng lọc + tìm kiếm theo trạng thái.
- **Responsive 100%** — mỗi trang tự chuyển đổi layout desktop ↔ mobile bằng breakpoint Tailwind, không cần JS phát hiện thiết bị.
- **UX mượt** — scroll-reveal, menu mobile trượt có stagger, hamburger morph thành X, tactile feedback khi bấm nút.

## 🛠 Tech Stack

- HTML5 thuần
- [Tailwind CSS](https://tailwindcss.com/) (qua CDN)
- Vanilla JavaScript (không dùng framework/build tool)
- [Material Symbols](https://fonts.google.com/icons) + font [Be Vietnam Pro](https://fonts.google.com/specimen/Be+Vietnam+Pro)

## 🚀 Chạy thử

Không cần cài đặt hay build. Mở trực tiếp `index.html` bằng trình duyệt, hoặc chạy server tĩnh:

```bash
npx serve .
# hoặc
python -m http.server 8080
```

> Cần kết nối mạng vì Tailwind CDN và Google Fonts được tải trực tiếp.

## 📁 Cấu trúc dự án

```
academic-services-web/
├── css/
│   └── style.css              # Reveal animation, menu mobile, biểu đồ, form
├── js/
│   ├── tailwind-config.js     # Token màu/chữ/spacing dùng chung cho Tailwind CDN
│   ├── main.js                # Menu mobile, header cuộn, scroll reveal, bottom-nav
│   ├── order.js                # Tính giá tự động, form 3 bước, upload file, mã giảm giá
│   └── admin.js                # Biểu đồ doanh thu, dịch vụ phổ biến, lọc đơn hàng
├── assets/
│   └── logo.svg                # Logo thương hiệu
├── index.html                  # Trang chủ
├── services.html               # Danh sách dịch vụ + đặt hàng nhanh
├── service-detail.html         # Chi tiết dịch vụ + bảng giá + FAQ
└── admin-dashboard.html        # Dashboard quản trị
```

## 🎨 Design System

| Token | Giá trị |
|---|---|
| Primary | `#2563EB` (Royal Blue) |
| CTA / Secondary | `#F97316` (Orange) |
| Highlight | `#FACC15` (Yellow) |
| Font | Be Vietnam Pro |
| Border radius | `rounded-lg` (nút/input) → `rounded-2xl` (card) |

Bảng màu biểu đồ đã kiểm chứng an toàn cho người mù màu (CVD-safe): `#2563eb` `#c2410c` `#0d9488` `#be185d`.

## 💡 Ghi chú demo

- Mã giảm giá thử nghiệm: `STUDENT20` (-20%), `BAOCAO10` (-10%).
- Deadline dưới 3 ngày sẽ cộng phụ phí hỏa tốc +30%.
- Dữ liệu đơn hàng / biểu đồ trong dashboard là dữ liệu mẫu, chưa kết nối backend.

## 📄 License

MIT
