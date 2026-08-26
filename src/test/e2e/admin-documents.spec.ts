import { expect, test } from "@playwright/test";

test.describe("Documents Management E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("about:blank");
    await page.context().clearCookies();
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
  });

  test("Admin can browse, create with file upload, edit status via menu, and delete documents", async ({ page }) => {
    // 1. Login Admin
    await page.goto("/login");
    await page.locator('input[name="email"]').fill("admin@example.test");
    await page.locator('input[name="password"]').fill("LocalAdmin123!");
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/admin/, { timeout: 15000 });
    await expect(page.getByRole("heading", { name: "Tổng quan hệ thống" })).toBeVisible({ timeout: 10000 });

    // 2. Open /admin/documents
    await page.goto("/admin/documents");
    await expect(page.getByRole("heading", { name: "Quản lý tài liệu" })).toBeVisible();
    await expect(page.getByText("Đề cương ôn tập Toán tư duy")).toBeVisible();

    // 3. Create document with File upload
    const suffix = Date.now().toString().slice(-6);
    const title = `Tài liệu ôn thi E2E File ${suffix}`;
    const slug = `tai-lieu-on-thi-e2e-file-${suffix}`;

    await page.getByRole("button", { name: "Thêm tài liệu" }).click();
    const dialog = page.getByRole("dialog", { name: "Thêm tài liệu mới" });
    await expect(dialog).toBeVisible();

    await dialog.locator('input[name="title"]').fill(title);
    await dialog.locator('input[name="slug"]').fill(slug);
    await dialog.locator('textarea[name="description"]').fill("Mô tả tài liệu E2E tệp tin.");
    
    // Choose File source
    await dialog.locator('input[type="radio"][value="file"]').check();
    
    // Set file via input[type="file"]
    await dialog.locator('input[type="file"]').setInputFiles({
      name: "e2e-sample-doc.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("PDF Mock Content For Testing"),
    });

    // Check that selected file info is shown
    await expect(dialog.getByText("Tệp đã chọn: e2e-sample-doc.pdf")).toBeVisible();

    await dialog.locator('select[name="status"]').selectOption("published");

    await dialog.getByRole("button", { name: "Tạo tài liệu" }).click();
    await expect(dialog.getByText("Đã tạo tài liệu mới.")).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: "Đóng hộp thoại" }).click();
    await expect(page.getByRole("dialog", { name: "Thêm tài liệu mới" })).toHaveCount(0, { timeout: 10000 });

    // Filter specifically by created document title
    await page.locator('input[name="q"]').fill(title);
    await page.getByRole("button", { name: "Lọc" }).click();
    await expect(page.getByText(title)).toBeVisible({ timeout: 15000 });

    // 4. Update status via Dropdown Menu: click "Thao tác khác" -> "Bản nháp"
    const row = page.locator("tr", { hasText: title });
    await row.getByRole("button", { name: "Thao tác khác" }).click();
    await page.getByRole("menuitem", { name: "Bản nháp" }).click();
    await expect(page.getByText("Đã chuyển tài liệu về bản nháp.")).toBeVisible({ timeout: 10000 });
    await expect(row.getByRole("cell", { name: "Bản nháp" })).toBeVisible({ timeout: 10000 });

    // 5. Delete document via Dropdown Menu
    await row.getByRole("button", { name: "Thao tác khác" }).click();
    await page.getByRole("menuitem", { name: "Xóa" }).click();
    await expect(page.getByRole("dialog", { name: "Xóa tài liệu?" })).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Xác nhận xóa" }).click();

    // Verify removed from active list
    await expect(page.getByText(title)).toHaveCount(0, { timeout: 10000 });
  });

  test("Guest can view public documents and search", async ({ page }) => {
    await page.goto("/documents");
    await expect(page.getByRole("heading", { name: "Tài liệu học tập" })).toBeVisible();
    await expect(page.getByText("Đề cương ôn tập Toán tư duy")).toBeVisible();
    await expect(page.getByText("Cẩm nang hướng dẫn làm bài đọc hiểu")).toBeVisible();

    // Private and draft docs should not be visible
    await expect(page.getByText("Tài liệu nháp nội bộ")).toHaveCount(0);
    await expect(page.getByText("Tài liệu nội bộ riêng tư")).toHaveCount(0);
    await expect(page.getByText("Tài liệu lưu trữ cũ")).toHaveCount(0);

    // Search for a document
    await page.locator('input[name="q"]').fill("Toán tư duy");
    await page.getByRole("button", { name: "Tìm kiếm" }).click();
    await expect(page.getByText("Đề cương ôn tập Toán tư duy")).toBeVisible();
    await expect(page.getByText("Cẩm nang hướng dẫn làm bài đọc hiểu")).toHaveCount(0);

    // Verify external URL link
    const openDocLink = page.getByRole("link", { name: "Mở tài liệu" });
    await expect(openDocLink).toHaveAttribute("href", "https://example.test/docs/toan-tu-duy.pdf");
  });

  test("Route guard blocks Guest and Student from accessing admin documents", async ({ page }) => {
    // Guest direct access -> redirected to login
    await page.goto("/admin/documents");
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin/);

    // Student login -> try accessing /admin/documents -> redirected to /student
    await page.goto("/login");
    await page.locator('input[name="email"]').fill("student1@example.test");
    await page.locator('input[name="password"]').fill("LocalStudent123!");
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/student/, { timeout: 15000 });

    await page.goto("/admin/documents");
    await expect(page).toHaveURL(/\/student/, { timeout: 15000 });
  });
});

