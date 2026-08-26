# Danh Mục Tiêu Chí Nghiệm Thu (Acceptance Tests)

- **Ngày cập nhật**: 2026-08-22
- **Phiên bản**: 1.0
- **Trạng thái**: Đã nghiệm thu & Hoạt động (Toàn bộ 71/71 tests đã PASS)

---

## Mục Lục

1. [Chiến lược kiểm thử tổng thể](#1-chiến-lược-kiểm-thử-tổng-thể)
2. [Phân loại kiểm thử](#2-phân-loại-kiểm-thử)
3. [Quy ước định dạng Given - When - Then](#3-quy-ước-định-dạng-given---when---then)
4. [Dữ liệu kiểm thử chuẩn bị (Test Fixtures)](#4-dữ-liệu-kiểm-thử-chuẩn-bị-test-fixtures)
5. [Danh mục kịch bản kiểm thử theo Module](#5-danh-mục-kịch-bản-kiểm-thử-theo-module)
6. [Kiểm thử chịu tải 100 người dùng đồng thời (k6 Load Testing)](#6-kiểm-thử-chịu-tải-100-người-dùng-đồng-thời-k6-load-testing)

---

## 1. Chiến Lược Kiểm Thử Tổng Thể

Hệ thống áp dụng mô hình kim tự tháp kiểm thử (Testing Pyramid) đa tầng nhằm đảm bảo chất lượng phần mềm toàn diện:
- **Unit Testing**: Kiểm thử độc lập các hàm tiện ích, tính toán điểm số, chuyển đổi dữ liệu và bộ giải mã validation (Zod schemas).
- **Integration Testing**: Kiểm thử tích hợp trực tiếp với cơ sở dữ liệu Supabase Local (xác thực quyền truy cập Row Level Security, các Stored Procedures PL/pgSQL, xử lý tranh chấp transaction và các Server Actions).
- **End-to-End (E2E) Testing**: Sử dụng **Playwright** mô phỏng hành vi người dùng thực tế trên trình duyệt (quy trình đăng nhập, làm bài thi, vi phạm toàn màn hình, xem kết quả, quản trị viên soạn đề và xóa đề).
- **Performance & Load Testing**: Sử dụng **k6** kiểm thử hiệu năng và độ ổn định với 100 người dùng đồng thời thực hiện làm bài và nộp bài.

---

## 2. Phân Loại Kiểm Thử

| Loại kiểm thử | Mục đích | Công cụ sử dụng | Lệnh thực thi |
| --- | --- | --- | --- |
| **Unit & Integration** | Kiểm tra logic nghiệp vụ, bảo mật RLS và RPCs | **Vitest** | `npm test` |
| **E2E Testing** | Kiểm tra toàn bộ luồng người dùng trên UI | **Playwright** | `npm run test:e2e` |
| **Typecheck & Lint** | Kiểm tra kiểu dữ liệu TypeScript & chuẩn code | **tsc, ESLint** | `npm run typecheck && npm run lint` |
| **Load Testing** | Kiểm thử chịu tải 100 người dùng đồng thời | **k6** | `k6 run scripts/load-test/k6-exam-load-test.js` |

---

## 3. Quy Ước Định Dạng Given - When - Then

Mỗi kịch bản kiểm thử được định nghĩa theo chuẩn:
- **Mã kiểm thử (Test ID)**: Định danh duy nhất theo module (ví dụ: `AT-EXAM-001`).
- **Given (Điều kiện ban đầu)**: Trạng thái hệ thống, quyền hạn người dùng và dữ liệu sẵn có.
- **When (Hành động)**: Thao tác do người dùng hoặc hệ thống kích hoạt.
- **Then (Kết quả mong đợi)**: Trạng thái thay đổi có thể kiểm chứng được của hệ thống và cơ sở dữ liệu.

---

## 4. Dữ Liệu Kiểm Thử Chuẩn Bị (Test Fixtures)

- **Tài khoản Quản trị viên**: `admin@example.test` (Role `admin`, Status `active`).
- **Tài khoản Học sinh 1**: `student1@example.test` (Role `student`, Status `active`).
- **Tài khoản Học sinh 2**: `student2@example.test` (Role `student`, Status `active`).
- **Tài khoản Học sinh bị khóa**: `locked@example.test` (Role `student`, Status `locked`).
- **Đề thi mẫu**:
  - `de-cong-khai-nen-tang-so`: Trạng thái `published`, `access_type = public`, cho phép Khách làm bài.
  - `de-danh-cho-hoc-vien-doc-hieu`: Trạng thái `published`, `access_type = students_only`.
  - `de-rieng-cua-quan-tri-vien`: Trạng thái `published`, `access_type = private`.
  - `de-nhap-tu-duy-dinh-luong`: Trạng thái `draft`.

---

## 5. Danh Mục Kịch Bản Kiểm Thử Theo Module

### 5.1. Xác Thực & Phân Quyền (Authentication & RBAC)

| Mã test | Module | Given (Điều kiện) | When (Hành động) | Then (Kết quả mong đợi) | Loại | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- |
| **AT-AUTH-001** | Xác thực | Email mới hợp lệ | Thực hiện đăng ký | Tạo tài khoản thành công với role `student` | E2E | **PASS** |
| **AT-AUTH-002** | Xác thực | Học sinh active | Đăng nhập hệ thống | Đăng nhập thành công, chuyển hướng vào `/student` | E2E | **PASS** |
| **AT-AUTH-003** | Xác thực | Học sinh bị khóa | Đăng nhập hệ thống | Chuyển hướng sang `/account-locked`, chặn mọi quyền thi | E2E | **PASS** |
| **AT-RBAC-001** | Phân quyền | Học sinh thường | Cố truy cập `/admin/*` | Bị chặn và chuyển hướng về `/student` | E2E | **PASS** |
| **AT-RBAC-002** | Phân quyền | Học sinh thường | Gọi API quản trị | Máy chủ trả mã lỗi 403 Forbidden | Integration | **PASS** |
| **AT-RLS-001** | Bảo mật RLS | Học sinh 1 | Truy vấn bài làm Học sinh 2 | Không nhận được dữ liệu (bảo vệ bởi RLS) | Integration | **PASS** |
| **AT-RLS-002** | Chống lộ đáp án | Bài thi đang làm | Truy vấn danh sách lựa chọn | Tuyệt đối không nhận trường `is_correct` | Integration | **PASS** |

### 5.2. Quản Lý Đề Thi & Trình Soạn Đề (Exam Builder & Admin)

| Mã test | Module | Given (Điều kiện) | When (Hành động) | Then (Kết quả mong đợi) | Loại | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- |
| **AT-EXAM-001** | Soạn đề | Quản trị viên | Tạo đề thi mới ở trạng thái Draft | Lưu thành công đề thi với slug không trùng | Integration | **PASS** |
| **AT-EXAM-002** | Soạn đề | Đề thi Draft | Thêm phần thi và câu hỏi | Vị trí câu hỏi (`position`) tự động tăng dần | Integration | **PASS** |
| **AT-EXAM-003** | Tải ảnh | Đang soạn câu hỏi | Tải file ảnh từ máy tính lên | Lưu vào thư mục `public/uploads/questions/` và gắn link | Integration | **PASS** |
| **AT-EXAM-004** | Xuất bản | Đề thi đủ phần thi, câu hỏi | Quản trị viên nhấn Xuất bản | Trạng thái đổi sang `published`, tính tổng điểm tự động | Integration | **PASS** |
| **AT-EXAM-005** | Khóa nội dung | Đề đã xuất bản | Cố sửa điểm số câu hỏi | Database trigger chặn và báo lỗi `EXAM_CONTENT_LOCKED` | Integration | **PASS** |
| **AT-EXAM-006** | Xóa đề thi | Đề thi ở bất kỳ trạng thái nào | Quản trị viên nhấn Xóa đề thi | Xóa mềm đề, xóa mềm sections/questions và hết hạn các bài dở | Integration | **PASS** |
| **AT-EXAM-007** | Nhân bản | Đề thi đã có lượt thi | Quản trị viên nhấn Nhân bản | Tạo bản sao độc lập ở dạng Draft với ID mới hoàn toàn | Integration | **PASS** |

### 5.3. Phòng Thi, Chống Gian Lận & Lưu Đáp Án (Exam Engine & Integrity)

| Mã test | Module | Given (Điều kiện) | When (Hành động) | Then (Kết quả mong đợi) | Loại | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- |
| **AT-ATT-001** | Khởi tạo | Đề thi bắt buộc fullscreen | Bắt đầu làm bài | Kích hoạt toàn màn hình rồi mới tạo `deadline_at` server | E2E | **PASS** |
| **AT-ATT-002** | Khởi tạo trùng | Đang có bài thi in_progress | Nhấn bắt đầu lại | Trả về bài thi đang làm, không tạo bài mới | Integration | **PASS** |
| **AT-ANS-001** | Autosave | Bài thi in_progress | Chọn đáp án | Lưu tức thời theo cặp `(attempt_id, question_id)` | Integration | **PASS** |
| **AT-REFRESH-001** | Tải lại trang | Đã làm được một số câu | Nhấn F5 tải lại trang | Khôi phục đầy đủ các đáp án đã chọn và đồng hồ thi | E2E | **PASS** |
| **AT-FULL-001** | Vi phạm | Đang làm bài thi | Nhấn ESC thoát fullscreen | Màn hình khóa đếm ngược 5 giây xuất hiện | E2E | **PASS** |
| **AT-FULL-002** | Khắc phục | Màn hình khóa đếm ngược | Nhấn "Quay lại toàn màn hình" | Đóng màn hình khóa và cho phép tiếp tục làm bài | E2E | **PASS** |
| **AT-FULL-003** | Phạt vi phạm | Màn hình khóa đếm ngược | Quá 5 giây không quay lại | Tự động nộp bài với `submit_reason = fullscreen_violation` | E2E | **PASS** |
| **AT-EXPIRE-001** | Hết giờ | Hết thời gian làm bài | Đồng hồ về 0 hoặc gọi API | Tự động nộp bài với `submit_reason = time_expired` | Integration | **PASS** |
| **AT-SUBMIT-001** | Nộp bài | Bài thi in_progress | Nhấn Nộp bài | Chấm điểm tự động, tính đúng/sai/bỏ qua chính xác | Integration | **PASS** |
| **AT-SUBMIT-002** | Chống nộp lặp | Gửi 2 request nộp cùng lúc | Xử lý song song | Chỉ chấm 1 lần duy nhất, request sau nhận kết quả cũ | Integration | **PASS** |

### 5.4. Quản Trị Học Sinh, Lượt Thi & Tài Liệu (Admin Tools)

| Mã test | Module | Given (Điều kiện) | When (Hành động) | Then (Kết quả mong đợi) | Loại | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- |
| **AT-LOCK-001** | Khóa học sinh | Học sinh đang làm bài thi | Quản trị viên khóa tài khoản | Tự động thu bài với `submit_reason = account_locked` | Integration | **PASS** |
| **AT-LOCK-002** | Mở khóa | Học sinh đang bị khóa | Quản trị viên mở khóa | Chuyển trạng thái sang Active, không phục hồi bài đã nộp | Integration | **PASS** |
| **AT-RESET-001** | Reset lượt thi | Lượt thi của học sinh bị lỗi | Quản trị viên nhấn Reset bài | Xóa lượt thi cũ để học sinh có thể thi lại từ đầu | Integration | **PASS** |
| **AT-DOC-001** | Tài liệu số | Quản trị viên | Đăng tài liệu PDF / link ngoài | Hiển thị chính xác trên thư viện tài liệu của học sinh | Integration | **PASS** |

---

## 6. Kiểm Thử Chịu Tải 100 Người Dùng Đồng Thời (k6 Load Testing)

Hệ thống đã được kiểm thử với kịch bản **100 người dùng ảo (VU)** thực hiện các chuỗi hành động cùng lúc:

| Kịch bản kiểm thử | Quy mô | Ngưỡng yêu cầu (Threshold) | Kết quả thực tế |
| --- | --- | --- | --- |
| **LT-001**: 100 người mở đề thi cùng lúc | 100 VU, ramp-up 1 phút | p95 `startAttempt` <= 800ms, p95 `getPayload` <= 800ms | **ĐẠT (p95 ~ 320ms)** |
| **LT-002**: 100 người lưu đáp án đồng thời | 100 VU, think-time 1-2s | p95 `saveAnswer` <= 500ms | **ĐẠT (p95 ~ 180ms)** |
| **LT-003**: 100 người nộp bài trong cửa sổ 10s | 100 VU đồng thời | p95 `submitAttempt` <= 1200ms, Tỷ lệ lỗi 5xx < 1% | **ĐẠT (p95 ~ 650ms, 0% lỗi)** |
| **LT-004**: Nộp bài trùng lặp / retry | 100 VU gửi 2 request song song | Không nhân đôi điểm số, 0 bản ghi sai lệch | **ĐẠT (100% Idempotent)** |
