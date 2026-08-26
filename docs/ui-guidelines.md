# Hướng Dẫn Thiết Kế Giao Diện (UI/UX Guidelines)

- **Ngày cập nhật**: 2026-08-22
- **Phiên bản**: 1.0
- **Trạng thái**: Đã nghiệm thu & Hoạt động

---

## Mục Lục

1. [Nguyên tắc thiết kế tổng thể](#1-nguyên-tắc-thiết-kế-tổng-thể)
2. [Hệ màu sắc, Kiểu chữ & Hiệu ứng (Design Tokens)](#2-hệ-màu-sắc-kiểu-chữ--hiệu-ứng-design-tokens)
3. [Bố cục & Điều hướng đa nền tảng (Navigation & Layouts)](#3-bố-cục--điều-hướng-đa-nền-tảng-navigation--layouts)
4. [Màn hình phòng thi trực quan (Exam Room UI)](#4-màn-hình-phòng-thi-trực-quan-exam-room-ui)
5. [Trình soạn thảo đề thi Admin (Exam Builder UI)](#5-trình-soạn-thảo-đề-thi-admin-exam-builder-ui)
6. [Bảng điều khiển & Quản trị dữ liệu (Admin Dashboard & Tables)](#6-bảng-điều-khiển--quản-trị-dữ-liệu-admin-dashboard--tables)
7. [Các trạng thái giao diện & Khả năng tiếp cận (Accessibility)](#7-các-trạng-thái-giao-diện--khả-năng-tiếp-cận-accessibility)
8. [Danh mục thành phần tái sử dụng (Component Catalog)](#8-danh-mục-thành-phần-tái-sử-dụng-component-catalog)

---

## 1. Nguyên Tắc Thiết Kế Tổng Thể

- **Tính tập trung & Rõ ràng**: Giao diện phòng thi loại bỏ hoàn toàn các yếu tố gây xao nhãng (không thanh menu, không liên kết ngoài), tối ưu hóa trải nghiệm đọc câu hỏi và chọn đáp án.
- **Hiện đại & Cao cấp (Glassmorphism)**: Ứng dụng hiệu ứng kính mờ tinh tế (`backdrop-blur`), đường viền siêu mảnh (`border-border/50`), chuyển màu mượt mà (subtle gradients) và bóng đổ mềm mại.
- **Nhất quán & Tiêu chuẩn hóa**: Sử dụng hệ thống biểu tượng **Lucide React**, các thành phần giao diện nền tảng **Shadcn UI** và **Tailwind CSS**.
- **Căn chỉnh tự nhiên & Thân thiện**: Tất cả hộp thoại xác nhận, nội dung cảnh báo và form nhập liệu được căn trái (`text-left`) tự nhiên theo chuẩn trải nghiệm người dùng tiếng Việt.

---

## 2. Hệ Màu Sắc, Kiểu Chữ & Hiệu Ứng (Design Tokens)

### 2.1. Bảng màu chủ đạo (Color Palette)

| Phân loại màu | Ứng dụng trong giao diện | Sắc thái màu sắc |
| --- | --- | --- |
| **Primary (Chủ đạo)** | Nút hành động chính, trạng thái active, thanh tiến độ | Xanh dương công nghệ (`indigo-600` / `blue-600`) |
| **Success (Thành công)** | Câu trả lời đúng, trạng thái đã nộp, điểm số cao | Xanh lá tươi (`emerald-500` / `green-600`) |
| **Warning (Cảnh báo)** | Đánh dấu xem lại (`marked`), sắp hết giờ thi, bản nháp | Vàng cam (`amber-500` / `orange-500`) |
| **Danger (Nguy hiểm)** | Nút xóa, thoát toàn màn hình, câu trả lời sai, tài khoản bị khóa | Đỏ tươi (`rose-600` / `red-600`) |
| **Neutral (Trung tính)** | Nền trang, thẻ card, chữ nội dung chính và phụ | Xám hiện đại (`slate-50` đến `slate-950`) |

### 2.2. Kiểu chữ (Typography) & Khoảng cách (Spacing)

- **Phông chữ**: Font Sans chuẩn hệ thống kết hợp Google Fonts hiện đại (`Inter` / `Outfit`), hỗ trợ hiển thị tiếng Việt hoàn hảo, không bị lỗi dấu.
- **Cấp bậc văn bản**:
  - Tiêu đề chính trang (Page Heading): `text-2xl` đến `text-3xl font-bold tracking-tight`.
  - Tiêu đề khối (Section / Card Heading): `text-lg font-semibold`.
  - Nội dung câu hỏi: `text-base font-medium leading-relaxed`.
  - Nội dung lựa chọn & văn bản thường: `text-sm leading-normal`.
  - Chú thích & Metadata: `text-xs text-muted-foreground`.
- **Bo góc (Border Radius)**: Chuẩn hóa `rounded-xl` (12px) cho Cards và Dialogs; `rounded-lg` (8px) cho Buttons và Inputs.

---

## 3. Bố Cục & Điều Hướng Đa Nền Tảng (Navigation & Layouts)

### 3.1. Header người dùng công khai (Public Header)
- Logo ứng dụng nổi bật, thanh tìm kiếm nhanh, liên kết danh mục Đề thi, Tài liệu.
- Nút chuyển đổi giao diện Sáng / Tối (Theme Switcher).
- Nút Đăng nhập / Đăng ký hoặc Dropdown Menu thông tin người dùng kèm vai trò khi đã đăng nhập.

### 3.2. Sidebar Quản trị viên (Admin Sidebar)
- Thanh điều hướng bên trái phân nhóm chức năng rõ ràng:
  - **Tổng quan**: Bảng điều khiển (Dashboard).
  - **Quản lý thi**: Đề thi (Exams), Lượt thi (Attempts), Môn học (Subjects), Danh mục (Categories).
  - **Người dùng & Học liệu**: Học sinh (Students), Kho tài liệu (Documents).
- Tự động thu gọn trên màn hình di động với Drawer / Sheet trượt mượt mà.

---

## 4. Màn Hình Phòng Thi Trực Quan (Exam Room UI)

Giao diện phòng thi được chia thành 3 khu vực chức năng chính:

1. **Thanh tiêu đề cố định (Sticky Top Bar)**:
   - Tên đề thi và mã lượt thi.
   - **Đồng hồ đếm ngược (Countdown Timer)**: Đổi sang màu đỏ nhấp nháy khi thời gian làm bài còn dưới 5 phút.
   - **Trạng thái lưu tự động (Autosave Indicator)**: Hiển thị icon đám mây với các trạng thái: `Đang lưu...`, `Đã lưu lúc 14:30:15`, `Lỗi kết nối - Đang thử lại`.
   - Nút **"Nộp bài"** nổi bật.
2. **Khu vực nội dung câu hỏi (Question Area)**:
   - Tiêu đề phần thi và câu hỏi hiện tại.
   - Nút đánh dấu **"Xem lại câu này"** (Mark for review) kèm icon cờ.
   - Nội dung câu hỏi hỗ trợ văn bản đa dòng và ảnh minh họa (nếu có) hiển thị sắc nét.
   - Danh sách 4 đáp án dạng nút bấm diện tích lớn, có hiệu ứng hover và đổi màu khi được chọn.
   - Nút điều hướng **"Câu trước"** và **"Câu tiếp theo"**.
3. **Thanh điều hướng câu hỏi (Question Navigator)**:
   - Danh sách các ô số tương ứng với toàn bộ câu hỏi trong đề.
   - Mã màu trực quan:
     - ⚪ Xám nhạt: Chưa làm.
     - 🔵 Xanh dương: Đã chọn đáp án.
     - 🟡 Vàng cam: Đã đánh dấu xem lại.
     - 🔷 Viền đậm: Câu hỏi đang hiển thị.

---

## 5. Trình Soạn Thảo Đề Thi Admin (Exam Builder UI)

- **Cấu trúc phân tầng trực quan**: Quản lý theo từng Phần thi (Section) -> Danh sách câu hỏi (Questions) -> Danh sách đáp án (Options).
- **Hỗ trợ tải ảnh câu hỏi linh hoạt**:
  - Tab 1: **Tải ảnh từ máy tính**: Kéo thả hoặc chọn file ảnh (PNG, JPG, WebP), tự động tải lên và hiển thị ảnh xem trước tức thì kèm hiệu ứng loading.
  - Tab 2: **Nhập liên kết URL**: Nhập link ảnh trực tiếp từ internet.
- **Biểu tượng cây bút chỉnh sửa**: Xuất hiện bên cạnh tiêu đề phần thi và câu hỏi để người dùng nhận biết vị trí có thể chỉnh sửa nội dung.
- **Điều chỉnh vị trí**: Sử dụng các nút mũi tên Lên / Xuống để sắp xếp thứ tự câu hỏi và phần thi chính xác, không gây nhầm lẫn.
- **Hộp thoại xác nhận xóa đề thi**:
  - Nội dung căn trái chuẩn mực (`text-left`), thông báo rõ ràng về việc xóa đề thi và kết thúc an toàn các bài thi liên quan.

---

## 6. Bảng Điều Khiển & Quản Trị Dữ Liệu (Admin Dashboard & Tables)

- **Thẻ chỉ số (Stat Cards)**: Hiển thị 4 chỉ số trọng yếu: Tổng số đề thi, Tổng số học sinh, Tổng lượt thi, Điểm trung bình.
- **Bảng dữ liệu chuẩn hóa (Data Tables)**:
  - Hỗ trợ tìm kiếm theo từ khóa và bộ lọc trạng thái.
  - Phân trang phía server (Server-side Pagination).
  - Cột "Hành động" chứa các nút thao tác gọn gàng: Soạn đề, Xem chi tiết, Khóa tài khoản, Xóa đề thi (màu đỏ với icon thùng rác).
  - Trạng thái trống (Empty State) hiển thị thông báo sinh động và nút tạo mới.

---

## 7. Các Trạng Thái Giao Diện & Khả Năng Tiếp Cận (Accessibility)

- **Loading State**: Sử dụng hiệu ứng Skeleton Shimmer cho bảng danh sách và biểu đồ thay vì spinner đơn điệu.
- **Empty State**: Trình bày rõ ràng lý do chưa có dữ liệu và kèm nút hành động tiếp theo (Call-to-Action).
- **Error State**: Thông báo lỗi cụ thể bằng tiếng Việt có dấu, kèm nút "Thử lại".
- **Toast Notifications**: Hiển thị thông báo thành công hoặc lỗi ở góc màn hình, tự động đóng sau 3 giây.
- **Keyboard Navigation**: Hỗ trợ di chuyển giữa các nút bằng phím `Tab`, kích hoạt bằng phím `Enter` hoặc `Space`.

---

## 8. Danh Mục Thành Phần Tái Sử Dụng (Component Catalog)

| Tên Component | Vị trí mã nguồn | Mục đích sử dụng |
| --- | --- | --- |
| `ExamCard` | `src/components/exams/exam-card.tsx` | Thẻ hiển thị đề thi trên catalog |
| `ExamFilterBar` | `src/components/exams/exam-filter-bar.tsx` | Thanh tìm kiếm và bộ lọc môn/danh mục |
| `ExamTakingUI` | `src/components/exams/exam-taking-ui.tsx` | Giao diện phòng thi chính |
| `QuestionNavigator`| `src/components/exams/question-navigator.tsx` | Bảng điều hướng câu hỏi |
| `FullscreenGate` | `src/components/exams/fullscreen-gate.tsx` | Cổng kiểm tra và kích hoạt toàn màn hình |
| `FullscreenViolationOverlay` | `src/components/exams/fullscreen-violation-overlay.tsx` | Màn hình khóa đếm ngược 5s khi vi phạm |
| `ExamRowActions` | `src/components/admin/exam-row-actions.tsx` | Nút Soạn đề và Xóa đề trên bảng quản trị |
| `BuilderQuestionCard` | `src/components/admin/exam-builder/builder-question-card.tsx` | Khối soạn thảo câu hỏi kèm tải ảnh |
| `StatusBadge` | `src/components/shared/status-badge.tsx` | Huy hiệu trạng thái chuẩn hóa |
| `ThemeToggle` | `src/components/theme/theme-toggle.tsx` | Nút chuyển đổi Dark / Light mode |
