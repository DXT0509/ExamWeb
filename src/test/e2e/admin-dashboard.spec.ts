import { expect, test } from "@playwright/test";

test.describe("Phase 10 Step 3: Admin Dashboard Real Data & Overview E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("about:blank");
    await page.context().clearCookies();
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
  });

  test("Admin can view dashboard overview cards, recent attempts and alerts", async ({ page }) => {
    // 1. Admin login
    await page.goto("/login");
    await page.locator('input[name="email"]').fill("admin@example.test");
    await page.locator('input[name="password"]').fill("LocalAdmin123!");
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/admin/, { timeout: 15000 });

    // 2. Verify Dashboard Header
    await expect(page.getByRole("heading", { name: "Tổng quan hệ thống" })).toBeVisible({ timeout: 10000 });

    // 3. Verify Stat Cards
    await expect(page.getByText("Học sinh", { exact: true }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Môn học", { exact: true }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Đề thi", { exact: true }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Lượt thi", { exact: true }).first()).toBeVisible({ timeout: 10000 });

    // 4. Verify Recent Attempts section
    await expect(page.getByRole("heading", { name: "Lượt thi gần đây" })).toBeVisible({ timeout: 10000 });

    const detailLink = page.getByRole("link", { name: "Xem chi tiết" }).first();
    if (await detailLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await detailLink.click();
      await expect(page).toHaveURL(/\/admin\/attempts\/.+/, { timeout: 15000 });
      await expect(page.getByRole("heading", { name: "Chi tiết lượt thi" })).toBeVisible({ timeout: 10000 });

      // Go back to /admin
      await page.goto("/admin");
      await expect(page.getByRole("heading", { name: "Tổng quan hệ thống" })).toBeVisible({ timeout: 10000 });
    }

    // 5. Verify Recent Events / Alerts section
    await expect(page.getByRole("heading", { name: "Hoạt động & cảnh báo gần đây" })).toBeVisible({ timeout: 10000 });
  });

  test("Student cannot access Admin dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[name="email"]').fill("student1@example.test");
    await page.locator('input[name="password"]').fill("LocalStudent123!");
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/student/, { timeout: 30000 });

    // Attempt direct navigation to /admin
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/student/, { timeout: 15000 });
  });
});
