# UI Guidelines

- Ngay cap nhat: 2026-08-01
- Phien ban: 0.1
- Trang thai: Draft

## Muc Luc

1. Nguyen tac tong the
2. Typography, spacing, radius, shadow, mau sac
3. Trang thai UI va accessibility
4. Responsive va navigation
5. Layout chinh
6. Man hinh lam bai
7. Admin dashboard
8. State, form, toast, dialog
9. Component dung lai
10. Tieu chi kiem tra giao dien

## 1. Nguyen Tac Tong The

- Giao dien uu tien doc nhanh, thao tac ro, khong sao chep website luyen thi nao.
- Guest/Student can thay de thi, thoi gian, trang thai va hanh dong tiep theo trong mot man hinh.
- Admin can giao dien gon, co loc, phan trang, khong nhieu bang/chi so chen chuc; dashboard toi da 3-4 block tom tat va moi list tai theo trang.
- Khong dung cau chung chung nhu "than thien"; moi guideline phai co dau hieu kiem tra duoc.

## 2. Typography, Spacing, Radius, Shadow, Mau Sac

| Hang muc | Quy tac |
| --- | --- |
| Typography | Font sans mac dinh cua app; body 14-16px; heading theo cap ro rang; khong scale font bang viewport width |
| Spacing | Dung scale 4/8px; section dashboard cach nhau 24px; form field cach nhau 12-16px |
| Border radius | Card/input/button 6-8px, tru khi shadcn/ui token khac |
| Shadow | Nhe, chi dung cho popover/dialog/sticky header; khong lap card trong card |
| Mau sac | Nen trung tinh sang; mau primary dung cho hanh dong chinh; mau danger chi cho hanh dong pha huy |
| Focus | Moi control co focus ring thay duoc bang keyboard |
| Error | Mau danger + text loi gan field; khong chi dua vao mau |

Brand color MVP: primary xanh lam trung tinh, accent xanh la nhe cho trang thai thanh cong, danger do.

## 3. Trang Thai UI Va Accessibility

- Hover: chi thay doi nen/vien nhe, khong lam layout nhay.
- Focus: ro tren button, input, link, option.
- Disabled: opacity giam, cursor disabled, co ly do neu hanh dong quan trong.
- Error: hien thong diep cu the, vi du "Thoi gian lam bai phai tu 1 den 300 phut".
- Accessibility: label cho input, aria cho dialog/toast, tab order logic, contrast toi thieu WCAG AA cho text chinh.

## 4. Responsive Va Navigation

### Guest

- Header co logo/ten san pham, link De thi, Tai lieu, Dang nhap/Dang ky.
- Mobile dung menu gon, khong che noi dung chinh.

### Student

- Navigation: Dashboard, De thi, Lich su, Ho so.
- Trong man hinh lam bai: khong co menu hoac link de roi bai thi.

### Admin

- Sidebar hoac top navigation: Dashboard, Subjects, Categories, Exams, Attempts, Students, Documents.
- Mobile Admin co the dung layout stacked; bang phai co scroll ngang co kiem soat.

## 5. Layout Chinh

| Trang | Quy tac layout |
| --- | --- |
| Trang chu | Gioi thieu ngan, de public noi bat, CTA xem de/dang ky; khong hero marketing qua dai |
| Thu vien de | Filter ben tren, danh sach co pagination; moi item hien mon, danh muc, duration, trang thai guest |
| Chi tiet de | Tieu de, mo ta, duration, so cau/diem, quyen truy cap, nut bat dau |
| Student dashboard | De gan day, attempt dang lam, lich su gan nhat |
| Ket qua | Diem, thoi gian nop, trang thai, cau dung/sai neu duoc phep, loi giai neu duoc phep |
| Admin dashboard | Tong quan ngan, lien ket den module; khong tai toan bo ban ghi |
| Trinh tao de | Form thong tin de, tabs/sections cho section/cau hoi, preview truoc publish |

### Trang Quan Ly De Theo Trang Thai

- Exam `draft`: cho phep sua toan bo noi dung, section, question, option, dap an dung, diem, duration va cau hinh random. Hien nut `Xuat ban`; khi publish, hien validation summary chi ro section/question/option nao chua hop le.
- Exam `published` chua co attempt: hien trang thai "Da xuat ban"; noi dung bi khoa mac dinh; co action `Dua ve ban nhap` kem confirmation de quay lai `draft` neu Admin can sua noi dung.
- Exam da co attempt: noi dung bai thi read-only; khong hien nut sua dap an dung, diem, duration, random config hoac thu tu section/question/option. Hien thong bao "De da co bai lam nen noi dung khong the chinh sua." va nut `Nhan ban de chinh sua`.
- Close exam phai mo ta ro la chi ngan luot thi moi; khong mo ta close exam la tu dong nop cac attempt dang lam.
- Form exam co switch `Bat buoc che do toan man hinh`. Mo ta: "Hoc sinh su dung trinh duyet khong ho tro toan man hinh se khong the bat dau de nay."

## 6. Man Hinh Lam Bai

Man hinh thi phai co:

- Header toi gian gom ten de, dong ho, trang thai luu, nut nop bai.
- Dong ho ro rang tinh tu `deadline_at - server_now`; canh bao mau danger khi con it thoi gian.
- Tien do: so cau da lam/tong so va so cau marked.
- Noi dung cau hoi co anh neu co, khong bi che boi header/footer.
- Lua chon dang radio/list item co vung click du lon.
- Nut cau truoc/cau sau.
- Danh sach so cau co trang thai: chua lam, da lam, danh dau, cau hien tai.
- Nut nop bai can confirmation dialog.
- Autosave: hien `Dang luu`, `Da luu luc HH:mm:ss`, `Luu that bai - thu lai`.
- Overlay vi pham fullscreen phu toan man hinh, chan pointer/keyboard vao bai thi, co countdown 5 giay va nut quay lai fullscreen.
- Neu exam bat buoc fullscreen nhung browser khong ho tro hoac request bi reject, hien thong bao truoc khi tao attempt va khong vao man hinh lam bai.

Khong co menu, footer link, breadcrumb, hoac link tai lieu tren man hinh lam bai.

## 7. Admin Dashboard

- Moi danh sach co filter ro: tu khoa, status, subject/category khi phu hop.
- Bat buoc co pagination; khong tai toan bo ban ghi cung luc.
- Bang hien cac cot thiet yeu truoc; chi tiet vao trang rieng.
- Empty state noi ro "Chua co de thi" va co CTA tao moi neu Admin co quyen.
- Error state co nut thu lai.
- Hanh dong pha huy/xoa mem/dong de can confirmation dialog.
- Khong nhoi qua nhieu bang va metric tren mot man hinh; toi da 3-4 block tom tat tren dashboard.

## 8. Loading, Empty, Error, Success, Dialog, Toast, Form

| State | Quy tac |
| --- | --- |
| Loading | Skeleton cho danh sach/bang; spinner chi cho hanh dong ngan |
| Empty | Mo ta nguyen nhan + hanh dong tiep theo neu co |
| Error | Thong diep cu the + retry; log Sentry cho loi server |
| Success | Toast ngan, tu dong dong; khong dung modal cho thanh cong nho |
| Confirmation | Neu pha huy du lieu, mo ta tac dong va nut danger |
| Validation | Validate client bang Zod/RHF va validate server lap lai |

## 9. Component Dung Lai

- `ExamCard`
- `ExamFilterBar`
- `QuestionNavigator`
- `AnswerOption`
- `AutosaveStatus`
- `CountdownTimer`
- `FullscreenViolationOverlay`
- `AdminDataTable`
- `StatusBadge`
- `ConfirmDialog`
- `FormFieldError`

## 10. Tieu Chi Kiem Tra Giao Dien

- AC-UI-001: Man hinh 375px khong co text/button tran khoi container.
- AC-UI-002: Tat ca form field co label va error text.
- AC-UI-003: Tab keyboard di qua control theo thu tu hop ly.
- AC-UI-004: Man hinh thi khong co link roi bai.
- AC-UI-005: Overlay fullscreen chan thao tac cau hoi.
- AC-UI-006: Admin table co filter, pagination, empty state, error state.
- AC-UI-007: Nut xoa/dong de can confirmation.
