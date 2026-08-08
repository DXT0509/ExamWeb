# Exam Preparation App

Mọi nội dung hiển thị cho người dùng phải sử dụng tiếng Việt có dấu.

## Yêu cầu

- Node.js 22 hoặc phiên bản tương thích với Next.js hiện tại.
- npm theo `package-lock.json`.
- Docker Desktop hoặc Docker Engine để chạy Supabase local.
- Supabase CLI dùng qua script npm của dự án.

## Supabase local

```bash
npm install
npm run supabase:start
npm run supabase:status
npm run supabase:reset
npm run supabase:types
```

`npm run supabase:reset` sẽ xóa toàn bộ dữ liệu local, chạy lại migration và seed từ đầu. Supabase Studio chạy tại `http://127.0.0.1:54323`.

Seed local tạo:

- Admin: `admin@example.test`
- Student active: `student1@example.test`
- Student locked: `locked@example.test`
- Mật khẩu local: xem `supabase/seed.sql`, không ghi secret production vào README.

## Catalog đề thi Phase 6

Phase 6 dùng view `public.public_exam_catalog` để trả metadata an toàn:

- Tiêu đề, slug, mô tả, môn học, danh mục.
- Thời gian làm bài, tổng điểm, tổng số câu.
- Quyền truy cập, trạng thái làm khi chưa đăng nhập, yêu cầu toàn màn hình.
- Không trả nội dung câu hỏi, đáp án đúng, lựa chọn đáp án hoặc lời giải.
- Không dùng service role cho truy vấn catalog public/student.

## Seed đề public và students_only

Sau `npm run supabase:reset`, seed có sẵn:

- `de-cong-khai-nen-tang-so`: đề `published`, `public`, cho phép Guest làm.
- `de-danh-cho-hoc-vien-doc-hieu`: đề `published`, `students_only`.
- `de-rieng-cua-quan-tri-vien`: đề `published`, `private`, dùng để kiểm tra RLS.
- `de-nhap-tu-duy-dinh-luong`: đề `draft`, không xuất hiện trong catalog.

Admin có thể tạo thêm đề tại `/admin/exams`, thêm section/câu hỏi/đáp án, rồi xuất bản. Đề public hoặc students_only sẽ xuất hiện trong catalog theo đúng quyền truy cập.

## Kiểm tra Guest catalog

1. Chạy `npm run dev`.
2. Mở `/` để xem đề nổi bật public.
3. Mở `/exams` khi chưa đăng nhập.
4. Tìm kiếm bằng tên hoặc slug.
5. Lọc theo môn học và danh mục.
6. Mở chi tiết đề public tại `/exams/de-cong-khai-nen-tang-so`.
7. Truy cập trực tiếp `/exams/de-danh-cho-hoc-vien-doc-hieu` phải không khả dụng với Guest.

## Kiểm tra Student catalog

1. Đăng nhập bằng Student active.
2. Mở `/student` để xem đề mới, đề công khai và đề chỉ dành cho học sinh.
3. Mở `/exams` để thấy cả public và students_only.
4. Mở `/exams/de-danh-cho-hoc-vien-doc-hieu`.
5. Truy cập đề private phải không khả dụng.

Student locked không được dùng dashboard Student hoặc bắt đầu bài. Khi xem catalog công khai, dữ liệu chỉ nên tương đương Guest.

## Kiểm tra search và filter

URL filter dùng query params:

```text
/exams?q=cong&subject=toan-hoc&category=hsa&page=1&pageSize=12
```

Query param sai sẽ fallback an toàn. Page size tối đa là 24. Pagination chạy server-side bằng `.range()`.

## Chạy E2E Phase 6

```bash
npm run supabase:status
npm run supabase:reset
npm run supabase:types
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:e2e
```

E2E Phase 6 không tạo attempt. Nút “Bắt đầu làm bài” chỉ là UI chuẩn bị và đang bị vô hiệu hóa với ghi chú rõ ràng.

## Ngoài phạm vi Phase 6

Phase này chưa triển khai:

- `exam_attempts`
- Màn hình thi thật
- Fullscreen guard
- Timer
- Autosave
- Submit
- Scoring
- Results
- History thật
- Thanh toán
- Gói VIP
