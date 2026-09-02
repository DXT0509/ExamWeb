# Sổ Tay Vận Hành & Triển Khai Production (Production Runbook)
## Hệ Thống Luyện Thi Trực Tuyến — Exam Preparation Platform

---

## 1. Hạ Tầng Hệ Thống (Infrastructure Architecture)

```
[ Người Dùng / Trình Duyệt ]
           │
           ▼
[ Vercel / Next.js Edge Gateway ] (App Router, Server Components & Server Actions)
           │
           ├────────────► [ Supabase Cloud Managed PostgreSQL 17 ]
           │              ├── Row Level Security (RLS)
           │              ├── Stored Procedures & Scoring RPCs
           │              ├── Audit & Integrity Triggers
           │              └── Realtime Engine (Support Chat)
           │
           ├────────────► [ Supabase Auth Engine ]
           │              ├── Google OAuth 2.0 Provider
           │              └── Email / Password & Session JWTs
           │
           └────────────► [ Supabase Storage CDN ]
                          ├── Bucket: `documents` (Tài liệu ôn tập PDF)
                          └── Bucket: `questions` (Ảnh đính kèm câu hỏi)
```

---

## 2. Danh Sách Biến Môi Trường (Environment Variables)

### A. Client-Side (Public)
Các biến bắt đầu bằng `NEXT_PUBLIC_` được nhúng vào gói bundle trình duyệt:
* `NEXT_PUBLIC_SUPABASE_URL`: URL của Supabase Cloud Project (ví dụ: `https://[PROJECT-REF].supabase.co`).
* `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Khóa công khai `anon` an toàn cho client, được bảo vệ bởi RLS.
* `NEXT_PUBLIC_SITE_URL`: Domain chính thức của website (ví dụ: `https://exam.yourdomain.com`).

### B. Server-Side (Bảo Mật — TUYỆT ĐỐI KHÔNG ĐƯA RA CLIENT)
* `SUPABASE_SERVICE_ROLE_KEY`: Khóa đặc quyền cao nhất của Supabase, chỉ được sử dụng trong môi trường máy chủ (Server Actions/API routes bảo mật).
* `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID`: Client ID từ Google Cloud Console.
* `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`: Client Secret từ Google Cloud Console.

---

## 3. Quy Trình Di Trú Cơ Sở Dữ Liệu (Database Migration)

Tất cả 21 migrations trong thư mục `supabase/migrations/` được thiết kế idempotent và có thứ tự chuẩn:

```bash
# 1. Đăng nhập Supabase CLI vào tài khoản quản trị
supabase login

# 2. Liên kết local workspace với project production
supabase link --project-ref [YOUR_PROJECT_REF]

# 3. Đẩy toàn bộ migrations lên database production
supabase db push

# 4. Kiểm tra trạng thái migrations đã áp dụng
supabase migration list
```

---

## 4. Cấu Hình Google OAuth Production

### Bước 1: Google Cloud Console
1. Truy cập [Google Cloud Console](https://console.cloud.google.com/) -> **APIs & Services** -> **Credentials**.
2. Tạo mới **OAuth 2.0 Client ID** loại **Web application**.
3. Thêm **Authorized JavaScript origins**:
   - `https://exam.yourdomain.com`
4. Thêm **Authorized redirect URIs**:
   - `https://[YOUR_PROJECT_REF].supabase.co/auth/v1/callback`
5. Lưu lại `Client ID` và `Client Secret`.

### Bước 2: Supabase Dashboard
1. Truy cập **Authentication** -> **Providers** -> **Google**.
2. Bật kích hoạt (**Enable Google**).
3. Điền `Client ID` và `Client Secret`.
4. Trong mục **URL Configuration**:
   - **Site URL**: `https://exam.yourdomain.com`
   - **Redirect URLs**:
     - `https://exam.yourdomain.com/auth/callback`
     - `https://exam.yourdomain.com/reset-password`

---

## 5. Khởi Tạo Tài Khoản Quản Trị Viên Production (Admin Provisioning)

Tuyệt đối không lưu mật khẩu plaintext trong Git repository hay seed script production.

### Cách 1: Tạo qua Supabase Dashboard (Khuyến nghị)
1. Đăng nhập Supabase Dashboard -> **Authentication** -> **Users** -> **Add User**.
2. Tạo tài khoản với email quản trị chính thức.
3. Chạy câu lệnh SQL an toàn trong **SQL Editor**:
```sql
UPDATE public.profiles
SET role = 'admin', status = 'active'
WHERE id = '[USER_UUID_VỪA_TẠO]';
```

### Cách 2: Nâng cấp tài khoản Google đăng nhập lần đầu
1. Dùng tài khoản Google của Quản trị viên đăng nhập vào hệ thống qua giao diện `/login`.
2. Hệ thống sẽ tự tạo profile học sinh ban đầu.
3. Quản trị viên hệ thống chạy SQL trong Supabase Dashboard:
```sql
UPDATE public.profiles
SET role = 'admin', status = 'active'
WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@yourdomain.com');
```

---

## 6. Chiến Lược Sao Lưu & Phục Hồi Dữ Liệu (Backup & Recovery)

### A. Sao Lưu Tự Động (Supabase Automated Backup)
* Mặc định Supabase Cloud thực hiện sao lưu hàng ngày (Daily Backup).
* Đối với gói Pro, Point-in-Time Recovery (PITR) cho phép quay ngược trạng thái DB về từng giây bất kỳ trong 7-30 ngày gần nhất.

### B. Sao Lưu Thủ Công Trước Khi Release
Trước mỗi đợt deploy lớn, thực hiện sao lưu schema và data:
```bash
# Xuất toàn bộ schema và dữ liệu
supabase db dump --project-ref [YOUR_PROJECT_REF] -f backup_$(date +%Y%m%d_%H%M%S).sql
```

### C. Quy Trình Phục Hồi (Restore Procedure)
```bash
# Phục hồi dữ liệu từ bản sao lưu
psql "postgresql://postgres:[DB_PASSWORD]@db.[YOUR_PROJECT_REF].supabase.co:5432/postgres" -f backup_YYYYMMDD_HHMMSS.sql
```

---

## 7. Quy Trình Rollback (Application & Database Rollback)

### A. Rollback Ứng Dụng (Next.js / Vercel)
1. Truy cập Vercel Dashboard -> **Deployments**.
2. Chọn bản deployment ổn định liền trước -> Chọn **Instant Rollback**.
3. Thời gian rollback có hiệu lực: < 10 giây (Zero-downtime).

### B. Rollback Database Migration
Nếu một migration mới gặp sự cố:
1. Tạo migration đảo ngược (down migration) dưới dạng migration mới có timestamp hiện tại.
2. Áp dụng qua `supabase db push`.
3. Không thực hiện xóa lịch sử bảng `supabase_migrations.schema_migrations` trực tiếp.

---

## 8. Giám Sát & Vận Hành (Monitoring & Alerting)

1. **Supabase Monitoring Dashboard**:
   - **Database Health**: CPU usage, Memory, Disk IOPS, Connection pool size.
   - **Auth Logs**: Giám sát các lượt đăng nhập bất thường, brute-force hoặc lỗi OAuth.
   - **Postgres Logs**: Tra cứu các truy vấn chậm (slow queries) và lỗi syntax/permission.
2. **Vercel Analytics & Speed Insights**:
   - Theo dõi thời gian phản hồi máy chủ (TTFB), chỉ số Core Web Vitals (LCP, FID, CLS).
   - Serverless Function Logs để phát hiện lỗi unhandled exceptions trong Server Actions.

---

## 9. Kịch Bản Kiểm Thử Smoke Test Sau Triển Khai (Production Smoke Checklist)

| STT | Luồng kiểm thử (Flow) | Các bước thực hiện | Kết quả mong đợi |
| --- | --- | --- | --- |
| 1 | **FLOW A: Khách (Guest)** | Vào trang chủ -> Chọn đề công khai -> Bắt đầu làm -> Chọn đáp án -> Nộp bài | Điểm số và kết quả hiển thị chính xác |
| 2 | **FLOW B: Học sinh (Student)** | Đăng nhập Google -> Vào bảng điều khiển -> Làm đề -> Tải lại trang (Autosave) -> Nộp bài -> Xem lịch sử | Bài làm lưu liên tục, kết quả lưu vào lịch sử cá nhân |
| 3 | **FLOW C: Quản trị (Admin)** | Đăng nhập Admin -> Tạo đề thi mới -> Soạn câu hỏi -> Xuất bản (Publish) | Đề thi chuyển sang `published` và hiển thị trên Catalog |
| 4 | **FLOW D: Đúng / Sai** | Làm đề có chùm câu hỏi Đúng/Sai (0/4, 1/4, 2/4, 3/4, 4/4 đúng) | Điểm số theo bậc: 0 - 0.1 - 0.25 - 0.5 - 1.0 điểm |
| 5 | **FLOW E: Trả lời ngắn** | Điền các dạng số thập phân, phân số (`0.5`, `0,5`, `1/2`, `-0.75`, `-3/4`) | Chuẩn hoá chuỗi toán học và tính điểm chính xác |
| 6 | **FLOW F: Bảo mật & RLS** | Học sinh truy cập `/admin`, Khách xem lịch sử học sinh khác | Chuyển hướng hoặc chặn truy cập 100% |
