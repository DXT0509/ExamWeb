import { expect, test } from "@playwright/test";

test.describe("Phase 7 Exam Engine E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
      let isFullscreen = false;
      Object.defineProperty(document, "fullscreenEnabled", { get: () => true, configurable: true });
      Object.defineProperty(document, "fullscreenElement", { get: () => (isFullscreen ? document.documentElement : null), configurable: true });
      Element.prototype.requestFullscreen = async function () {
        isFullscreen = true;
        document.dispatchEvent(new Event("fullscreenchange"));
      };
      document.exitFullscreen = async function () {
        isFullscreen = false;
        document.dispatchEvent(new Event("fullscreenchange"));
      };
    });
  });

  test("Guest can start a public exam, select answers, refresh and submit successfully", async ({ page }) => {
    // 1. Navigate to public exam detail
    await page.goto("/exams/de-cong-khai-nen-tang-so");
    await expect(page.getByRole("heading", { name: "Đề công khai nền tảng số" })).toBeVisible();

    // 2. Click "Bắt đầu làm bài"
    await page.getByRole("button", { name: "Bắt đầu làm bài" }).click();

    // If Fullscreen Gate appears, click "Vào chế độ toàn màn hình"
    const gateBtn = page.getByRole("button", { name: "Vào chế độ toàn màn hình" });
    if (await gateBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await gateBtn.click();
    }

    // 3. Should redirect to attempt taking page
    await expect(page).toHaveURL(/\/attempts\/[a-f0-9-]+/);
    await expect(page.getByText("Đang làm bài thi")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Đề công khai nền tảng số" })).toBeVisible();

    // 4. Select answer for question 1
    await page.locator('input[type="radio"]').first().check();
    await expect(page.getByText("Đã lưu")).toBeVisible();

    // 5. Navigate to Question 2
    await page.getByRole("button", { name: "Câu tiếp theo" }).click();
    await expect(page.getByText("Câu 2")).toBeVisible();

    // 6. Refresh page and verify attempt state is preserved
    await page.reload();
    await expect(page.getByText("Đang làm bài thi")).toBeVisible();

    // 7. Click Submit button
    await page.getByRole("button", { name: "Nộp bài" }).click();
    await expect(page.getByRole("heading", { name: "Xác nhận nộp bài" })).toBeVisible();

    // 8. Confirm submit
    await page.getByRole("button", { name: "Xác nhận nộp bài" }).click();

    // 9. Redirected to result page
    await expect(page).toHaveURL(/\/attempts\/[a-f0-9-]+\/result/);
    await expect(page.getByText("Bài thi đã được nộp thành công")).toBeVisible();
    await expect(page.getByText("Điểm số")).toBeVisible();
  });

  test("Student can start a students-only exam, navigate, answer questions and view results", async ({ page }) => {
    // 1. Student login
    await page.goto("/login");
    await page.locator('input[name="email"]').fill("student1@example.test");
    await page.locator('input[name="password"]').fill("LocalStudent123!");
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/student/);

    // 2. Go to students-only exam
    await page.goto("/exams/de-danh-cho-hoc-vien-doc-hieu");
    await expect(page.getByRole("heading", { name: "Đề dành cho học viên đọc hiểu" })).toBeVisible();

    // 3. Click "Bắt đầu làm bài"
    await page.getByRole("button", { name: "Bắt đầu làm bài" }).click();
    await expect(page).toHaveURL(/\/attempts\/[a-f0-9-]+/);

    // 4. Mark question
    await page.getByRole("button", { name: "Đánh dấu" }).click();
    await expect(page.getByRole("button", { name: "Đã đánh dấu" })).toBeVisible();

    // 5. Submit
    await page.getByRole("button", { name: "Nộp bài" }).click();
    await page.getByRole("button", { name: "Xác nhận nộp bài" }).click();

    // 6. Result page shown
    await expect(page).toHaveURL(/\/attempts\/[a-f0-9-]+\/result/);
    await expect(page.getByText("Điểm số")).toBeVisible();
  });
});
