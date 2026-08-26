import { expect, test } from "@playwright/test";

test.describe("Phase 9 Student Results, History & Statistics E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
      (window as unknown as Record<string, unknown>).__MOCK_FULLSCREEN_SUCCESS__ = true;
      let isFullscreen = false;
      Object.defineProperty(document, "fullscreenEnabled", { get: () => true, configurable: true });
      Object.defineProperty(document, "fullscreenElement", {
        get: () => (isFullscreen ? document.documentElement : null),
        configurable: true,
      });
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

  test("Student flow: complete exam -> view result -> view history -> check statistics", async ({ page }) => {
    // 1. Student login
    await page.goto("/login");
    await page.locator('input[name="email"]').fill("student1@example.test");
    await page.locator('input[name="password"]').fill("LocalStudent123!");
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/student/, { timeout: 15000 });

    // 2. Start exam
    await page.goto("/exams/de-danh-cho-hoc-vien-doc-hieu");
    await expect(page.getByRole("heading", { name: "Đề dành cho học viên đọc hiểu" })).toBeVisible();
    await page.getByRole("button", { name: "Bắt đầu làm bài" }).click();

    const gateBtn = page.getByRole("button", { name: "Vào chế độ toàn màn hình" });
    if (await gateBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await gateBtn.click();
    }

    await expect(page).toHaveURL(/\/attempts\/[a-f0-9-]+/, { timeout: 15000 });
    const attemptUrl = page.url();
    const attemptId = attemptUrl.split("/attempts/")[1];

    // Select answer and submit
    await page.locator('input[type="radio"]').first().check();
    await page.getByRole("button", { name: "Nộp bài" }).click();
    await page.getByRole("button", { name: "Xác nhận nộp bài" }).click();

    // 3. Result page verification
    await expect(page).toHaveURL(new RegExp(`/attempts/${attemptId}/result`), { timeout: 15000 });
    await expect(page.getByText("Bài thi đã được nộp thành công")).toBeVisible();
    await expect(page.getByText("Điểm số")).toBeVisible();
    await expect(page.getByText("Tỷ lệ đúng")).toBeVisible();

    // 4. Click Quay lại lịch sử
    await page.getByRole("link", { name: "Quay lại lịch sử", exact: true }).click();
    await expect(page).toHaveURL(/\/student\/history/, { timeout: 15000 });
    await expect(page.getByRole("heading", { name: "Lịch sử làm bài" })).toBeVisible();

    // 5. Verify filter and sort toolbar
    await expect(page.getByText("Lọc:")).toBeVisible();
    await expect(page.getByText("Sắp xếp:")).toBeVisible();
  });

  test("Security: Guest access result of own attempt but cannot access student history", async ({ page }) => {
    // 1. Guest takes exam
    await page.goto("/exams/de-cong-khai-nen-tang-so");
    await page.getByRole("button", { name: "Bắt đầu làm bài" }).click();

    const gateBtn = page.getByRole("button", { name: "Vào chế độ toàn màn hình" });
    if (await gateBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await gateBtn.click();
    }

    await expect(page).toHaveURL(/\/attempts\/[a-f0-9-]+/, { timeout: 15000 });

    // 2. Submit exam
    await page.getByRole("button", { name: "Nộp bài" }).click();
    await page.getByRole("button", { name: "Xác nhận nộp bài" }).click();

    // 3. Result page displays for Guest
    await expect(page).toHaveURL(/\/attempts\/[a-f0-9-]+\/result/, { timeout: 15000 });
    await expect(page.getByText("Bài thi đã được nộp thành công")).toBeVisible();

    // 4. Guest tries to access /student/history -> should redirect to login
    await page.goto("/student/history");
    await expect(page).toHaveURL(/\/login|\/auth\/login/);
  });
});
