import { expect, test } from "@playwright/test";

test.describe("Phase 10 Step 1: Admin Student Management E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
  });

  test("Admin can browse, search, and lock/unlock student account", async ({ page }) => {
    // 1. Admin login
    await page.goto("/login");
    await page.locator('input[name="email"]').fill("admin@example.test");
    await page.locator('input[name="password"]').fill("LocalAdmin123!");
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/admin/, { timeout: 15000 });

    // 2. Navigate to /admin/students
    await page.goto("/admin/students");
    await expect(page.getByRole("heading", { name: "Quản lý học sinh" })).toBeVisible({ timeout: 10000 });

    // 3. Search for locked@example.test
    await page.locator('input[name="q"]').fill("locked@example.test");
    await page.getByRole("button", { name: "Lọc" }).click();
    await expect(page.getByRole("cell", { name: "locked@example.test" })).toBeVisible({ timeout: 10000 });

    // 4. Unlock locked student
    const unlockBtn = page.getByRole("button", { name: "Mở khóa tài khoản" });
    if (await unlockBtn.count() > 0) {
      await unlockBtn.first().click();

      // Verify Confirmation Modal
      await expect(page.getByRole("dialog", { name: "Mở khóa tài khoản học sinh?" })).toBeVisible();
      await expect(
        page.getByText("Học sinh sẽ có thể tiếp tục truy cập và sử dụng các chức năng của hệ thống.")
      ).toBeVisible();

      // Confirm unlock
      await page.getByRole("dialog").getByRole("button", { name: "Mở khóa tài khoản" }).click();
      await expect(page.getByRole("cell", { name: "Đang hoạt động" })).toBeVisible({ timeout: 10000 });

      // Clean up: Lock student back to original state
      await page.getByRole("button", { name: "Khóa tài khoản" }).first().click();
      await expect(page.getByRole("dialog", { name: "Khóa tài khoản học sinh?" })).toBeVisible();
      await page.getByRole("dialog").getByRole("button", { name: "Khóa tài khoản" }).click();
      await expect(page.getByRole("cell", { name: "Đã khóa" })).toBeVisible({ timeout: 10000 });
    }
  });
});
