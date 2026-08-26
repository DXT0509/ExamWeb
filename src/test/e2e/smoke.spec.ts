import { expect, test } from "@playwright/test";

test.describe("Smoke E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("about:blank");
    await page.context().clearCookies();
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
  });

  test("Guest can browse the public exam catalog", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "ExamPrep", exact: true })).toBeVisible();
  await expect(page.getByText("Đề công khai nền tảng số")).toBeVisible();

  await page.getByRole("link", { name: "Xem đề thi" }).click();
  await expect(page).toHaveURL(/\/exams/, { timeout: 15000 });
  await expect(page.getByRole("heading", { name: "Thư viện đề thi" })).toBeVisible();

  await page.getByPlaceholder("Nhập tên đề thi").fill("nền tảng");
  await page.getByRole("button", { name: "Lọc đề thi" }).click();
  await expect(page.getByText("Đề công khai nền tảng số")).toBeVisible();

  await page.getByLabel("Môn học").selectOption("toan-hoc");
  await page.getByRole("button", { name: "Lọc đề thi" }).click();
  await expect(page).toHaveURL(/subject=toan-hoc/);

    await page.getByRole("link", { name: /Xem chi tiết/ }).first().click();
    await expect(page.getByRole("heading", { name: "Đề công khai nền tảng số" })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: "Bắt đầu làm bài" })).toBeVisible({ timeout: 10000 });
  });

  test("Guest cannot open a students-only exam directly without login", async ({ page }) => {
    await page.goto("/exams/de-danh-cho-hoc-vien-doc-hieu");
    await expect(page.getByRole("heading", { name: "Đề thi không khả dụng" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Bắt đầu làm bài" })).toHaveCount(0);
  });

  test("Student can see students-only exams", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[name="email"]').fill("student1@example.test");
    await page.locator('input[name="password"]').fill("LocalStudent123!");
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/student/, { timeout: 30000 });

    await page.goto("/exams");
    await expect(page.getByText("Đề công khai nền tảng số")).toBeVisible();
    await expect(page.getByText("Đề dành cho học viên đọc hiểu")).toBeVisible();

    await page.goto("/exams/de-danh-cho-hoc-vien-doc-hieu");
    await expect(page.getByRole("heading", { name: "Đề dành cho học viên đọc hiểu" })).toBeVisible();
  });
});
