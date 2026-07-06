/* ============================================================
   generate-env.js — Sinh file js/env.js từ biến môi trường.
   Chạy lúc build (Vercel) hoặc local qua `npm run build`.

   Nguồn giá trị (ưu tiên theo thứ tự):
     1. Biến môi trường hệ thống (Vercel tự set khi build).
     2. File .env ở thư mục gốc dự án (chỉ dùng cho local, đã .gitignore).

   Kết quả: js/env.js gán window.ENV = { SUPABASE_URL, SUPABASE_ANON_KEY }.
   File này KHÔNG commit lên Git (đã .gitignore) và được sinh lại mỗi lần build.
   ============================================================ */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

// Nạp .env cho môi trường local (không ghi đè biến đã có sẵn trên hệ thống).
const envFile = path.join(ROOT, ".env");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#") && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("\n[generate-env] ❌ Thiếu SUPABASE_URL hoặc SUPABASE_ANON_KEY.");
  console.error("  • Local : tạo file .env (xem .env.example) rồi chạy lại `npm run build`.");
  console.error("  • Vercel: Project → Settings → Environment Variables → thêm 2 biến này.\n");
  process.exit(1);
}

const banner = "/* ⚠️  File TỰ SINH khi build — KHÔNG commit, KHÔNG sửa tay. */\n";
const content =
  banner +
  "window.ENV = Object.freeze({\n" +
  "  SUPABASE_URL: " + JSON.stringify(SUPABASE_URL) + ",\n" +
  "  SUPABASE_ANON_KEY: " + JSON.stringify(SUPABASE_ANON_KEY) + "\n" +
  "});\n";

fs.writeFileSync(path.join(ROOT, "js", "env.js"), content, "utf8");
console.log("[generate-env] ✅ Đã sinh js/env.js từ biến môi trường.");
