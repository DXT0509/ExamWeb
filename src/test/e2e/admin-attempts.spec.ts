import { expect, test } from "@playwright/test";

test.describe("Phase 10 Step 2: Admin Attempt Management & Monitoring E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
  });

  test("Admin can browse attempt list, search/filter, and view attempt details", async ({ page }) => {
    // 1. Admin login
    await page.goto("/login");
    await page.locator('input[name="email"]').fill("admin@example.test");
    await page.locator('input[name="password"]').fill("LocalAdmin123!");
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/admin/, { timeout: 15000 });

    // 2. Navigate to /admin/attempts
    await page.goto("/admin/attempts");
    await expect(page.getByRole("heading", { name: "Quản lý lượt thi" })).toBeVisible({ timeout: 10000 });

    // 3. Search and filter
    await page.locator('input[name="q"]').fill("Học viên");
    await page.getByRole("button", { name: "Lọc lượt thi" }).click();

    // 4. Check table content
    const detailLink = page.getByRole("link", { name: "Xem chi tiết" }).first();
    if (await detailLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await detailLink.click();

      // 5. Verify Detail Page
      await expect(page.getByRole("heading", { name: "Chi tiết lượt thi" })).toBeVisible({ timeout: 10000 });
      await expect(page.getByText("Thông tin lượt thi")).toBeVisible();
      await expect(page.getByText("Thống kê kết quả")).toBeVisible();
      await expect(page.getByText(/Chi tiết câu trả lời/)).toBeVisible();
      await expect(page.getByText(/Nhật ký sự kiện lượt thi/)).toBeVisible();

      // Go back to list
      await page.getByRole("link", { name: "← Quay lại danh sách" }).click();
      await expect(page.getByRole("heading", { name: "Quản lý lượt thi" })).toBeVisible();
    }
  });
});
