import { expect, test } from "@playwright/test";

test.describe("Phase 11 Guest Complete Journey & RBAC E2E Tests", () => {
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

  test("AT-GUEST-001: Guest browses public catalog, takes exam, submits and views result banner", async ({ page }) => {
    // 1. Guest visits homepage
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "ExamPrep", exact: true })).toBeVisible();

    // 2. Navigates to public exams catalog
    await page.getByRole("link", { name: "Xem đề thi" }).first().click();
    await expect(page).toHaveURL("/exams");
    await expect(page.getByRole("heading", { name: "Thư viện đề thi" })).toBeVisible();

    // 3. Opens public exam detail
    const publicExamCard = page.locator(".rounded-xl, .border, div").filter({ hasText: "Đề công khai nền tảng số" }).last();
    const examLink = publicExamCard.getByRole("link", { name: "Xem chi tiết" });
    if (await examLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await examLink.click();
    } else {
      await page.goto("/exams/de-cong-khai-nen-tang-so");
    }
    await expect(page).toHaveURL(/\/exams\/[a-z0-9-]+/);

    // 4. Starts exam
    const startBtn = page.getByRole("button", { name: "Bắt đầu làm bài" });
    await expect(startBtn).toBeVisible();
    await startBtn.click();

    // If Fullscreen Gate appears, enter fullscreen
    const gateBtn = page.getByRole("button", { name: "Vào chế độ toàn màn hình" });
    if (await gateBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await gateBtn.click();
    }

    // 5. Exam taking interface
    await expect(page).toHaveURL(/\/attempts\/[a-f0-9-]+/);
    await expect(page.getByText("Đang làm bài thi")).toBeVisible();

    // Answer first question
    await page.locator('input[type="radio"]').first().check();
    await expect(page.getByText("Đã lưu")).toBeVisible({ timeout: 5000 });

    // 6. Submit exam
    await page.getByRole("button", { name: "Nộp bài" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Xác nhận nộp bài" }).click();

    // 7. Result page verification
    await expect(page).toHaveURL(/\/attempts\/[a-f0-9-]+\/result/);
    await expect(page.getByRole("heading", { name: "Đề công khai nền tảng số" })).toBeVisible();
    await expect(page.getByText(/Bạn đang làm bài với tư cách Người dùng khách/i)).toBeVisible();
    await expect(page.getByRole("link", { name: "Đăng ký tài khoản" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Về thư viện đề thi" }).first()).toBeVisible();
  });

  test("AT-RBAC-001: Guest attempting to access protected student history is redirected to login", async ({ page }) => {
    await page.goto("/student/history");
    await expect(page).toHaveURL(/\/login\?next=%2Fstudent%2Fhistory|\/login/);
  });

  test("AT-RBAC-002: Guest attempting to access protected admin dashboard is redirected to login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin|\/login/);
  });
});
