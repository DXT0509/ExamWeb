# Nền Tảng Luyện Thi Trực Tuyến (Exam Preparation App)

Ứng dụng web luyện thi trực tuyến hiện đại, bảo mật và chuẩn hoá theo chương trình giáo dục. Dự án được xây dựng bằng **Next.js (App Router)**, **TypeScript**, **Tailwind CSS** và cơ sở dữ liệu **Supabase (PostgreSQL + RLS + Auth + Storage)**.

---

## 🌟 Tính Năng Nổi Bật

### 1. Dành Cho Thí Sinh & Khách (Student & Guest)
- **Khám phá đề thi (Public Catalog)**: Tìm kiếm đề thi theo từ khóa, lọc theo môn học, danh mục (HSA, TSA, THPT Quốc Gia), phân trang phía máy chủ.
- **Phòng thi chuẩn hoá (Exam Engine)**:
  - Đồng hồ đếm ngược đồng bộ thời gian máy chủ (`server-based countdown`).
  - Lưu đáp án tự động tức thời (Idempotent Autosave).
  - Đánh dấu câu hỏi cần xem lại, thanh điều hướng câu hỏi linh hoạt.
  - Hỗ trợ câu hỏi có hình ảnh trực quan, định dạng rõ ràng.
- **Chống gian lận toàn màn hình (Fullscreen Integrity Guard)**:
  - Bắt buộc vào chế độ toàn màn hình khi làm bài thi quy chuẩn.
  - Cảnh báo và đếm ngược 5 giây khi người dùng thoát toàn màn hình hoặc chuyển tab.
  - Tự động nộp bài khi vi phạm quá thời gian quy định.
- **Tra cứu kết quả & Lời giải (Result & Review)**:
  - Chấm điểm tự động và thống kê số câu đúng/sai/bỏ qua.
  - Xem đáp án chi tiết và lời giải giải thích (theo cấu hình của quản trị viên).
- **Lịch sử thi & Tiến độ cá nhân (Student History)**:
  - Theo dõi toàn bộ lịch sử các lần thi, điểm số, thời gian hoàn thành.
  - Xem lại chi tiết từng bài thi đã nộp.
- **Thư viện tài liệu học tập (Study Documents)**: Xem và tải tài liệu ôn tập định dạng PDF, liên kết tham khảo.

### 2. Dành Cho Quản Trị Viên (Admin Portal)
- **Bảng điều khiển tổng quan (Admin Dashboard)**: Thống kê số lượng đề thi, học sinh, lượt thi, điểm trung bình và biểu đồ phân bổ.
- **Soạn thảo & Quản lý đề thi (Exam Builder)**:
  - Tạo đề thi, phân chia phần thi (sections), quản lý danh sách câu hỏi.
  - Tải ảnh câu hỏi trực tiếp từ máy tính hoặc qua liên kết URL.
  - Tùy chỉnh điểm từng câu, cấu hình thời gian thi, chọn chế độ toàn màn hình.
  - Thay đổi thứ tự câu hỏi và phần thi bằng nút điều hướng lên/xuống.
  - Quản lý trạng thái đề: `draft` (Bản nháp) -> `published` (Đã xuất bản) -> `closed` (Đóng thi) -> `archived` (Lưu trữ).
  - **Xóa đề thi an toàn**: Hỗ trợ xóa đề ở mọi trạng thái kèm xóa mềm liên đới (cascade soft-delete) và đóng các lượt thi đang diễn ra.
- **Quản lý học sinh (Student Management)**: Xem danh sách học sinh, khóa/mở khóa tài khoản học sinh (tự động thu hồi và nộp bài thi đang làm dở khi bị khóa).
- **Quản lý lượt thi (Attempts Management)**: Tra cứu lịch sử thi của toàn bộ thí sinh, xem chi tiết bài làm, reset lượt thi khi cần thiết.
- **Quản lý môn học & danh mục (Subjects & Categories)**: Thêm, sửa, xóa các môn học và phân loại bài thi.
- **Quản lý tài liệu (Document Management)**: Tải lên và quản lý kho tài liệu số cho học sinh.

---

## 🛠️ Yêu Cầu Kỹ Thuật

- **Node.js**: Phiên bản 20.x hoặc 22.x LTS.
- **npm**: Quản lý gói phụ thuộc theo `package-lock.json`.
- **Docker Desktop / Docker Engine**: Dùng để chạy Supabase Local.
- **Supabase CLI**: Sử dụng thông qua các lệnh npm script tích hợp sẵn.
- **k6** *(tùy chọn)*: Để chạy kiểm thử chịu tải 100 người dùng đồng thời.

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy Local

### 1. Cài đặt thư viện phụ thuộc
```bash
npm install
```

### 2. Khởi chạy Supabase Local
```bash
# Khởi động dịch vụ Supabase local qua Docker
npm run supabase:start

# Kiểm tra trạng thái các container Supabase
npm run supabase:status

# Áp dụng migrations và nạp dữ liệu mẫu (seed data)
npm run supabase:reset

# Tự động sinh kiểu dữ liệu TypeScript từ database schema
npm run supabase:types
```

- **Supabase Studio (Giao diện quản trị DB)**: `http://127.0.0.1:54323`
- **Supabase API Gateway**: `http://127.0.0.1:54321`
- **Mailpit (Hộp thư kiểm tra xác thực email)**: `http://127.0.0.1:54324`

### 3. Chạy ứng dụng Next.js ở môi trường phát triển
```bash
npm run dev
```
Mở trình duyệt tại địa chỉ: `http://localhost:3000`

---

## 👥 Tài Khoản Mẫu (Local Seed Users)

| Vai trò | Email | Mật khẩu | Quyền hạn |
| --- | --- | --- | --- |
| **Admin** | `admin@example.test` | `LocalAdmin123!` | Toàn quyền quản trị hệ thống, đề thi, học sinh, tài liệu |
| **Student (Active)** | `student1@example.test` | `LocalStudent123!` | Làm bài thi, xem kết quả, lịch sử cá nhân |
| **Student (Active 2)** | `student2@example.test` | `LocalStudent123!` | Thí sinh thứ hai để kiểm tra đa người dùng |
| **Student (Locked)** | `locked@example.test` | `LocalStudent123!` | Tài khoản bị khóa (chuyển hướng `/account-locked`) |

---

## 🧪 Quy Trình Kiểm Thử (Testing Suite)

Dự án sở hữu hệ thống kiểm thử toàn diện từ Unit Test, Integration Test đến End-to-End Test:

### 1. Chạy Typecheck & Linter
```bash
npm run typecheck
npm run lint
```

### 2. Chạy Toàn Bộ Unit & Integration Tests (Vitest)
```bash
npm test
```
*Tất cả 71 tests kiểm thử chức năng, RLS, tính điểm, chống gian lận, quản lý học sinh và đề thi.*

### 3. Chạy Integration Tests Chuyên Biệt
```bash
npm run test:integration
```

### 4. Chạy End-to-End Tests (Playwright)
```bash
# Chạy toàn bộ E2E tests
npm run test:e2e

# Chạy E2E với giao diện UI tương tác
npx playwright test --ui
```

### 5. Chạy Kiểm Thử Chịu Tải 100 VU (k6 Load Test)
Xem hướng dẫn chi tiết tại [scripts/load-test/README.md](./scripts/load-test/README.md):
```bash
# Khởi tạo 100 user học sinh giả lập
node scripts/load-test/seed-load-test-users.mjs

# Chạy k6 load test kịch bản 100 người làm bài và nộp bài đồng thời
k6 run scripts/load-test/k6-exam-load-test.js
```

---

## 📂 Cấu Trúc Tài Liệu Chi Tiết (Docs Directory)

- 📘 [docs/product-requirements.md](./docs/product-requirements.md): Yêu cầu nghiệp vụ, phạm vi sản phẩm và tiêu chuẩn chất lượng.
- 🔐 [docs/roles-permissions.md](./docs/roles-permissions.md): Ma trận phân quyền RBAC, kiểm soát truy cập và bảo mật Supabase RLS.
- 🗄️ [docs/database-schema.md](./docs/database-schema.md): Sơ đồ quan hệ thực thể ERD, cấu trúc bảng dữ liệu, ràng buộc và chỉ mục hiệu năng.
- 🔄 [docs/exam-lifecycle.md](./docs/exam-lifecycle.md): Vòng đời bài thi, máy trạng thái đề và lượt thi, xử lý đồng thời.
- 🛡️ [docs/fullscreen-policy.md](./docs/fullscreen-policy.md): Chính sách và cơ chế chống gian lận toàn màn hình.
- 🎨 [docs/ui-guidelines.md](./docs/ui-guidelines.md): Hướng dẫn phong cách giao diện, màu sắc, bố cục và khả năng tiếp cận.
- 📋 [docs/acceptance-tests.md](./docs/acceptance-tests.md): Danh mục tiêu chí nghiệm thu kiểm thử (Given-When-Then).

---

## 🏛️ Kiến Trúc Công Nghệ

- **Frontend**: Next.js 15 (App Router, Server Components & Server Actions), React 19.
- **Styling**: Tailwind CSS, Shadcn UI primitives, Lucide Icons, Glassmorphism design tokens.
- **Backend & Database**: Supabase PostgreSQL 15, Row Level Security (RLS), PL/pgSQL Stored Procedures & Triggers.
- **Authentication**: Supabase Auth với cơ chế Session Server-side validation.
- **Testing**: Vitest, React Testing Library, Playwright, k6.
