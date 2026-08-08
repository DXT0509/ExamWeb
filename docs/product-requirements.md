# Product Requirements

- Ngay cap nhat: 2026-08-01
- Phien ban: 0.1
- Trang thai: Draft

## Muc Luc

1. Tong quan san pham
2. Van de can giai quyet
3. Muc tieu
4. Doi tuong su dung
5. Pham vi MVP
6. Ngoai MVP
7. User journey
8. Functional requirements
9. Non-functional requirements
10. Bao mat, hieu nang, kha dung, tuong thich
11. Gia dinh, rang buoc, rui ro
12. Tieu chi hoan thanh MVP

## 1. Tong quan san pham

Nen tang luyen thi truc tuyen cho khoang 100 nguoi dung dong thoi, gom Guest, Student va Admin. San pham cho phep cong bo de thi, lam bai co thoi gian, luu dap an tu dong, nop bai idempotent, xem ket qua theo cau hinh, va quan tri noi dung thi.

San pham khong sao chep thuong hieu, noi dung, du lieu hoac giao dien cua bat ky website nao. Tat ca cau hoi, tai lieu va du lieu seed phai la noi dung tu tao hoac duoc cap quyen hop le.

## 2. Van de can giai quyet

- Hoc sinh can mot noi lam de on tap co thoi gian, lich su, ket qua va loi giai ro rang.
- Quan tri vien can mot cong cu tao de co cau truc, xuat ban, theo doi ket qua va quan ly hoc sinh.
- He thong can tranh lo dap an dung truoc khi nop bai, tranh sua bai sau khi nop, va chiu duoc 100 nguoi cung luu/nop bai gan dong thoi.

## 3. Muc tieu

| Ma | Muc tieu | Do do |
| --- | --- | --- |
| GOAL-001 | Guest xem va tim de cong khai | Tim keyword/subject/category filter tra ket qua trong 2 giay voi du lieu MVP |
| GOAL-002 | Student lam bai on dinh | Dap an duoc autosave va phuc hoi sau refresh |
| GOAL-003 | Admin quan ly noi dung thi | Admin tao, sua, xuat ban de co cau hoi va section |
| GOAL-004 | Bao ve du lieu bai thi | Client khong nhan dap an dung truoc khi attempt duoc nop |
| GOAL-005 | Chiu tai MVP | 100 VU bat dau, luu dap an, nop bai gan dong thoi dat nguong load test |

## 4. Doi Tuong Su Dung

| Nhom | Mo ta | Nhu cau chinh |
| --- | --- | --- |
| Guest | Nguoi chua dang nhap | Xem trang chu, tim de cong khai, lam de mien phi neu duoc phep |
| Student | Hoc sinh co tai khoan | Lam bai, xem ket qua/lich su/loi giai theo cau hinh, quan ly ho so |
| Admin | Quan tri vien | Quan ly mon hoc, danh muc, de, cau hoi, hoc sinh, tai lieu va thong ke |

## 5. Pham Vi MVP

- Auth bang Supabase Authentication: dang ky, dang nhap, dang xuat.
- Route guard cho Guest, Student, Admin.
- Quan ly `subjects`, `exam_categories`, `exams`, `exam_sections`, `questions`, `question_options`.
- Upload anh cau hoi qua Supabase Storage.
- Xuat ban/dong de thi.
- Thu vien de cong khai co tim kiem va loc co ban.
- Tao attempt cho Student va Guest neu de cho phep.
- Man hinh lam bai theo cau hinh `fullscreen_required`, chon/danh dau cau hoi, autosave, dong ho server-based.
- Nop bai chu dong, nop bai khi het gio, nop bai do vi pham fullscreen.
- Cham diem cau hoi trac nghiem mot dap an dung trong MVP.
- Ket qua, lich su va loi giai theo cau hinh Admin.
- Tai lieu cong khai.
- Acceptance/load test cho 100 nguoi dong thoi.

## 6. Cac Chuc Nang Ngoai MVP

| Hang muc | Ly do dua ra sau |
| --- | --- |
| Import cau hoi tu Excel | Can chuan hoa template, validate va rollback rieng |
| Thanh toan, goi VIP | Khong thuoc muc tieu MVP |
| Webcam/proctoring nang cao | Rui ro rieng tu va ky thuat cao |
| AI cham bai | MVP chi cham trac nghiem |
| Dien dan, bang xep hang | Tang pham vi xa nhu cau cot loi |
| Cau hoi tu luan, multiple-correct | Can rubric va scoring phuc tap hon |
| Dung attempt dang lam ngay khi Admin close exam | MVP close exam chi chan attempt moi |
| `exam_versions`/snapshot phuc tap | MVP khoa noi dung sau publish va clone exam khi can sua |

## 7. User Journey

### Guest

1. Mo trang chu.
2. Xem thu vien de cong khai.
3. Tim kiem/loc theo mon, danh muc, tu khoa.
4. Xem chi tiet co ban cua de.
5. Neu `allow_guest_attempt = true`, Guest co the bat dau lam bai bang phien tam.
6. Sau khi nop, Guest xem ket qua neu de cho phep; lich su khong duoc luu dai han ngoai phien.

### Student

1. Dang ky hoac dang nhap.
2. Xem dashboard va danh sach de duoc phep.
3. Mo chi tiet de, bam bat dau.
4. Xac nhan huong dan fullscreen.
5. Lam bai, autosave dap an, danh dau cau hoi.
6. Nop bai hoac bi auto-submit khi het gio/qua han vi pham fullscreen.
7. Xem ket qua, lich su, loi giai theo cau hinh.

### Admin

1. Dang nhap bang tai khoan Admin.
2. Quan ly mon hoc va danh muc.
3. Tao de, section, cau hoi, option, dap an dung, loi giai.
4. Cau hinh thoi gian, diem, quyen truy cap, hien thi dap an/loi giai.
5. Xuat ban de.
6. Xem bai lam, ket qua, thong ke.
7. Khoa/mo tai khoan Student va quan ly tai lieu cong khai.

## 8. Functional Requirements

| Ma | Ten | Mo ta | Uu tien | Dieu kien truoc | Ket qua mong doi | Tieu chi kiem thu |
| --- | --- | --- | --- | --- | --- | --- |
| FR-AUTH-001 | Dang ky Student | Student tao tai khoan bang email/password qua Supabase Auth | Must | Email chua ton tai | Tao `auth.users` va `profiles.role = student` | Given email hop le, When dang ky, Then user dang nhap va profile la student |
| FR-AUTH-002 | Dang nhap/dang xuat | Student/Admin dang nhap va dang xuat | Must | Tai khoan active | Session duoc tao/xoa | Route can auth chi truy cap sau dang nhap |
| FR-AUTH-003 | Khoa tai khoan | Admin khoa/mo Student | Must | Admin hop le | Student bi khoa khong bat dau attempt moi | Student bi khoa bi redirect den trang thong bao |
| FR-RBAC-001 | Route guard | Bao ve route theo role | Must | Role doc tu server | Guest/Student/Admin vao dung khu vuc | Thu cong go URL admin bang Student bi tu choi |
| FR-CATALOG-001 | Xem de cong khai | Guest xem de published/public | Must | De da xuat ban | Danh sach de hien thi khong lo du lieu rieng | Guest khong thay de private/draft |
| FR-CATALOG-002 | Tim kiem va loc | Loc theo tu khoa, mon, danh muc | Must | Co de cong khai | Ket qua dung dieu kien | Filter tra khong qua 2 giay voi du lieu seed MVP |
| FR-ADMIN-001 | Quan ly mon hoc | Admin tao/sua/xoa mem subjects | Must | Admin hop le | Subject duoc cap nhat | Student khong goi duoc API ghi |
| FR-ADMIN-002 | Quan ly danh muc | Admin tao/sua/xoa mem exam_categories | Must | Admin hop le | Category duoc cap nhat | Category gan exam dang published khong xoa cung |
| FR-EXAM-001 | Tao de | Admin tao exam o trang thai draft | Must | Co subject/category | Exam draft duoc tao | Truong bat buoc duoc validate |
| FR-EXAM-002 | Tao section | Admin tao va sap xep section | Must | Exam draft | Section co `position` duy nhat trong exam | Reorder luu dung thu tu |
| FR-QUESTION-001 | Tao cau hoi | Admin tao cau hoi, diem, anh, loi giai | Must | Exam draft | Question duoc luu | Cau hoi thieu noi dung bi tu choi |
| FR-QUESTION-002 | Tao option va dap an dung | Admin tao option va danh dau dap an dung | Must | Question ton tai | Co it nhat 2 option va 1 option dung | Published exam khong duoc thieu dap an dung |
| FR-EXAM-003 | Cau hinh de | Admin cau hinh duration, access, show result/solution | Must | Exam draft | Config duoc luu | Gia tri am hoac qua gioi han bi tu choi |
| FR-EXAM-004 | Xuat ban/dong de | Admin chuyen draft sang published hoac closed | Must | De hop le | Guest/Student thay theo access | De thieu cau hoi khong publish duoc |
| FR-EXAM-005 | Khoa noi dung sau publish | Noi dung anh huong ket qua bi khoa sau `published`; exam da co attempt phai clone de sua | Must | Exam published | Attempt cu cham theo noi dung cu | Sua `is_correct`/score/thu tu cua exam da co attempt bi tu choi |
| FR-EXAM-006 | Validate publish va tinh tong diem | Server validate cau truc va tinh `total_score` | Must | Exam draft | `total_score = SUM(active questions.score)` | Client gui `total_score` gia bi bo qua |
| FR-EXAM-007 | Clone exam | Admin clone exam da co attempt thanh exam moi `draft` | Must | Admin hop le, exam ton tai | Section/question/option duoc copy sang ID moi | Attempt cu van tro den exam cu |
| FR-ATTEMPT-001 | Bat dau attempt | Student/Guest duoc phep tao attempt | Must | Exam published, user duoc phep | `started_at` va `deadline_at` tao tu server | Client sua duration khong anh huong deadline |
| FR-ATTEMPT-002 | Tiep tuc attempt | Student quay lai attempt `in_progress` | Must | Attempt chua het han | Tai cau hoi va dap an da luu | Refresh trang phuc hoi tien do |
| FR-ATTEMPT-003 | Tai cau hoi an dap an dung | API tra cau hoi/option khong tra `is_correct` | Must | Attempt hop le | Client khong biet dap an dung | Network tab khong thay truong dap an dung |
| FR-ANSWER-001 | Autosave dap an | Luu/doi dap an bang upsert | Must | Attempt `in_progress` | Mot ban ghi moi cau hoi | Unique `attempt_id + question_id` ngan trung |
| FR-ANSWER-002 | Danh dau cau hoi | Student mark/unmark question | Should | Attempt `in_progress` | `is_marked` cap nhat | Refresh van giu trang thai |
| FR-SUBMIT-001 | Nop bai idempotent | Nop bai nhieu lan khong cham trung bang transaction + row lock | Must | Attempt ton tai | Chi co mot ket qua cuoi | Hai request song song/retry key khac khong doi `finalized_at`/score |
| FR-SUBMIT-002 | Het gio | Server auto-submit khi qua `deadline_at` | Must | Attempt `in_progress` | Attempt thanh `auto_submitted`, `submit_reason = time_expired`; `expired` chi dung khi khong the cham/phuc hoi hop le | Client sua dong ho khong nop tre |
| FR-SCORE-001 | Cham diem | Cham trac nghiem mot dap an dung | Must | Attempt submitted | Luu `score` va `max_score` | Ket qua khop dap an seed |
| FR-RESULT-001 | Xem ket qua | Student xem diem theo cau hinh exam | Must | Attempt cua chinh minh | Hien diem, trang thai, thoi gian | Exam tat ket qua thi khong hien chi tiet |
| FR-SOLUTION-001 | Xem loi giai | Hien loi giai sau nop neu Admin cho phep | Should | Attempt submitted | Loi giai hien theo cau hinh | Khi tat, API khong tra solution |
| FR-FULL-001 | Kich hoat fullscreen | Neu exam `fullscreen_required = true`, Student phai vao fullscreen thanh cong truoc khi tao attempt | Must | Browser ho tro Fullscreen API | Fullscreen API duoc goi tu user gesture, sau do server tao attempt | Browser khong ho tro/reject thi khong tao attempt |
| FR-FULL-002 | Xu ly thoat fullscreen | Overlay chan UI, dem 5 giay, yeu cau bam quay lai | Must | Dang lam bai | Event duoc ghi server | Quay lai trong 5 giay tiep tuc |
| FR-FULL-003 | Auto-submit vi pham | Qua 5 giay chua quay lai thi nop bai | Must | Vi pham chua resolve | Attempt `auto_submitted`, `submit_reason = fullscreen_violation` | Server xac minh timestamp vi pham |
| FR-DOC-001 | Tai lieu cong khai | Admin quan ly documents va Guest doc public | Should | Document published | File/link hien o thu vien tai lieu | Guest khong doc private document |

## 9. Non-functional Requirements

| Ma | Ten | Mo ta | Uu tien | Dieu kien truoc | Ket qua mong doi | Tieu chi kiem thu |
| --- | --- | --- | --- | --- | --- | --- |
| NFR-PERF-001 | 100 nguoi dong thoi | Ho tro 100 VU bat dau, tai payload, luu, nop bai | Must | Du lieu seed load test | p95 startAttempt <= 800 ms; p95 getAttemptPayload <= 800 ms; p95 saveAnswer <= 500 ms; p95 submitAttempt <= 1200 ms; 5xx < 1% | k6/Artillery dat nguong |
| NFR-SEC-001 | RLS bat buoc | Bang rieng tu co Supabase RLS | Must | Migration da ap dung | Client chi doc/ghi dung quyen | Test RLS bang token tung role |
| NFR-SEC-002 | Khong lo dap an | `is_correct` khong tra cho attempt chua nop | Must | Attempt in_progress | Network response khong co dap an dung | E2E kiem Network tab/API |
| NFR-REL-001 | Idempotency | API submit an toan khi retry | Must | Attempt ton tai | Khong cham/lap submit trung | Test request song song |
| NFR-AVAIL-001 | Kha dung MVP | He thong hoat dong tren Vercel/Supabase | Should | Cau hinh production | Loi duoc ghi Sentry | Synthetic check pass |
| NFR-A11Y-001 | Accessibility | UI dung keyboard va screen reader co ban | Should | Component shadcn/ui | Focus state ro, label form day du | Axe khong co loi nghiem trong |
| NFR-COMPAT-001 | Trinh duyet | Ho tro Chrome, Edge, Firefox, Safari phien ban hien hanh | Must | Thiet bi desktop/mobile pho bien | Chuc nang chinh hoat dong | Playwright chay chromium/firefox/webkit |

## 10. Bao Mat, Hieu Nang, Kha Dung, Tuong Thich

- Bao mat: xem chi tiet tai [roles-permissions.md](./roles-permissions.md). Role tu client khong dang tin cay; route guard phai di kem RLS.
- Hieu nang: khong ghi dong ho moi giay; autosave chi ghi khi thay doi dap an/debounce hop ly; index cho `exam_attempts`, `attempt_answers`, `exam_events`.
- Kha dung: loi autosave phai hien trang thai va retry; submit phai co retry idempotent.
- Tuong thich: Fullscreen API co gioi han tren mobile; xem [fullscreen-policy.md](./fullscreen-policy.md).

## 11. Gia Dinh, Rang Buoc, Rui Ro

### Gia Dinh

- Supabase la nguon xac thuc va database chinh.
- MVP chi co cau hoi trac nghiem mot dap an dung.
- MVP khong co lop/nhom/assignment. `access_type = public` cho Guest/Student xem, `students_only` cho Student active, `private` chi Admin xem/preview va khong cho Student/Guest bat dau attempt.

### Rang Buoc

- Chi xay tai lieu trong giai do nay.
- Thoi gian thi dua tren server.
- Khong gui dap an dung xuong client truoc khi nop.
- Attempt da nop khong duoc sua dap an.
- Guest khong co lich su dai han.
- Guest attempt dung signed session cookie/token tam thoi do server tao; khong dua vao `attemptId` trong URL de xac dinh owner.
- Sau publish, noi dung anh huong ket qua bi khoa. Exam da co attempt khong duoc dua ve `draft`; Admin clone exam neu can sua noi dung.
- Close exam chi chan attempt moi; attempt `in_progress` van duoc autosave/submit den `deadline_at`.
- Submit reason MVP gom `student_submit`, `time_expired`, `fullscreen_violation`, `account_locked`, `system_recovery`; close exam khong tao submit reason rieng trong MVP.

### Rui Ro

| Rui ro | Tac dong | Giam thieu |
| --- | --- | --- |
| Fullscreen khong phai chong gian lan tuyet doi | Student co the dung thiet bi khac | Ghi ro gioi han va chi xem la tin hieu han che |
| Trinh duyet khong ho tro fullscreen | Student khong bat dau duoc exam bat buoc fullscreen | Cau hinh `fullscreen_required` va thong bao de nghi dung desktop browser ho tro |
| Autosave dong thoi tao ghi trung | Mat/nhan doi dap an | Unique constraint va upsert |
| 100 submit dong thoi gay cham diem lap | Sai ket qua | Transaction, row lock attempt va khong cham lai attempt final |
| RLS sai | Lo du lieu rieng | Test RLS bat buoc trong CI |

## 12. Tieu Chi Hoan Thanh MVP

- Tat ca FR Must dat acceptance test.
- Tat ca NFR Must dat test tuong ung.
- Load test 100 VU dat nguong pass/fail trong [acceptance-tests.md](./acceptance-tests.md).
- Tai lieu schema, RLS, lifecycle va fullscreen duoc doi chieu thong nhat ve trang thai: `draft`, `published`, `closed`, `archived`, `in_progress`, `submitted`, `auto_submitted`, `expired`.
- Submit reason MVP thong nhat: `student_submit`, `time_expired`, `fullscreen_violation`, `account_locked`, `system_recovery`.
- Khong co code chuc nang duoc viet trong giai do tai lieu nay.
