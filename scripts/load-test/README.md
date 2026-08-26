# Hướng Dẫn Chạy Kiểm Thử Tải Trọng 100 VU (k6 Load Testing)

Tài liệu hướng dẫn thực hiện kiểm thử hiệu năng và độ ổn định hệ thống theo tiêu chuẩn **GOAL-005** và **NFR-PERF-001** trong [docs/product-requirements.md](../../docs/product-requirements.md) và [docs/acceptance-tests.md](../../docs/acceptance-tests.md).

---

## 1. Yêu Cầu Chuẩn Bị

- **k6**: Cài đặt k6 từ [k6.io](https://k6.io/docs/get-started/installation/) hoặc qua winget/choco:
  ```powershell
  winget install k6 --source winget
  ```
- **Node.js**: Phiên bản 18+ (đã có sẵn trong dự án).
- **Supabase Local**: Khởi chạy với `npx supabase status` / `npx supabase start`.

---

## 2. Các Kịch Bản Kiểm Thử (Scenarios)

| Mã | Kịch bản | Quy mô | Ngưỡng Pass/Fail |
| --- | --- | --- | --- |
| **LT-001** | 100 người dùng mở cùng đề thi | 100 VU, ramp-up 1m | p95 `startAttempt` <= 800 ms, p95 `getPayload` <= 800 ms |
| **LT-002** | 100 người dùng lưu đáp án (autosave) | 100 VU, think-time 1-2s | p95 `saveAnswer` <= 500 ms |
| **LT-003** | 100 người dùng nộp bài gần đồng thời | 100 VU trong cửa sổ 10s | p95 `submitAttempt` <= 1200 ms |
| **LT-004** | 100 request nộp trùng lặp / retry | 100 VU song song | Không nhân đôi điểm, 5xx < 1% |

---

## 3. Các Bước Thực Hiện

### Bước 1: Khởi tạo 100 tài khoản học sinh giả lập
Chạy script tự động để tạo 100 user test trong Supabase local:
```powershell
node scripts/load-test/seed-load-test-users.mjs
```

### Bước 2: Chạy kiểm thử tải trọng k6
```powershell
k6 run scripts/load-test/k6-exam-load-test.js
```

Tùy chọn ghi đè URL hoặc Exam ID:
```powershell
k6 run -e SUPABASE_URL=http://127.0.0.1:54321 -e EXAM_ID=40000000-0000-0000-0000-000000000002 scripts/load-test/k6-exam-load-test.js
```

### Bước 3: Kiểm tra tính toàn vẹn dữ liệu sau kiểm thử
- Kiểm tra không có duplicate trong `attempt_answers`.
- Tỷ lệ lỗi máy chủ 5xx đạt < 1%.
- Toàn bộ điểm số được chốt 1 lần duy nhất trên mỗi attempt.
