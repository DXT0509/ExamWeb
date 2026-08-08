import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HomePage from "@/app/(public)/page";
import NotFound from "@/app/not-found";
import AdminDashboard from "@/app/admin/page";
import AttemptPage from "@/app/attempts/[attemptId]/page";
import StudentDashboard from "@/app/student/page";
import { PublicHeader } from "@/components/navigation/public-header";
import type { ExamCatalogItem } from "@/lib/exams/catalog";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/attempts/demo",
}));

const catalogItem: ExamCatalogItem = {
  examId: "40000000-0000-0000-0000-000000000002",
  slug: "de-cong-khai-nen-tang-so",
  title: "Đề công khai nền tảng số",
  description: "Đề mẫu công khai.",
  subjectId: "20000000-0000-0000-0000-000000000001",
  subjectName: "Toán học",
  subjectSlug: "toan-hoc",
  categoryId: "30000000-0000-0000-0000-000000000001",
  categoryName: "HSA",
  categorySlug: "hsa",
  durationMinutes: 45,
  totalScore: 10,
  questionCount: 10,
  allowGuestAttempt: true,
  fullscreenRequired: false,
  showScoreAfterSubmit: true,
  showAnswersAfterSubmit: false,
  showSolutionsAfterSubmit: false,
  accessType: "public",
  publishedAt: "2026-08-02T00:00:00.000Z",
};

vi.mock("@/lib/exams/catalog", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/exams/catalog")>()),
  getFeaturedExams: vi.fn(async () => [catalogItem]),
  getStudentAvailableExams: vi.fn(async () => ({
    items: [catalogItem],
    count: 1,
    page: 1,
    pageSize: 6,
    totalPages: 1,
  })),
}));

vi.mock("@/lib/auth/get-current-profile", () => ({
  getCurrentProfile: vi.fn(async () => ({ id: "student", role: "student", status: "active", display_name: "Học sinh" })),
}));

vi.mock("@/lib/exams/attempts", () => ({
  getAttemptPayloadAction: vi.fn(async (attemptId: string) => ({
    success: true,
    payload: {
      attempt_id: attemptId,
      exam_id: "40000000-0000-0000-0000-000000000002",
      exam_title: "Đề công khai nền tảng số",
      exam_description: "Mô tả đề thi mẫu",
      duration_minutes: 45,
      total_score: 10,
      status: "in_progress",
      started_at: new Date().toISOString(),
      deadline_at: new Date(Date.now() + 3600000).toISOString(),
      submitted_at: null,
      server_now: new Date().toISOString(),
      sections: [
        {
          id: "sec1",
          title: "Phần 1",
          description: null,
          position: 1,
          questions: [
            {
              id: "q1",
              content: "Câu hỏi 1 mẫu?",
              image_path: null,
              score: 1,
              position: 1,
              options: [
                { id: "o1", content: "Phương án A", position: 1 },
                { id: "o2", content: "Phương án B", position: 2 },
              ],
            },
          ],
        },
      ],
      answers: [],
    },
  })),
}));

describe("rendering", () => {
  it("renders the public homepage", async () => {
    render(await HomePage());
    expect(screen.getByRole("heading", { name: "ExamPrep" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Xem đề thi" })).toHaveAttribute("href", "/exams");
  });

  it("renders public navigation links", () => {
    render(<PublicHeader />);
    expect(screen.getByRole("link", { name: "Trang chủ" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Đề thi" })).toHaveAttribute("href", "/exams");
    expect(screen.getByRole("link", { name: "Tài liệu" })).toHaveAttribute("href", "/documents");
  });

  it("renders student dashboard content", async () => {
    render(await StudentDashboard());
    expect(screen.getByRole("heading", { name: "Tổng quan học sinh" })).toBeInTheDocument();
    expect(screen.getByText("Bài đang làm")).toBeInTheDocument();
  });

  it("renders admin layout content", () => {
    render(<AdminDashboard />);
    expect(screen.getByRole("heading", { name: "Admin dashboard" })).toBeInTheDocument();
    expect(screen.getByText("Attempt gần đây")).toBeInTheDocument();
  });

  it("renders attempt page without public navigation", async () => {
    render(await AttemptPage({ params: Promise.resolve({ attemptId: "demo" }) }));
    expect(screen.getByText("Đề công khai nền tảng số")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Tài liệu" })).not.toBeInTheDocument();
  });

  it("renders 404 page", () => {
    render(<NotFound />);
    expect(screen.getByRole("heading", { name: "Không tìm thấy trang" })).toBeInTheDocument();
  });
});
