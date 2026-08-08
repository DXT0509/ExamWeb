# Acceptance Tests

- Ngay cap nhat: 2026-08-01
- Phien ban: 0.1
- Trang thai: Draft

## Muc Luc

1. Chien luoc kiem thu
2. Phan loai test
3. Quy uoc Given-When-Then
4. Du lieu chuan bi
5. Acceptance test theo module
6. Load test bang k6/Artillery
7. TBD

## 1. Chien Luoc Kiem Thu

Kiem thu tap trung vao luong MVP, bao mat du lieu bai thi, RLS, idempotency va tai 100 nguoi dong thoi. Unit test dung cho ham validate/tinh diem; integration test dung cho server action/RPC/RLS; E2E dung cho journey Guest/Student/Admin; load test dung cho bat dau, autosave va submit dong thoi.

## 2. Phan Loai Test

| Loai | Muc dich | Cong cu du kien |
| --- | --- | --- |
| Unit | Validate schema, tinh diem, state helpers | Vitest |
| Integration | API/server action, Supabase RLS, transaction | Vitest + Supabase test DB |
| E2E | Luong nguoi dung tren browser | Playwright |
| Load | 100 VU va nguong loi/hieu nang | k6 hoac Artillery |

## 3. Quy Uoc Given-When-Then

Moi test phai co:

- Ma test duy nhat, vi du `AT-AUTH-001`.
- Given: du lieu va trang thai ban dau.
- When: hanh dong can test.
- Then: ket qua mong doi co the quan sat.
- Uu tien: Must/Should/Could.
- Loai test va kha nang tu dong hoa.

## 4. Du Lieu Chuan Bi

- `admin@example.test` role Admin active.
- `student1@example.test`, `student2@example.test` role Student active.
- `locked@example.test` role Student locked.
- 2 subjects, 2 categories.
- 1 exam public published allow Guest, 1 exam students_only published, 1 exam draft, 1 exam closed.
- 1 exam private published de xac minh Student/Guest khong truy cap trong MVP.
- 1 exam published chua co attempt va 1 exam published da co attempt de test khoa noi dung/clone.
- 1 exam `fullscreen_required = true` va 1 exam `fullscreen_required = false`.
- Moi exam published co 2 sections, 20 questions, moi question 4 options, 1 correct option.
- 100 Student load-test users.

## 5. Acceptance Test Theo Module

| Ma | Module | Given | When | Then | Uu tien | Loai | Tu dong hoa |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AT-AUTH-001 | Authentication | Email moi hop le | Dang ky | Tao Student active va dang nhap | Must | E2E | Co |
| AT-AUTH-002 | Authentication | Student active | Dang nhap/dang xuat | Session tao/xoa, route protected thay doi | Must | E2E | Co |
| AT-AUTH-003 | Authentication | Student locked | Dang nhap | Bi chuyen den account locked, khong bat dau bai | Must | E2E | Co |
| AT-RBAC-001 | Role/route | Guest | Mo `/student` | Redirect login | Must | E2E | Co |
| AT-RBAC-002 | Role/route | Student | Mo `/admin` | 403 hoac redirect `/student` | Must | E2E | Co |
| AT-RBAC-003 | API trai quyen | Student | Goi API Admin tao/sua/xoa exam/category/document | Tat ca tra 403 va khong doi du lieu | Must | Integration | Co |
| AT-RBAC-004 | Exam private | Student/Guest | Goi detail/startAttempt exam `private` | 403/404, khong tao attempt | Must | Integration/E2E | Co |
| AT-RLS-001 | Supabase RLS | Student1 token | Select attempt Student2 | Khong co row/403 | Must | Integration | Co |
| AT-RLS-002 | Supabase RLS | Student attempt in_progress | Select options | Khong co `is_correct` | Must | Integration | Co |
| AT-RLS-003 | Supabase RLS | Guest co attemptId cua Guest khac | Goi payload/save/submit | 403/404 vi sai signed guest token | Must | Integration | Co |
| AT-SUBJ-001 | Quan ly mon | Admin | Tao subject hop le | Subject hien trong list | Must | E2E | Co |
| AT-SUBJ-002 | Quan ly mon | Student | Goi API tao subject | 403 | Must | Integration | Co |
| AT-CAT-001 | Quan ly danh muc | Admin | Tao/sua category | Du lieu cap nhat | Must | E2E | Co |
| AT-EXAM-001 | Quan ly de | Admin | Tao exam draft | Exam luu dung subject/category/duration | Must | E2E | Co |
| AT-EXAM-002 | Quan ly de | Admin | Sua metadata exam published | Chi truong metadata cho phep cap nhat, audit ghi | Should | Integration | Co |
| AT-EXAM-LOCK-001 | Khoa noi dung | Exam draft | Admin sua question/option/dap an dung/score | Luu thanh cong | Must | E2E/Integration | Co |
| AT-EXAM-LOCK-002 | Khoa noi dung | Exam published da co attempt | Admin sua `question_options.is_correct` | Bi tu choi, du lieu khong doi | Must | Integration | Co |
| AT-EXAM-LOCK-003 | Khoa noi dung | Exam published da co attempt | Admin sua `questions.score` | Bi tu choi, du lieu khong doi | Must | Integration | Co |
| AT-EXAM-LOCK-004 | Revert draft | Exam published chua co attempt | Admin dua ve `draft` | Thanh cong, noi dung co the sua lai | Must | Integration/E2E | Co |
| AT-EXAM-LOCK-005 | Revert draft | Exam published da co attempt | Admin dua ve `draft` | Bi tu choi | Must | Integration/E2E | Co |
| AT-EXAM-CLONE-001 | Clone exam | Exam published da co attempt | Admin clone exam | Tao exam moi `draft` voi section/question/option ID moi | Must | Integration/E2E | Co |
| AT-EXAM-CLONE-002 | Clone exam audit | Attempt cu cua exam goc | Cham/xem result sau khi clone | Attempt cu van dung noi dung exam goc | Must | Integration | Co |
| AT-SECTION-001 | Quan ly section | Admin | Tao/reorder section | `position` dung, khong trung | Must | E2E | Co |
| AT-QUESTION-001 | Quan ly cau hoi | Admin | Tao question 4 options 1 correct | Luu thanh cong | Must | E2E | Co |
| AT-QUESTION-002 | Quan ly cau hoi | Admin | Publish exam thieu correct option | Bi tu choi | Must | Integration | Co |
| AT-QUESTION-003 | Quan ly cau hoi | Section khong ton tai | Admin tao question | Bi tu choi | Must | Integration | Co |
| AT-UPLOAD-001 | Upload anh | Admin | Upload anh cau hoi hop le | File vao Storage, question co `image_path` | Should | E2E | Co |
| AT-PUBLISH-001 | Xuat ban de | Exam draft hop le | Admin publish | Status `published`, `published_at` set | Must | Integration | Co |
| AT-PUBLISH-002 | Validate publish | Exam khong co section | Admin publish | Bi tu choi voi validation summary | Must | Integration/E2E | Co |
| AT-PUBLISH-003 | Validate publish | Section khong co question | Admin publish | Bi tu choi voi section loi | Must | Integration/E2E | Co |
| AT-PUBLISH-004 | Validate publish | Question khong co correct option | Admin publish | Bi tu choi | Must | Integration | Co |
| AT-PUBLISH-005 | Validate publish | Question co 2 correct options | Admin publish | Bi tu choi | Must | Integration | Co |
| AT-PUBLISH-006 | Validate publish | Question co score <= 0 | Admin publish | Bi tu choi | Must | Integration | Co |
| AT-PUBLISH-007 | Tong diem server | Client gui `total_score` sai | Admin publish | Server bo qua input va tinh `total_score` tu active questions | Must | Integration | Co |
| AT-PUBLIC-001 | Thu vien public | Guest | Mo `/exams` | Chi thay exam public/published | Must | E2E | Co |
| AT-GUEST-001 | Guest attempt | Exam public allow Guest | Guest bat dau, autosave, refresh, submit | Attempt dung guest token, result theo cau hinh, khong co history dai han | Must | E2E | Co |
| AT-GUEST-002 | Guest khong duoc phep | Exam public `allow_guest_attempt=false` | Guest bat dau | Bi chan, khong tao attempt | Must | Integration/E2E | Co |
| AT-ATTEMPT-001 | Tao attempt | Student active, exam published | Bat dau | Attempt `in_progress`, deadline server | Must | Integration/E2E | Co |
| AT-ATTEMPT-002 | Tao attempt lap | Student co attempt `in_progress` cung exam | Bam bat dau/refresh | Tra attempt hien co, khong tao attempt active thu hai | Must | Integration | Co |
| AT-ATTEMPT-003 | Concurrent start Student | Cung Student gui 2 request start cung exam | Hai request chay dong thoi | Chi tao 1 attempt active, request thua tra attempt hien co | Must | Integration | Co |
| AT-ATTEMPT-004 | Concurrent start Guest | Cung guest session gui 2 request start cung exam | Hai request chay dong thoi | Chi tao 1 attempt active, request thua tra attempt hien co | Must | Integration | Co |
| AT-ATTEMPT-005 | Concurrent start nhieu Student | Hai Student khac nhau | Cung start mot exam | Moi Student co attempt rieng | Must | Integration | Co |
| AT-ATTEMPT-006 | Active/final attempts | Student co attempt final | Start exam lan nua khi khong co active attempt | Tao attempt moi; van chi mot attempt active | Must | Integration | Co |
| AT-ANSWER-001 | Luu dap an | Attempt in_progress | Chon option | Upsert 1 row `attempt_id + question_id` | Must | Integration | Co |
| AT-ANSWER-INVALID-OPTION-001 | Luu dap an | Option thuoc question khac | saveAnswer voi question A + option question B | Bi tu choi, khong tao/cap nhat answer | Must | Integration | Co |
| AT-ANSWER-INVALID-OPTION-002 | Luu dap an | Option thuoc exam khac | saveAnswer vao attempt exam A | Bi tu choi, khong tao/cap nhat answer | Must | Integration | Co |
| AT-ANSWER-INVALID-QUESTION-001 | Luu dap an | Question thuoc section cua exam khac | saveAnswer vao attempt exam A | Bi tu choi, khong tao/cap nhat answer | Must | Integration | Co |
| AT-ANSWER-INACTIVE-001 | Luu dap an | Option inactive hoac soft delete | saveAnswer | Bi tu choi, khong tao/cap nhat answer | Must | Integration | Co |
| AT-REFRESH-001 | Refresh bai thi | Da autosave 3 cau | Refresh | Dap an van duoc chon | Must | E2E | Co |
| AT-CRASH-001 | Browser crash | Attempt in_progress da autosave | Mo lai sau crash truoc deadline | Payload phuc hoi answer va thoi gian server | Must | E2E | Co |
| AT-CRASH-002 | Browser crash qua deadline | Attempt in_progress | Mo lai sau deadline | Server final attempt, khong cho lam tiep | Must | Integration/E2E | Co |
| AT-MULTITAB-001 | Nhieu tab | Cung attempt 2 tab | Hai tab doi cung cau | Khong trung row, last write wins | Must | E2E | Co |
| AT-TIMER-001 | Dong ho | Client sua gio he thong | Lam bai qua deadline | Server tu choi luu/nop theo deadline | Must | Integration | Co |
| AT-EXPIRE-001 | Het gio | Attempt gan deadline | Qua deadline | Attempt `auto_submitted`, reason `time_expired` | Must | Integration/E2E | Co |
| AT-SUBMIT-001 | Nop bai | Attempt in_progress | Bam nop | Status `submitted`, score duoc tinh | Must | E2E | Co |
| AT-SUBMIT-002 | Nop hai lan | Attempt in_progress | Gui 2 submit song song | Chi mot final result, khong cham trung | Must | Integration | Co |
| AT-SUBMIT-003 | Nop va job het gio song song | Attempt sat deadline | Submit tay cung luc job expire chay | Chi mot final status/score, request sau tra final | Must | Integration | Co |
| AT-SUBMIT-004 | Retry cung key | Attempt da final boi idempotency key A | Retry key A | Tra final hien co, khong doi `finalized_at`/`score`/`submitted_at` | Must | Integration | Co |
| AT-SUBMIT-005 | Retry key khac | Attempt da final boi key A | Retry key B | Tra final hien co, khong cham lai va khong doi timestamp | Must | Integration | Co |
| AT-SCORE-001 | Cham diem | Dap an seed biet truoc | Submit | Score dung tong cau correct | Must | Unit/Integration | Co |
| AT-SCORE-002 | Cham diem lap | Attempt da final | Retry submit voi cung/khac idempotency key | Khong tinh diem lai, `finalized_at` khong doi | Must | Integration | Co |
| AT-RESULT-001 | Ket qua | Exam show score on | Mo result | Hien diem | Must | E2E | Co |
| AT-SOLUTION-001 | Loi giai | Exam show solution off | Mo result | Khong tra/hien loi giai | Must | Integration/E2E | Co |
| AT-HISTORY-001 | Lich su | Student co 2 attempts | Mo history | Chi thay attempt cua minh | Must | E2E | Co |
| AT-FULL-001 | Thoat fullscreen | Attempt fullscreen | Thoat fullscreen | Overlay chan UI va ghi event | Must | E2E | Co |
| AT-FULL-002 | Quay lai fullscreen | Overlay dang dem | Bam quay lai trong 5s | Event resolved, bai tiep tuc | Must | E2E | Co |
| AT-FULL-003 | Khong quay lai | Overlay dang dem | Qua 5s | `auto_submitted`, reason fullscreen | Must | E2E/Integration | Co |
| AT-VIS-001 | Chuyen tab | Attempt in_progress | Tab hidden | Ghi `visibility_hidden`, overlay khi quay lai | Must | E2E | Co |
| AT-WINDOW-001 | Thu nho cua so | Attempt fullscreen | Exit fullscreen do resize/minimize | Xu ly nhu vi pham | Should | E2E | Co mot phan |
| AT-NET-001 | Mat mang khi vi pham | Event da ghi, offline >5s | Online lai | Server auto-submit | Must | E2E | Co |
| AT-NET-002 | Mat mang truoc khi event ghi server | Client pending violation local | Online lai | Server ghi event theo thoi diem nhan, khong assert final dung giay thu 5 | Must | Integration/E2E | Co |
| AT-NET-003 | Reconnect event qua han | Event server unresolved >5s | Client reconnect/getPayload | Server final va khong cho lam tiep | Must | Integration/E2E | Co |
| AT-FULL-UNSUP-001 | Fullscreen required unsupported | Exam `fullscreen_required=true`, mock no Fullscreen API | Bat dau | Hien loi, khong tao attempt | Must | E2E | Co |
| AT-FULL-REJECT-001 | Fullscreen request reject | Exam `fullscreen_required=true` | Browser reject requestFullscreen | Hien loi, khong tao attempt | Must | E2E | Co |
| AT-FULL-OPTIONAL-001 | Fullscreen optional | Exam `fullscreen_required=false` | Bat dau khong fullscreen | Attempt tao binh thuong | Must | E2E | Co |
| AT-FULL-OPTIONAL-002 | Fullscreen optional hidden | Exam `fullscreen_required=false` in_progress | Tab hidden/exit fullscreen | Khong auto-submit do fullscreen violation | Must | E2E/Integration | Co |
| AT-FULL-DEDUP-001 | Dedup violation | Fullscreen exit va tab hidden gan nhau | Event duoc ghi | Chi mot active violation/countdown | Must | Integration/E2E | Co |
| AT-FULL-RESOLVE-001 | Resolve violation | Tab visible lai nhung chua fullscreen | Quay lai tab | Violation chua resolve, overlay van chan | Must | E2E | Co |
| AT-OWN-001 | Attempt nguoi khac | Student1 | Goi payload Student2 attempt | 403/404 | Must | Integration | Co |
| AT-NETWORK-ANS-001 | Network tab | Attempt in_progress | Inspect API payload | Khong co correct answer/solution | Must | E2E/Integration | Co |
| AT-LOCK-001 | Admin khoa Student | Admin khoa Student | Student tao attempt | Bi chan | Must | E2E | Co |
| AT-LOCK-002 | Locked dang co attempt | Student bi khoa khi attempt in_progress | Admin khoa Student | Attempt `auto_submitted`, `submit_reason=account_locked` | Must | Integration/E2E | Co |
| AT-LOCK-003 | Locked answer queue | Student co answer da ack va answer pending client | Admin khoa Student | Chi answer da ack duoc cham | Must | Integration | Co |
| AT-LOCK-004 | Autosave sau khoa | Student da bi khoa | Autosave answer moi | Bi tu choi | Must | Integration | Co |
| AT-LOCK-005 | Mo khoa | Attempt da auto-submit vi account_locked | Admin mo khoa Student | Attempt cu khong mo lai | Must | Integration | Co |
| AT-CLOSE-001 | Admin dong de | Exam published | Admin close exam | Attempt moi bi chan | Must | Integration/E2E | Co |
| AT-CLOSE-002 | Close khi dang thi | Student dang co attempt in_progress | Admin close exam | Attempt van `in_progress`, khong auto-submit | Must | Integration/E2E | Co |
| AT-CLOSE-003 | Close autosave | Exam da closed, attempt tao truoc close | Student autosave | Thanh cong neu chua qua deadline | Must | Integration/E2E | Co |
| AT-CLOSE-004 | Close submit | Exam da closed, attempt tao truoc close | Student submit | Thanh cong va cham binh thuong | Must | Integration/E2E | Co |
| AT-CLOSE-005 | Close deadline | Exam da closed, attempt tao truoc close | Qua deadline | Attempt `auto_submitted`, reason `time_expired` | Must | Integration | Co |
| AT-UNAUTH-001 | API unauthorized | Guest/Student | Goi lan luot API admin, payload attempt nguoi khac, save answer attempt final, result bi tat | Tra 401/403/404 phu hop, response khong lo dap an/solution | Must | Integration | Co |

## 6. Load Test Bang k6 Hoac Artillery

### Kich ban

| Ma | Kich ban | VU | Ramp-up | Thoi gian | Buoc |
| --- | --- | --- | --- | --- | --- |
| LT-001 | 100 nguoi mo cung mot de | 100 | 2 phut | 5 phut | Login/startAttempt/getPayload |
| LT-002 | 100 nguoi luu dap an | 100 | 2 phut | 10 phut | Moi VU save 20 answers voi think time 1-3s |
| LT-003 | 100 nguoi nop gan dong thoi | 100 | 1 phut | 3 phut | Submit trong cua so 10s |
| LT-004 | 100 request submit trung lap | 100 | 30 giay | 2 phut | Moi VU gui 2 submit song song cho attempt cua minh |

### Du lieu test

- 100 tai khoan Student rieng.
- 1 exam published voi 50 questions, 4 options/question.
- Moi VU co attempt rieng; khong dung chung attempt.

### Chi so can theo doi

- p95/p99 latency cho `startAttempt`, `getAttemptPayload`, `saveAnswer`, `submitAttempt`.
- Ti le loi 4xx bat thuong va 5xx.
- So row `attempt_answers` sau test.
- So attempt final va score.
- Sentry error count.
- Supabase CPU/connection/database wait neu co.

### Nguong pass/fail

| Chi so | Nguong |
| --- | --- |
| 5xx | < 1% tong request |
| p95 `startAttempt` | <= 800 ms |
| p95 `getAttemptPayload` | <= 800 ms |
| p95 `saveAnswer` | <= 500 ms |
| p95 `submitAttempt` | <= 1200 ms |
| Mat du lieu | 0 answer da duoc server ack bi mat |
| Cham trung | 0 attempt co nhieu final score |
| Ownership | 0 VU doc/sua attempt cua VU khac |

### Kiem tra sau load

- Dem `attempt_answers` theo unique `(attempt_id, question_id)` khong co trung.
- Tat ca attempt trong LT-003 co status final.
- Khong co attempt cua Student A chua answer cua Student B.
- Khong co loi 5xx vuot nguong.
- Score duoc tinh mot lan/attempt.
- LT-004 khong co attempt nao doi `finalized_at`/score sau lan final dau.

## 7. TBD

- TBD-TEST-001: Chon k6 hay Artillery. De xuat mac dinh: k6 vi script gon va nguong pass/fail ro.
- TBD-TEST-002: Co chay WebKit trong CI moi commit hay nightly. De xuat mac dinh: Chromium moi commit, Firefox/WebKit nightly.
