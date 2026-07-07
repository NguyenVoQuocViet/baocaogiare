# Thư mục ảnh (images)

Bỏ ảnh của bạn vào đây để dùng cho **slideshow ở khu Hero trang chủ** (`index.html`).

## Ảnh slideshow trang chủ

Slideshow tự động đổi ảnh **sau mỗi 5 giây**. Mặc định nó dùng 3 ảnh với tên:

- `hero-1.jpg`
- `hero-2.jpg`
- `hero-3.jpg`

### Cách thay ảnh
1. Chuẩn bị ảnh **tỉ lệ ~3:2** (ví dụ 1200×800 px) cho đẹp.
2. Đặt tên đúng như trên (`hero-1.jpg`, `hero-2.jpg`, `hero-3.jpg`) rồi copy vào thư mục này, ghi đè file cũ.
3. Tải lại trang (Ctrl + F5).

> Nếu một file chưa có, slideshow sẽ tạm hiển thị ảnh mẫu (picsum) thay thế — không bị vỡ ảnh.

### Muốn thêm/bớt số ảnh slideshow
Mở `index.html`, tìm khối `id="hero-slideshow"`. Mỗi ảnh là một dòng:

```html
<img class="hero-slide" src="images/hero-4.jpg" alt="Mô tả ảnh"
     onerror="this.onerror=null;this.src='https://picsum.photos/seed/hero-4/1200/800'"/>
```

- **Thêm ảnh**: copy thêm một dòng `<img class="hero-slide" ...>` với tên file mới (vd `hero-4.jpg`).
- **Bớt ảnh**: xóa bớt dòng `<img class="hero-slide" ...>`.
- Ảnh đầu tiên nên giữ thêm class `is-active` để hiển thị ngay khi tải trang.

Tốc độ đổi ảnh (5 giây) chỉnh trong `js/main.js` — tìm `hero-slideshow`, sửa số `5000` (đơn vị mili-giây).
