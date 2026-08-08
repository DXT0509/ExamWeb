import { expect, test } from "@playwright/test";

test.describe("Phase 8 Fullscreen Integrity E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();

    // Inject Fullscreen API mock in browser environment so requestFullscreen succeeds in headless test
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
      let isFullscreen = false;

      Object.defineProperty(document, "fullscreenEnabled", {
        get: () => true,
        configurable: true,
      });

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

      // Expose helper to simulate escape / exit fullscreen from test script
      (window as unknown as Record<string, unknown>).__simulateExitFullscreen = () => {
        isFullscreen = false;
        document.dispatchEvent(new Event("fullscreenchange"));
      };
    });
  });

  test("Test 1 — Fullscreen required exam start flow with gate", async ({ page }) => {
    await page.goto("/exams/de-cong-khai-nen-tang-so");
    await expect(page.getByRole("heading", { name: "Đề công khai nền tảng số" })).toBeVisible();

    // Click Bắt đầu làm bài
    await page.getByRole("button", { name: "Bắt đầu làm bài" }).click();

    // Fullscreen Gate modal appears
    await expect(page.getByText("Bài thi yêu cầu toàn màn hình")).toBeVisible();
    await expect(page.getByText("Để bắt đầu bài thi, bạn cần bật chế độ toàn màn hình.")).toBeVisible();

    // Click Vào chế độ toàn màn hình
    await page.getByRole("button", { name: "Vào chế độ toàn màn hình" }).click();

    // Redirected to attempt page
    await expect(page).toHaveURL(/\/attempts\/[a-f0-9-]+/);
    await expect(page.getByText("Đang làm bài thi")).toBeVisible();
  });

  test("Test 2 — Exit fullscreen triggers warning, return resolves warning", async ({ page }) => {
    await page.goto("/exams/de-cong-khai-nen-tang-so");
    await page.getByRole("button", { name: "Bắt đầu làm bài" }).click();
    await page.getByRole("button", { name: "Vào chế độ toàn màn hình" }).click();
    await expect(page).toHaveURL(/\/attempts\/[a-f0-9-]+/);

    // Simulate exit fullscreen
    await page.evaluate(() => {
      (window as unknown as { __simulateExitFullscreen: () => void }).__simulateExitFullscreen();
    });

    // Warning overlay appears with countdown
    await expect(page.getByText("Bạn đã rời khỏi chế độ toàn màn hình")).toBeVisible();
    await expect(page.getByText("Vui lòng quay lại chế độ toàn màn hình.")).toBeVisible();

    // Click Quay lại toàn màn hình
    await page.getByRole("button", { name: "Quay lại toàn màn hình" }).click();

    // Warning overlay disappears
    await expect(page.getByText("Bạn đã rời khỏi chế độ toàn màn hình")).not.toBeVisible();
    await expect(page.getByText("Đang làm bài thi")).toBeVisible();
  });

  test("Test 3 — Exit fullscreen and timeout 5s triggers auto-submit", async ({ page }) => {
    await page.goto("/exams/de-cong-khai-nen-tang-so");
    await page.getByRole("button", { name: "Bắt đầu làm bài" }).click();
    await page.getByRole("button", { name: "Vào chế độ toàn màn hình" }).click();
    await expect(page).toHaveURL(/\/attempts\/[a-f0-9-]+/);

    // Simulate exit fullscreen
    await page.evaluate(() => {
      (window as unknown as { __simulateExitFullscreen: () => void }).__simulateExitFullscreen();
    });

    await expect(page.getByText("Bạn đã rời khỏi chế độ toàn màn hình")).toBeVisible();

    // Wait 6 seconds for auto-submit
    await page.waitForTimeout(6000);

    // Redirected to result page
    await expect(page).toHaveURL(/\/attempts\/[a-f0-9-]+\/result/);
    await expect(page.getByText("Bài thi đã được nộp thành công")).toBeVisible();
  });

  test("Test 4 — Non-fullscreen exam bypasses gate and warning", async ({ page }) => {
    // Log in as student because this exam requires student role
    await page.goto("/login");
    await page.locator('input[name="email"]').fill("student1@example.test");
    await page.locator('input[name="password"]').fill("LocalStudent123!");
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/student/);

    await page.goto("/exams/de-danh-cho-hoc-vien-doc-hieu");
    await expect(page.getByRole("heading", { name: "Đề dành cho học viên đọc hiểu" })).toBeVisible();

    // Click Bắt đầu làm bài (non-fullscreen exam starts directly without gate)
    await page.getByRole("button", { name: "Bắt đầu làm bài" }).click();
    await expect(page).toHaveURL(/\/attempts\/[a-f0-9-]+/);

    // Exit fullscreen has no effect on non-fullscreen exam
    await page.evaluate(() => {
      (window as unknown as { __simulateExitFullscreen: () => void }).__simulateExitFullscreen();
    });

    await expect(page.getByText("Bạn đã rời khỏi chế độ toàn màn hình")).not.toBeVisible();
  });

  test("Test 5 — Refresh recovery preserves fullscreen enforcement", async ({ page }) => {
    await page.goto("/exams/de-cong-khai-nen-tang-so");
    await page.getByRole("button", { name: "Bắt đầu làm bài" }).click();
    await page.getByRole("button", { name: "Vào chế độ toàn màn hình" }).click();
    await expect(page).toHaveURL(/\/attempts\/[a-f0-9-]+/);

    // Reload page (browser exits fullscreen on reload)
    await page.reload();

    // Recovery fullscreen warning overlay is displayed
    await expect(page.getByText("Bạn đã rời khỏi chế độ toàn màn hình")).toBeVisible();
  });
});
