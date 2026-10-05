# hillary23english — Quản lý thư viện nội bộ

Ứng dụng web nội bộ để lưu trữ và tra cứu sách: thêm/sửa/xóa sách, phân loại,
tải file sách (PDF/Word) lên và **đọc PDF trực tiếp trong trình duyệt**.
Giao diện tiếng Việt, dành cho nhân viên công ty dùng hằng ngày trên máy tính và điện thoại.

Không có mua bán, mượn/trả hay giỏ hàng — chỉ quản lý đầu sách và bản sách.

## Tính năng

- **Đăng nhập Google** qua Firebase Auth (popup), bảo vệ route bằng `RequireAuth` / `RedirectIfAuthed`.
- **Quản lý sách** (`/books`): tìm kiếm theo tên/tác giả, lọc thể loại, sắp xếp, phân trang 8 dòng/trang, thêm/sửa qua modal, xóa có xác nhận.
- **Đọc sách** (`/books/:id`): khung đọc PDF dựng bằng `pdfjs-dist` — cuộn liên tục, zoom 0.4–3×, toàn màn hình, hiển thị "Trang x / y", virtualization bằng `IntersectionObserver` (trang ngoài khung giải phóng canvas để tiết kiệm RAM). File `.doc/.docx` chỉ tải về.
- **Quản lý thể loại** (`/categories`): thêm, sửa inline, tìm kiếm; đổi tên thể loại sẽ đồng bộ batch cho toàn bộ sách đang gán tên cũ; chặn xóa khi còn sách.
- **Tổng quan** (`/`): số đầu sách / tổng số bản / số thể loại, biểu đồ thanh "Sách theo thể loại", 5 sách mới thêm gần đây.
- **Upload file**: ảnh bìa và file sách (`.pdf/.doc/.docx`, tối đa **10 MiB**) lên Cloudinary (unsigned), có hiển thị % tiến độ.
- **Kiểm tra dữ liệu hai lớp**: ở form và ở `services/api.js` (tên/tác giả ≥ 2 ký tự, năm 1000–2100, số bản ≥ 1, tên thể loại 2–50 ký tự, trùng tên bị chặn).
- **Thông báo lỗi tiếng Việt**, có phân biệt lỗi cấu hình, lỗi quyền, lỗi mạng.

## Công nghệ

| Thành phần | Thư viện |
| --- | --- |
| UI | React 19, Vite 8, JavaScript (không TypeScript) |
| Routing | react-router-dom v7 (khai báo router bằng object) |
| Giao diện | Bootstrap 5.3 + react-bootstrap, CSS thuần (`src/styles.css`), react-icons |
| Font | Be Vietnam Pro (Google Fonts) |
| Auth & database | Firebase 12 — Google Auth + Firestore |
| Đọc PDF | pdfjs-dist 6 (wasm JBIG2/OpenJPEG, cMaps, standard fonts đặt trong `public/pdfjs`) |
| Lưu trữ file | Cloudinary (upload unsigned, không dùng API key phía client) |

Scripts: `npm run dev`, `build`, `lint`, `preview`.

## Cài đặt và chạy

```bash
npm install
npm run dev        # http://localhost:5173
npm run lint       # kiểm tra lint
npm run build      # build ra dist/
npm run preview    # xem bản build
```

## Biến môi trường

Tạo file `.env` ở thư mục gốc (đã có sẵn mẫu trong repo) hoặc `.env.local` để ghi đè:

```bash
# Firebase (Auth + Firestore)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=<project>.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# Cloudinary — chỉ cần cloud name và upload preset unsigned
VITE_CLOUDINARY_CLOUD_NAME=
VITE_CLOUDINARY_UPLOAD_PRESET=
```

- Lấy Firebase values từ **Firebase Console → Project settings → Your apps** (web app).
- Tạo Cloudinary **upload preset** kiểu *Unsigned* (ví dụ tên `ebook-uploads`).
- **Không** đặt API key/secret của Cloudinary vào đây — code chạy phía trình duyệt, ai cũng đọc được.
- Nếu thiếu biến, app vẫn chạy nhưng báo lỗi rõ ràng khi đăng nhập/upload.
- Lưu ý: `.gitignore` chỉ chặn `*.local` (tức `.env.local`), file `.env` **vẫn bị commit** — đừng để secret thật trong đó.

## Mô hình dữ liệu

Mỗi người dùng có nhánh Firestore riêng, đường dẫn đã thể hiện chủ sở hữu
(không cần trường `ownerId`):

```
users/{uid}/books/{bookId}
  title, author, category, publisher, year, quantity, note,
  coverUrl, coverPath, fileUrl, fileName, fileType, filePath,
  createdAt, updatedAt

users/{uid}/categories/{categoryId}
  name, description, createdAt, updatedAt
```

`firestore.rules` chỉ cho đọc/ghi dưới `users/{uid}/**` khi
`request.auth.uid == userId`; mọi đường dẫn khác bị từ chối mặc định.

**Migration dữ liệu cũ:** `migrateLegacyData(uid)` trong `src/services/api.js`
tự chạy mỗi lần đăng nhập, chuyển collection gốc `books`/`categories` sang
`users/{uid}/…`. Hàm này chỉ có tác dụng khi rules Firestore còn ở chế độ mở;
sau khi deploy rules chặt, nó bị từ chối và tự bỏ qua (không ảnh hưởng người dùng).

## Cấu trúc thư mục

```
src/
  main.jsx                 # bootstrap CSS + React root
  App.jsx                  # router object, layout, guard
  auth/auth.jsx            # AuthProvider, useAuth, RequireAuth, RedirectIfAuthed
  config/
    firebase.js            # khởi tạo auth/db/googleProvider
    cloudinary.js          # URL upload, kiểm tra cấu hình
  services/
    api.js                 # toàn bộ đọc/ghi Firestore (component không truy cập trực tiếp)
    storage.js             # upload file/ảnh bìa lên Cloudinary, kiểm tra dung lượng
    pdfjs.js               # nạp pdfjs-dist trỏ tới asset trong public/pdfjs
  hooks/
    useBooks.js            # books, loading, error, save, remove, reload...
    useCategories.js       # categories, create, update, remove...
    useStats.js            # thống kê trang Tổng quan
  pages/
    Login.jsx  Dashboard.jsx  BookList.jsx  BookReader.jsx
    CategoryManager.jsx  NotFound.jsx
  components/
    Header.jsx  BookForm.jsx  CategoryForm.jsx  PdfViewer.jsx
    BookCover.jsx  ConfirmDelete.jsx  EmptyState.jsx  PageHeader.jsx
    IconButton.jsx
  styles.css               # CSS variables + các lớp giao diện riêng (đè biến Bootstrap)
public/pdfjs/              # wasm + cMaps + standard fonts cho pdfjs
firestore.rules            # rules bảo mật theo uid
firebase.json              # cấu hình Firestore rules + hosting (SPA rewrite)
```

Quy tắc: component chỉ gọi hàm trong `services/api.js`, không đọc/ghi Firestore
trực tiếp — dễ thay nguồn dữ liệu mà không sửa giao diện.

## Triển khai

```bash
npm run build
firebase deploy --only firestore:rules    # lần đầu / khi sửa rules
firebase deploy                           # deploy hosting (dist/) + rules
```

- `firebase.json` trỏ hosting tới `dist/`, có rewrite `** → /index.html` (SPA).
- Project mặc định khai báo trong `.firebaserc`.
- **Thứ tự quan trọng khi đổi rules:** deploy code trước khi rules còn mở
  (để migration chạy được), sau đó mới `firebase deploy --only firestore:rules`.

## Ghi chú kỹ thuật

- **pdfjs:** asset wasm (`jbig2`, `openjpeg`, `quickjs-eval`, `qcms`) nằm trong
  `public/pdfjs/wasm`. Bắt buộc khai báo `wasmUrl`/`cMapUrl` đúng, nếu không
  PDF quét (scan) sẽ ra trang trắng.
- **Giới hạn upload:** Cloudinary free giới hạn 10 MiB/upload — app kiểm tra ngay
  ở client (`MAX_FILE_SIZE` trong `services/storage.js`) thay vì gửi lên rồi bị từ chối.
- **Xóa thể loại:** nếu còn sách đang gán thể loại đó, API từ chối và báo số cuốn;
  phải chuyển sách sang thể loại khác trước.
- **Trạng thái UI:** có đủ đang tải, danh sách trống, không có kết quả khớp bộ lọc, và lỗi thao tác.
- **Truy cập (a11y):** mọi input có label, focus bàn phím rõ, `role="alert"` cho lỗi,
  tôn trọng `prefers-reduced-motion`; bảng cuộn ngang trong khung riêng trên màn hình nhỏ.
