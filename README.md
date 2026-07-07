# 📚 Báo cáo giá rẻ — Academic & Office Excellence

Website dịch vụ Word, PowerPoint, Canva, tiểu luận, CV và luận văn dành cho sinh viên. Giao diện **responsive hoàn toàn** (desktop ↔ mobile trên cùng một trang), kèm **backend thật** bằng Supabase: đăng ký/đăng nhập phân quyền, đặt đơn có tải tệp đính kèm, và dashboard quản trị đồng bộ **thời gian thực**.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E?style=flat&logo=javascript&logoColor=black)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-Deploy-000000?style=flat&logo=vercel&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

---

## ✨ Tính năng

### Người dùng
- **Trang chủ** — hero, dịch vụ nổi bật, quy trình 4 bước, lý do chọn dịch vụ, nút liên hệ nhanh (Facebook) + popover email/Facebook.
- **Danh sách dịch vụ** — bộ lọc theo phân loại + khoảng giá + tag nhanh + tìm kiếm realtime, có empty state.
- **Đặt hàng 3 bước** — Thông tin → Thanh toán → Xác nhận, **tính giá tự động** (phụ phí hỏa tốc, mã giảm giá), kéo-thả tệp đính kèm được tải thẳng lên Supabase Storage.
- **Bắt buộc đăng nhập mới đặt được dịch vụ** — chặn ngay từ bước 1, tự chuyển tới trang đăng nhập kèm `?next=` để quay lại đúng form.
- **Đăng ký / Đăng nhập** — form riêng, phân quyền `user` / `admin`, tự điều hướng sau đăng nhập.

### Quản trị (admin)
- **Dashboard** — 4 thẻ thống kê **số liệu thật** (doanh thu, tổng đơn, chờ xử lý, hoàn thành) tính trực tiếp từ dữ liệu.
- **Đơn hàng** — bảng đơn kèm lọc trạng thái, xem chi tiết trong drawer, đổi trạng thái, tải tệp khách gửi, xóa đơn (xóa luôn tệp trong Storage).
- **Khách hàng** — danh sách hồ sơ, số đơn & tổng chi tiêu từng khách, xem chi tiết đơn của họ.
- **Cài đặt** — sửa hồ sơ admin, đăng xuất.
- **Đồng bộ thời gian thực** — đơn mới / đổi trạng thái / xóa hiện ngay không cần tải lại trang (Supabase Realtime).

### Chung
- **Responsive 100%** — mỗi trang tự chuyển layout desktop ↔ mobile bằng breakpoint Tailwind, không cần JS phát hiện thiết bị.
- **UX mượt** — scroll-reveal, menu mobile trượt, hamburger morph thành X, toast thông báo, tactile feedback khi bấm.
- **Điều hướng theo vai trò** — link "Quản trị" chỉ hiện với tài khoản admin.

## 🛠 Tech Stack

| Lớp | Công nghệ |
|---|---|
| **Frontend** | HTML5 thuần · [Tailwind CSS](https://tailwindcss.com/) (CDN) · Vanilla JavaScript (không framework/build tool) |
| **Backend (BaaS)** | [Supabase](https://supabase.com/) — **Auth**, **PostgreSQL + RLS**, **Storage**, **Realtime** |
| **Deploy** | [Vercel](https://vercel.com/) (static hosting) |
| **UI Kit** | [Material Symbols](https://fonts.google.com/icons) · font [Be Vietnam Pro](https://fonts.google.com/specimen/Be+Vietnam+Pro) |

> Supabase JS SDK v2 được nạp qua CDN (`@supabase/supabase-js@2`), khởi tạo client toàn cục `window.sb` trong `js/supabase-config.js`.

## ☁️ Backend Supabase

Kết nối **không hardcode** trong mã nguồn. `js/supabase-config.js` đọc từ `window.ENV`, do file `js/env.js` (tự sinh lúc build, đã `.gitignore`) cung cấp — xem [Biến môi trường & Deploy](#-biến-môi-trường--deploy-vercel).

**Bảng dữ liệu**
- `profiles` — `id` (UUID, ref `auth.users`), `email`, `full_name`, `phone`, `university`, `role` (`user` \| `admin`, mặc định `user`), `created_at`.
- `orders` — `id`, `user_id` (ref `profiles`), `service_type`, `deadline`, `details`, `file_url`, `total_price`, `status` (`pending` \| `processing` \| `completed` \| `cancelled`), `created_at`.

**Storage**
- Bucket công khai `academic-files` — tệp khách tải lên khi đặt đơn; tên tệp được chuẩn hóa (bỏ dấu + tiền tố `Date.now()`) để tránh trùng.

**SQL cần chạy trên Supabase** (một lần, phía dashboard — không chạy được từ code):
- Trigger `handle_new_user` đổ `raw_user_meta_data` (full_name/phone/university) sang `profiles`.
- Hàm `is_admin()` (SECURITY DEFINER).
- RLS policies cho `profiles` và `orders` — gồm **`orders_delete_admin`** cho phép admin xóa (thiếu policy này thì xóa đơn bị chặn im lặng).
- Bật realtime: `alter publication supabase_realtime add table public.orders;`
- Chỉ định tài khoản admin: `update public.profiles set role = 'admin' where email = '...';`

## 🔐 Biến môi trường & Deploy (Vercel)

Hai giá trị kết nối Supabase **không** được ghi cứng vào mã nguồn. Chúng đến từ biến môi trường và được nhúng vào trang lúc build bằng một script nhỏ:

| Biến | Ý nghĩa |
|---|---|
| `SUPABASE_URL` | URL dự án Supabase |
| `SUPABASE_ANON_KEY` | Publishable / anon key |

**Cơ chế:** vì đây là web thuần (không bundler), khi build, `scripts/generate-env.js` đọc 2 biến trên (từ hệ thống hoặc `.env`) rồi sinh ra `js/env.js` gán `window.ENV`. `supabase-config.js` đọc lại từ `window.ENV`; nếu thiếu sẽ báo lỗi rõ ràng thay vì fail âm thầm. File `js/env.js` và `.env` đều đã `.gitignore` nên không lên GitHub.

> ⚠️ Lưu ý bảo mật: với site tĩnh, anon key **luôn** xuất hiện trong trình duyệt của người dùng (nằm trong `js/env.js` đã build) — đây là key **public**, an toàn để lộ, và mọi quyền truy cập được bảo vệ bằng **RLS** phía Supabase. Cách này giúp **repo GitHub sạch** (không dán key vào source), chứ không phải giấu key khỏi người dùng cuối. Tuyệt đối **không** đặt `service_role` key ở đây.

### Chạy thử cục bộ

```bash
cp .env.example .env      # rồi điền SUPABASE_URL / SUPABASE_ANON_KEY thật
npm run build             # sinh js/env.js từ .env
npx serve .               # hoặc: python -m http.server 8080
```

> Dùng server thật để Supabase Auth lưu phiên đúng, đừng mở bằng `file://`. Cần mạng vì Tailwind CDN, Google Fonts và Supabase SDK tải trực tiếp.

### Thêm biến môi trường trên Vercel (từng bước)

1. Vào [vercel.com](https://vercel.com/) → mở **Project** của bạn (hoặc **Add New… → Project** rồi chọn repo GitHub).
2. Mở tab **Settings** → mục **Environment Variables**.
3. Thêm biến thứ nhất:
   - **Key**: `SUPABASE_URL`
   - **Value**: `https://<project-ref>.supabase.co`
   - **Environments**: tích cả **Production**, **Preview**, **Development** → **Save**.
4. Thêm biến thứ hai tương tự:
   - **Key**: `SUPABASE_ANON_KEY`
   - **Value**: publishable/anon key của bạn → **Save**.
5. Vào tab **Settings → Build & Deployment** (hoặc **General**) đặt:
   - **Framework Preset**: `Other`
   - **Build Command**: `npm run build` *(hoặc `node scripts/generate-env.js`)*
   - **Output Directory**: `.` *(thư mục chứa các file HTML)*
   - Nếu file dự án nằm trong thư mục con `academic-services-web/`, đặt **Root Directory** = `academic-services-web`.
6. Vào tab **Deployments** → **Redeploy** để Vercel chạy build và nhúng biến mới.

> Lấy giá trị 2 biến ở: Supabase Dashboard → **Project Settings → API** (`Project URL` và `anon public` / `publishable` key).

Deploy bằng CLI cũng được (sau khi đã thêm biến trên dashboard):

```bash
npm i -g vercel
vercel        # preview
vercel --prod # production
```

## 📁 Cấu trúc dự án

```
academic-services-web/
├── css/
│   └── style.css              # Reveal animation, menu mobile, toast, drawer, form
├── js/
│   ├── tailwind-config.js     # Token màu/chữ/spacing dùng chung cho Tailwind CDN
│   ├── env.js                 # (TỰ SINH khi build — .gitignore) window.ENV = key Supabase
│   ├── supabase-config.js     # Đọc window.ENV → khởi tạo client window.sb + helper showToast
│   ├── auth.js                # Đăng ký/đăng nhập, phân quyền, route guard, nav theo vai trò
│   ├── main.js                # Menu mobile, header cuộn, scroll reveal, bottom-nav
│   ├── order.js               # Tính giá, form 3 bước, upload file, bắt buộc đăng nhập
│   ├── admin-common.js        # Helper dùng chung: sidebar, drawer đơn, chuông, xóa đơn+tệp
│   ├── admin.js               # Dashboard + trang Đơn hàng (thống kê, bảng, realtime)
│   ├── admin-customers.js     # Trang Khách hàng
│   └── admin-settings.js      # Trang Cài đặt admin
├── scripts/
│   └── generate-env.js        # Sinh js/env.js từ biến môi trường lúc build
├── assets/
│   └── logo.svg               # Logo thương hiệu
├── package.json               # Script build/dev cho Vercel
├── .env.example               # Mẫu biến môi trường (sao thành .env)
├── index.html                 # Trang chủ
├── services.html              # Danh sách dịch vụ + đặt hàng
├── login.html                 # Đăng nhập
├── register.html              # Đăng ký
├── admin-dashboard.html       # Dashboard quản trị
├── admin-orders.html          # Quản lý đơn hàng
├── admin-customers.html       # Quản lý khách hàng
└── admin-settings.html        # Cài đặt admin
```

**Thứ tự nạp script mỗi trang:** CDN Supabase → `env.js` → `supabase-config.js` → `auth.js` → (`admin-common.js` với trang admin) → `main.js` → script riêng của trang (`order.js` / `admin.js` / …).

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
- Muốn có tài khoản admin: đăng ký như bình thường rồi chạy `update public.profiles set role='admin' where email='...';` trên Supabase.

## 📄 License

MIT
