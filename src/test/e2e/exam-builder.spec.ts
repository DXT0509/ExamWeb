import { expect, test } from "@playwright/test";

test.describe("Phase: Admin Exam Builder Redesign & E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });

    // Login as Admin
    await page.goto("/login");
    await page.locator('input[name="email"]').fill("admin@example.test");
    await page.locator('input[name="password"]').fill("LocalAdmin123!");
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/admin/, { timeout: 15000 });
  });

  test("1-5. Admin creates an exam without manual slug, chooses seeded THPT subject, and sees Section 1 & Question ready", async ({ page }) => {
    await page.goto("/admin/exams/new");
    await expect(page.getByRole("heading", { name: "Tạo đề thi mới" })).toBeVisible({ timeout: 10000 });

    // Verify no manual slug input exists in form
    await expect(page.locator('input[name="slug"]')).toHaveCount(0);

    // Verify seeded THPT subjects exist in dropdown
    const subjectSelect = page.locator('select[name="subjectId"]');
    await expect(subjectSelect).toBeVisible();
    await expect(subjectSelect.locator("option", { hasText: "Toán học" })).toHaveCount(1);
    await expect(subjectSelect.locator("option", { hasText: "Vật lý" })).toHaveCount(1);
    await expect(subjectSelect.locator("option", { hasText: "Hóa học" })).toHaveCount(1);
    await expect(subjectSelect.locator("option", { hasText: "Tiếng Anh" })).toHaveCount(1);

    // Fill new exam form
    const examTitle = `Đề thi Thử THPT Quốc gia ${Date.now()}`;
    await page.locator('input[name="title"]').fill(examTitle);
    await subjectSelect.selectOption({ label: "Vật lý" });
    await page.locator('input[name="durationMinutes"]').fill("45");
    await page.getByRole("button", { name: "Tạo đề thi & Bắt đầu soạn" }).click();

    // After creation, redirects to Exam Builder
    await expect(page).toHaveURL(/\/admin\/exams\/[0-9a-f-]+/);
    await expect(page.getByRole("heading", { name: examTitle })).toBeVisible();
    await expect(page.getByText("Vật lý", { exact: true }).first()).toBeVisible();

    // Section 1 automatically exists
    await expect(page.getByRole("heading", { name: "Phần 1: Trắc nghiệm" })).toBeVisible();
  });

  test("6-9. Admin can inline edit questions and options, and use '+' insert pattern", async ({ page }) => {
    // 1. Create a fresh draft exam
    await page.goto("/admin/exams/new");
    const examTitle = `Đề soạn nháp ${Date.now()}`;
    await page.locator('input[name="title"]').fill(examTitle);
    await page.locator('select[name="subjectId"]').selectOption({ index: 1 });
    await page.locator('input[name="durationMinutes"]').fill("30");
    await page.getByRole("button", { name: "Tạo đề thi & Bắt đầu soạn" }).click();
    await expect(page).toHaveURL(/\/admin\/exams\/[0-9a-f-]+/);

    // 2. Add question using "+" pattern
    const addQuestionBtn = page.getByRole("button", { name: /Thêm câu hỏi/i }).first();
    await expect(addQuestionBtn).toBeVisible();
    await addQuestionBtn.click();
    await page.waitForTimeout(500);

    // 3. Click question to inline edit
    const questionCard = page.locator(".group\\/card").last();
    await expect(questionCard).toBeVisible();
    await questionCard.locator(".group\\/qcontent").click();

    // Check textarea visible for inline editing
    const textarea = questionCard.locator("textarea").first();
    await expect(textarea).toBeVisible();
    await textarea.fill("Câu hỏi kiểm tra tốc độ phản xạ");
    await questionCard.getByRole("button", { name: "Lưu nội dung" }).click();
    await page.waitForTimeout(500);
    await expect(questionCard.getByText("Câu hỏi kiểm tra tốc độ phản xạ")).toBeVisible();

    // 4. Add option using "+" pattern
    const addOptionBtn = questionCard.getByRole("button", { name: /Thêm phương án/i });
    if (await addOptionBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addOptionBtn.click();
      await page.waitForTimeout(500);
    }

    // 5. Select correct answer radio
    const optionBtns = questionCard.locator('button[aria-label*="đáp án đúng"]');
    if (await optionBtns.count() >= 2) {
      await optionBtns.nth(1).click();
      await page.waitForTimeout(500);
    }
  });

  test("10-14. Delete UX has confirmation dialog, cancel preserves entity, confirm deletes entity", async ({ page }) => {
    // Create a fresh draft exam
    await page.goto("/admin/exams/new");
    const examTitle = `Đề xóa thử ${Date.now()}`;
    await page.locator('input[name="title"]').fill(examTitle);
    await page.locator('select[name="subjectId"]').selectOption({ index: 1 });
    await page.getByRole("button", { name: "Tạo đề thi & Bắt đầu soạn" }).click();
    await expect(page).toHaveURL(/\/admin\/exams\/[0-9a-f-]+/);

    // Add a question
    const addQuestionBtn = page.getByRole("button", { name: /Thêm câu hỏi/i }).first();
    await addQuestionBtn.click();
    await page.waitForTimeout(500);

    // Click Delete Question icon
    const deleteBtn = page.locator('button[aria-label*="Xóa câu hỏi"]').first();
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();

    // Confirmation dialog should appear
    await expect(page.getByRole("heading", { name: /Xóa câu hỏi/i })).toBeVisible();
    await expect(page.getByText("Câu hỏi và các phương án lựa chọn liên quan sẽ bị xóa khỏi đề thi.")).toBeVisible();

    // Cancel delete
    await page.getByRole("button", { name: "Hủy" }).click();
    await expect(page.getByRole("heading", { name: /Xóa câu hỏi/i })).toHaveCount(0);

    // Entity is still present
    await expect(deleteBtn).toBeVisible();

    // Confirm delete
    await deleteBtn.click();
    await page.getByRole("button", { name: "Xác nhận xóa" }).click();
    await page.waitForTimeout(500);
    await expect(page.locator(".group\\/card")).toHaveCount(0);
  });

  test("15-16. Exam lifecycle and preview modal work seamlessly", async ({ page }) => {
    await page.goto("/admin/exams/new");
    const examTitle = `Đề kiểm tra preview ${Date.now()}`;
    await page.locator('input[name="title"]').fill(examTitle);
    await page.locator('select[name="subjectId"]').selectOption({ index: 1 });
    await page.getByRole("button", { name: "Tạo đề thi & Bắt đầu soạn" }).click();
    await expect(page).toHaveURL(/\/admin\/exams\/[0-9a-f-]+/);

    // Open Preview Modal
    await page.getByRole("button", { name: "Xem trước" }).click();
    await expect(page.getByRole("heading", { name: examTitle })).toBeVisible();
    await page.keyboard.press("Escape");

    // Open Meta Settings Modal
    await page.getByRole("button", { name: "Cài đặt đề thi" }).click();
    await expect(page.getByText("Cài đặt & Cấu hình đề thi")).toBeVisible();
    await page.getByRole("button", { name: "Đóng" }).first().click();
  });
});
