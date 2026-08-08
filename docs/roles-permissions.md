# Roles And Permissions

- Ngay cap nhat: 2026-08-01
- Phien ban: 0.1
- Trang thai: Draft

## Muc Luc

1. Nhom truy cap
2. Ma tran phan quyen theo chuc nang
3. Ma tran phan quyen theo du lieu
4. Route va redirect
5. Tai khoan va role
6. Supabase RLS
7. Thao tac server-only
8. Tan cong can ngan chan
9. Acceptance criteria

## 1. Nhom Truy Cap

| Role | Mo ta | Nguon xac dinh |
| --- | --- | --- |
| Guest | Chua dang nhap, chi doc du lieu public va lam de Guest neu duoc phep | Khong co session |
| Student | Nguoi hoc da dang nhap, role `student`, tai khoan khong bi khoa | `profiles.role` doc tu server |
| Admin | Quan tri vien, role `admin`, tao bang quy trinh server/service role | `profiles.role` doc tu server |

An nut tren giao dien khong duoc xem la bao mat. Role gui tu client khong dang tin cay. Moi route/API/server action phai kiem tra role tu session server va RLS.

## 2. Ma Tran Phan Quyen Theo Chuc Nang

| Chuc nang | Guest | Student | Admin |
| --- | --- | --- | --- |
| Xem trang chu | Allow | Allow | Allow |
| Xem de public | Allow | Allow | Allow |
| Lam de Guest-enabled | Allow | Allow | Allow |
| Xem lich su dai han | Deny | Own only | Read aggregate/all |
| Bat dau de `private` | Deny | Deny trong MVP | Allow preview/admin |
| Quan ly ho so | Deny | Own only | Lock/unlock Student |
| Quan ly subject/category/exam | Deny | Deny | Allow |
| Quan ly cau hoi/dap an dung | Deny | Deny | Allow khi exam `draft`; read-only khi exam da co attempt |
| Upload anh cau hoi | Deny | Deny | Allow |
| Xem dap an dung truoc khi nop | Deny | Deny | Allow |
| Xem attempt nguoi khac | Deny | Deny | Allow |
| Quan ly tai lieu public | Deny | Deny | Allow |

## 3. Ma Tran Phan Quyen Theo Du Lieu

| Bang | Guest | Student | Admin |
| --- | --- | --- | --- |
| `profiles` | Khong doc | Doc/cap nhat ho so minh, khong sua role | Doc list Student, khoa/mo; khong tu nang role qua client |
| `subjects` | Doc active co exam public | Doc active | CRUD |
| `exam_categories` | Doc active co exam public | Doc active | CRUD |
| `exams` | Doc `published` + `public` fields | Doc `published` + `public`/`students_only`; khong doc `private` trong MVP | CRUD |
| `exam_sections` | Doc cua exam duoc phep | Doc cua exam duoc phep | CRUD |
| `questions` | Doc noi dung cau hoi cua attempt hop le, khong doc dap an dung | Tuong tu Guest/own attempt | CRUD |
| `question_options` | Doc option khong co `is_correct` khi chua nop | Tuong tu Guest | CRUD gom `is_correct` |
| `exam_attempts` | Chi phien Guest cua minh qua signed guest token hash | Own only | Read all |
| `attempt_answers` | Chi attempt Guest cua minh qua signed guest token hash | Own only khi in_progress | Read all |
| `exam_events` | Ghi event cho phien hop le | Ghi event own attempt | Read all |
| `documents` | Doc published public | Doc published/duoc phep | CRUD |

## 4. Route Va Redirect

### Route cong khai

- `/`
- `/exams`
- `/exams/[slug]`
- `/documents`
- `/login`
- `/register`
- `/attempts/guest/[attemptId]` neu de cho phep Guest

### Route Student

- `/student`
- `/student/profile`
- `/student/history`
- `/attempts/[attemptId]`
- `/attempts/[attemptId]/result`

### Route Admin

- `/admin`
- `/admin/subjects`
- `/admin/categories`
- `/admin/exams`
- `/admin/exams/[examId]`
- `/admin/exams/[examId]/sections`
- `/admin/exams/[examId]/questions`
- `/admin/attempts`
- `/admin/students`
- `/admin/documents`

### Quy tac redirect

| Tinh huong | Redirect |
| --- | --- |
| Guest vao route Student/Admin | `/login?next=...` |
| Student vao route Admin | `/student` kem thong bao khong co quyen |
| Admin vao route Student khong can thiet | `/admin` |
| User da dang nhap vao `/login` | Student -> `/student`, Admin -> `/admin` |
| Tai khoan bi khoa | `/account-locked` va dang xuat session neu can |

## 5. Tai Khoan Va Role

- Tai khoan bi khoa: `profiles.status = locked`; khong duoc bat dau attempt moi, khong duoc autosave, khong duoc submit chu dong. Khi Admin khoa Student, attempt `in_progress` cua Student do phai duoc server auto-submit voi `status = auto_submitted`, `submit_reason = account_locked`, cham cac answer da duoc server ack truoc thoi diem khoa, va ghi audit event `account_locked`. Mo khoa khong mo lai attempt da final.
- Guest ownership: server tao signed httpOnly cookie/token tam thoi, chi luu `guest_session_hash` trong database, va moi API Guest phai so khop hash nay voi attempt. Biet `attemptId` khong du de doc/sua attempt Guest.
- Tao Admin: chi thuc hien bang migration seed, Supabase dashboard co kiem soat, hoac server action dung service role. Khong co UI cho user tu tao Admin trong MVP.
- Khong tu nang role: client khong duoc ghi `profiles.role`; RLS tu choi update role/status neu khong qua service role/server action duoc kiem quyen.

## 6. Supabase RLS

RLS chi tiet phai duoc cai dat trong migration, tham chieu schema tai [database-schema.md](./database-schema.md).

| Bang | Select | Insert | Update | Delete |
| --- | --- | --- | --- | --- |
| `profiles` | Own profile; Admin read students | Trigger tao profile; service role | Own non-role fields; Admin lock/unlock qua server | Soft delete only |
| `subjects` | Active public for Guest/Student; Admin all | Admin | Admin | Admin soft delete |
| `exam_categories` | Active public for Guest/Student; Admin all | Admin | Admin | Admin soft delete |
| `exams` | Published public/allowed | Admin | Admin | Admin soft delete |
| `exam_sections` | Sections of allowed exam | Admin khi exam `draft` hoac read-only khi da publish/co attempt | Admin khi exam `draft`; bi khoa khi publish/co attempt | Admin soft delete khi exam `draft` |
| `questions` | Allowed attempt view excludes correct-answer fields via view/RPC | Admin khi exam `draft` hoac read-only khi da publish/co attempt | Admin khi exam `draft`; bi khoa khi publish/co attempt | Admin soft delete khi exam `draft` |
| `question_options` | Allowed attempt view excludes `is_correct` via view/RPC | Admin khi exam `draft` hoac read-only khi da publish/co attempt | Admin khi exam `draft`; bi khoa khi publish/co attempt | Admin soft delete khi exam `draft` |
| `exam_attempts` | Owner Student or Guest session; Admin | Server action/RPC | Server action/RPC only | No hard delete |
| `attempt_answers` | Owner attempt; Admin | Owner in_progress via RPC upsert | Owner in_progress via RPC upsert | No delete after submit |
| `exam_events` | Admin; owner limited event list if needed | Owner/server event RPC | Server only resolve fields | No delete |
| `documents` | Published public; Admin all | Admin | Admin | Admin soft delete |

Student khong duoc doc truong chua dap an dung. Nen dung view/RPC rieng cho man hinh lam bai thay vi select truc tiep bang `question_options`.

Admin khong duoc sua du lieu anh huong ket qua sau khi exam `published`: section/question/option, dap an dung, diem cau hoi, thu tu, duration va random config. Exam `published` chua co attempt co the dua ve `draft`; exam da co attempt phai clone thanh exam moi `draft` neu can sua noi dung. Close exam chi chan attempt moi, khong auto-submit attempt dang lam.

## 7. Thao Tac Server-only Hoac Service Role

- Tao/cap nhat `profiles.role`.
- Tao `started_at`, `deadline_at`.
- Submit attempt va cham diem.
- Doc `question_options.is_correct` de cham diem.
- Resolve fullscreen violation va auto-submit.
- Khoa Student va auto-submit attempt dang lam bang `account_locked`.
- Publish validation, tinh `total_score`, revert published chua co attempt ve draft, va clone exam.
- Xoa mem du lieu quan tri.
- Tao signed URL upload neu can gioi han bucket.

## 8. Tan Cong Can Ngan Chan

| Tinh huong | Bien phap |
| --- | --- |
| Student gui role `admin` tu client | Bo qua input role, doc role tu session server |
| Guest doc du lieu private | RLS chi cho public/published |
| Student doc attempt nguoi khac | Policy `student_id = auth.uid()` hoac guest token hash |
| Student doc `is_correct` qua Network tab | View/RPC an truong, RLS khong select bang goc |
| Student sua dap an sau nop | RPC kiem `exam_attempts.status = in_progress` |
| Student nop hai lan | Submit transaction idempotent |
| Admin thao tac khong qua server | RLS yeu cau role admin va log audit |
| Guest doan `attemptId` cua Guest khac | So khop signed guest token hash; sai token tra 403/404 |
| Client gui `student_id`, `deadline_at`, `score`, `status` khi start/submit | Server bo qua cac truong nay va tu tao/lock trong transaction |
| Admin sua dap an dung/diem cua exam da co attempt | Server/RLS tu choi; yeu cau clone exam moi |
| Student gui option cua cau hoi khac | `saveAnswer` kiem composite question-option va exam owner |

## 9. Acceptance Criteria

- AC-RBAC-001: Student go truc tiep `/admin/exams` bi redirect va API tra 403.
- AC-RBAC-002: Guest chi thay exam `published` va public.
- AC-RBAC-003: Student khong select duoc attempt cua Student khac.
- AC-RBAC-004: Response man hinh lam bai khong co `is_correct`.
- AC-RBAC-005: Client update `profiles.role` bi tu choi.
- AC-RBAC-006: Admin CRUD exam duoc log `created_by`/`updated_by`.
- AC-RBAC-007: Khoa Student ngan attempt moi va autosave moi.
- AC-RBAC-008: Guest co `attemptId` hop le nhung sai/mat signed guest token khong doc duoc payload.
- AC-RBAC-009: Student active khong doc/bat dau duoc exam `private` trong MVP.
- AC-RBAC-010: Tai khoan locked khong submit chu dong duoc attempt dang lam; server auto-submit voi `submit_reason = account_locked`.
- AC-RBAC-011: Admin khong sua duoc dap an dung/diem/thu tu cua exam da co attempt.
- AC-RBAC-012: Close exam khong doi status attempt dang lam va khong tao submit reason rieng trong MVP.
