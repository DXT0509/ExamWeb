# Phân Quyền & Kiểm Soát Truy Cập (Roles & Permissions)

- **Ngày cập nhật**: 2026-08-22
- **Phiên bản**: 1.0
- **Trạng thái**: Đã nghiệm thu & Hoạt động

---

## Mục Lục

1. [Các nhóm vai trò người dùng (Roles)](#1-các-nhóm-vai-trò-người-dùng-roles)
2. [Ma trận phân quyền chức năng](#2-ma-trận-phân-quyền-chức-năng)
3. [Ma trận phân quyền dữ liệu (CRUD & RLS)](#3-ma-trận-phân-quyền-dữ-liệu-crud--rls)
4. [Cấu trúc Route & Quy tắc chuyển hướng](#4-cấu-trúc-route--quy-tắc-chuyển-hướng)
5. [Quy tắc bảo mật tài khoản & Vai trò](#5-quy-tắc-bảo-mật-tài-khoản--vai-trò)
6. [Chính sách Supabase Row Level Security (RLS)](#6-chính-sách-supabase-row-level-security-rls)
7. [Các thao tác đặc quyền phía máy chủ (Server-Only / RPC)](#7-các-thao-tác-đặc-quyền-phía-máy-chủ-server-only--rpc)
8. [Các lỗ hổng bảo mật đã được phòng chống](#8-các-lỗ-hổng-bảo-mật-đã-được-phòng-chống)

---

## 1. Các Nhóm Vai Trò Người Dùng (Roles)

Hệ thống quản lý người dùng dựa trên 3 nhóm vai trò cơ bản:

| Vai trò | Mô tả | Nguồn gốc định danh |
| --- | --- | --- |
| **Guest (Khách)** | Người dùng vãng lai chưa đăng nhập | Không có phiên Supabase Auth; nhận diện qua cookie hash tạm thời |
| **Student (Học sinh)** | Thí sinh có tài khoản hợp lệ | `auth.users` kết hợp bản ghi `profiles` có `role = 'student'` |
| **Admin (Quản trị viên)** | Người quản trị hệ thống | `auth.users` kết hợp bản ghi `profiles` có `role = 'admin'` |

> [!IMPORTANT]
> **Nguyên tắc bảo mật cốt lõi**:
> - Việc ẩn nút trên giao diện chỉ mang tính chất trải nghiệm (UX), không được xem là giải pháp bảo mật.
> - Vai trò gửi từ client hoàn toàn không đáng tin cậy. Mọi thao tác đều được kiểm tra vai trò tại máy chủ (`requireRole`) và bảo vệ bằng PostgreSQL Row Level Security (RLS).

---

## 2. Ma Trận Phân Quyền Chức Năng

| Chức năng hệ thống | Guest | Student (Active) | Student (Locked) | Admin |
| --- | :---: | :---: | :---: | :---: |
| Xem trang chủ & danh mục đề công khai | Cho phép | Cho phép | Cho phép | Cho phép |
| Tìm kiếm, lọc đề thi | Cho phép | Cho phép | Cho phép | Cho phép |
| Làm đề thi cho phép thi thử (`allow_guest_attempt = true`) | Cho phép | Cho phép | Từ chối | Cho phép |
| Làm đề thi dành riêng cho học sinh (`access_type = students_only`) | Từ chối | Cho phép | Từ chối | Cho phép (Preview) |
| Làm đề thi nội bộ (`access_type = private`) | Từ chối | Từ chối | Từ chối | Cho phép (Preview) |
| Lưu đáp án tự động & Nộp bài thi | Phỏng thi tạm | Bài thi cá nhân | Từ chối | Quản trị |
| Xem kết quả & Lời giải sau khi nộp (theo cấu hình đề) | Bài vừa làm | Lịch sử cá nhân | Chỉ xem lại bài cũ | Toàn bộ thí sinh |
| Xem lịch sử thi cá nhân (`/student/history`) | Từ chối | Cho phép | Từ chối | Toàn bộ lịch sử |
| Quản lý môn học, danh mục, đề thi | Từ chối | Từ chối | Từ chối | Toàn quyền (CRUD) |
| Tải ảnh câu hỏi lên máy chủ | Từ chối | Từ chối | Từ chối | Cho phép |
| Xóa đề thi (xóa mềm liên đới & kết thúc bài thi dở) | Từ chối | Từ chối | Từ chối | Cho phép |
| Khóa / Mở khóa tài khoản học sinh | Từ chối | Từ chối | Từ chối | Cho phép |
| Tra cứu & Reset lượt thi của thí sinh | Từ chối | Từ chối | Từ chối | Cho phép |
| Quản lý & Tải lên tài liệu ôn tập | Chỉ xem công khai | Xem tài liệu được cấp | Xem tài liệu công khai | Toàn quyền (CRUD) |

---

## 3. Ma Trận Phân Quyền Dữ Liệu (CRUD & RLS)

| Bảng dữ liệu | Guest | Student | Admin |
| --- | --- | --- | --- |
| `profiles` | Không đọc | Đọc & sửa thông tin cá nhân (không được sửa `role`/`status`) | Xem danh sách học sinh, khóa/mở khóa qua RPC |
| `subjects` | Đọc môn học đang kích hoạt | Đọc môn học đang kích hoạt | Toàn quyền CRUD |
| `exam_categories` | Đọc danh mục đang kích hoạt | Đọc danh mục đang kích hoạt | Toàn quyền CRUD |
| `exams` | Đọc đề `published` + `public` | Đọc đề `published` (`public` và `students_only`) | Toàn quyền CRUD |
| `exam_sections` | Đọc phần thi của đề được phép | Đọc phần thi của đề được phép | Toàn quyền CRUD |
| `questions` | Đọc câu hỏi qua View/RPC (không lộ đáp án đúng) | Đọc câu hỏi qua View/RPC (không lộ đáp án đúng) | Toàn quyền CRUD |
| `question_options` | Đọc lựa chọn qua View/RPC (ẩn `is_correct`) | Đọc lựa chọn qua View/RPC (ẩn `is_correct`) | Toàn quyền CRUD |
| `exam_attempts` | Đọc/ghi lượt thi của chính mình qua token hash | Đọc/ghi lượt thi của chính mình (`student_id = auth.uid()`) | Đọc toàn bộ, reset lượt thi |
| `attempt_answers` | Ghi đáp án cho lượt thi của mình khi `in_progress` | Ghi đáp án cho lượt thi của mình khi `in_progress` | Đọc toàn bộ |
| `exam_events` | Ghi sự kiện phòng thi của mình | Ghi sự kiện phòng thi của mình | Đọc toàn bộ |
| `documents` | Đọc tài liệu công khai (`status = published`, `is_public = true`) | Đọc tài liệu được phép | Toàn quyền CRUD |

---

## 4. Cấu Trúc Route & Quy Tắc Chuyển Hướng

### Danh mục Route

- **Route Công khai (Public)**:
  - `/` (Trang chủ)
  - `/exams` (Thư viện đề thi)
  - `/exams/[slug]` (Chi tiết đề thi)
  - `/documents` (Thư viện tài liệu)
  - `/login` (Đăng nhập)
  - `/register` (Đăng ký)
  - `/attempts/[attemptId]` (Màn hình làm bài)
  - `/attempts/[attemptId]/result` (Màn hình kết quả bài thi)
  - `/account-locked` (Thông báo tài khoản bị khóa)

- **Route Học sinh (Student Area)**:
  - `/student` (Bảng điều khiển học sinh)
  - `/student/history` (Lịch sử làm bài & kết quả)
  - `/student/profile` (Thông tin tài khoản)

- **Route Quản trị viên (Admin Portal)**:
  - `/admin` (Bảng điều khiển tổng quan)
  - `/admin/exams` (Danh sách đề thi)
  - `/admin/exams/new` (Tạo đề thi mới)
  - `/admin/exams/[examId]` (Trình soạn thảo đề thi - Exam Builder)
  - `/admin/students` (Quản lý học sinh & khóa tài khoản)
  - `/admin/attempts` (Quản lý lượt thi & reset bài)
  - `/admin/subjects` (Quản lý môn học)
  - `/admin/categories` (Quản lý danh mục)
  - `/admin/documents` (Quản lý kho tài liệu)

### Bảng Quy Tắc Chuyển Hướng (Redirect Rules)

| Tình huống truy cập | Hành động & Đích chuyển hướng |
| --- | --- |
| Khách truy cập Route Student hoặc Admin | Chuyển hướng về `/login?next=...` |
| Học sinh truy cập Route Admin (`/admin/*`) | Chuyển hướng về `/student` kèm thông báo không đủ thẩm quyền |
| Quản trị viên truy cập màn hình đăng nhập `/login` | Chuyển hướng trực tiếp vào `/admin` |
| Học sinh truy cập màn hình đăng nhập `/login` | Chuyển hướng trực tiếp vào `/student` |
| Tài khoản học sinh đang bị khóa (`status = locked`) | Chuyển hướng về trang `/account-locked` |

---

## 5. Quy Tắc Bảo Mật Tài Khoản & Vai Trò

1. **Khóa tài khoản học sinh**:
   - Khi quản trị viên thực hiện khóa tài khoản qua hàm `admin_lock_student`, tài khoản chuyển sang trạng thái `locked`.
   - Nếu học sinh đang có bài thi ở trạng thái `in_progress`, hệ thống tự động kết thúc bài thi với `status = 'auto_submitted'`, `submit_reason = 'account_locked'` và chấm điểm các câu đã được hệ thống xác nhận trước đó.
   - Học sinh bị khóa không thể tạo bài thi mới và không thể lưu thêm đáp án.
2. **Khách làm bài thi (Guest Session)**:
   - Sử dụng cơ chế mã hóa `guest_session_hash` được lưu trữ an toàn trong cookie HTTP-only.
   - Thao tác nộp bài và lưu đáp án bắt buộc phải khớp với hash này; việc biết `attemptId` không đủ để can thiệp vào bài thi của người khác.
3. **Chống tự nâng quyền (Privilege Escalation)**:
   - Các API cập nhật hồ sơ cá nhân chỉ cho phép thay đổi `display_name`, hoàn toàn bỏ qua các trường `role` và `status` từ payload của client.

---

## 6. Chính Sách Supabase Row Level Security (RLS)

- **`public.is_admin()` Function**: Kiểm tra quyền quản trị viên an toàn bằng cách truy vấn bảng `profiles` với `auth.uid()`, có cơ chế caching cấp session.
- **`public_exam_catalog` View**: View trung gian an toàn (`security_invoker = true`) cho phép truy vấn metadata của đề thi mà không chứa dữ liệu nhạy cảm.
- **Chính sách phân tách đáp án đúng**:
  ```sql
  -- Khách và học sinh không thể đọc trực tiếp trường is_correct
  create policy "Admins can manage options" on public.question_options
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
  ```

---

## 7. Các Thao Tác Đặc Quyền Phía Máy Chủ (Server-Only / RPC)

Các quy trình nghiệp vụ phức tạp được thực thi thông qua Stored Procedures (PL/pgSQL Security Definer) để đảm bảo tính toàn vẹn:

1. `publish_exam(exam_id uuid)`: Kiểm tra cấu trúc đề thi, tính tổng điểm và khóa nội dung đề thi.
2. `delete_exam(p_exam_id uuid)`: Xóa mềm đề thi, phần thi, câu hỏi, đáp án và kết thúc các lượt thi đang diễn ra.
3. `start_exam_attempt(...)`: Tạo lượt thi và tính hạn nộp bài (`deadline_at`) hoàn toàn bằng thời gian máy chủ.
4. `save_attempt_answer(...)`: Lưu đáp án idempotent theo cơ chế upsert với khóa `(attempt_id, question_id)`.
5. `submit_exam_attempt(...)`: Nộp bài, khóa lượt thi, so khớp đáp án đúng và tính điểm số với Row Lock (`SELECT FOR UPDATE`).
6. `admin_lock_student(target_student_id uuid)`: Khóa học sinh và tự động nộp bài thi đang diễn ra.
7. `admin_unlock_student(target_student_id uuid)`: Mở khóa tài khoản học sinh.
8. `admin_reset_attempt(target_attempt_id uuid)`: Xóa bỏ lượt thi bị lỗi để học sinh làm lại.

---

## 8. Các Lỗ Hổng Bảo Mật Đã Được Phòng Chống

| Lỗ hổng tiềm ẩn | Kỹ thuật tấn công | Giải pháp ngăn chặn triệt để |
| --- | --- | --- |
| **Lộ đáp án qua DevTools** | Kiểm tra Network tab tìm `is_correct` | Ẩn hoàn toàn trường `is_correct` trong câu lệnh SELECT của học sinh; chỉ giải mã khi đã nộp bài |
| **Sửa điểm số phía client** | Gửi kèm `score` trong payload nộp bài | Máy chủ bỏ qua mọi tham số điểm gửi lên và tự động tính toán từ bảng `question_options` |
| **Kéo dài thời gian thi** | Sửa đổi đồng hồ máy tính cá nhân | Thời gian bắt đầu và hạn nộp được lưu dưới dạng `timestamptz` trên PostgreSQL máy chủ |
| **Nộp bài trùng lặp (Race Condition)** | Gửi nhiều request nộp bài cùng lúc | Áp dụng Transaction với Row Lock và Idempotency Key |
| **Sửa đáp án sau khi nộp** | Gửi request `saveAnswer` sau khi đã nộp | Máy chủ kiểm tra `status = 'in_progress'` trước khi cho phép ghi đè đáp án |
| **Can thiệp bài thi người khác** | Đoán ID bài thi (`attemptId`) | RLS kiểm tra chặt chẽ `student_id = auth.uid()` hoặc so khớp `guest_session_hash` |
