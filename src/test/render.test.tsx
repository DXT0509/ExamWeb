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

vi.mock("@/lib/exams/history-queries", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/exams/history-queries")>()),
  getStudentStatistics: vi.fn(async () => ({
    hasData: true,
    totalCompleted: 1,
    avgScore: 8.5,
    maxScore: 8.5,
    totalQuestions: 10,
    totalCorrect: 8,
    correctRate: 80,
  })),
  getStudentHistory: vi.fn(async () => ({
    items: [],
    total: 0,
    page: 1,
    pageSize: 4,
    totalPages: 1,
  })),
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

vi.mock("@/lib/admin-dashboard/queries", () => ({
  getAdminDashboardData: vi.fn(async () => ({
    stats: {
      students: { total: 10, active: 9, locked: 1 },
      subjects: { total: 4 },
      exams: { total: 6, published: 4, draft: 2, closed: 0, archived: 0 },
      attempts: { total: 15, submitted: 12, auto_submitted: 1, completed: 13, in_progress: 2, expired: 0 },
    },
    recentAttempts: [
      {
        attemptId: "att-1",
        examId: "exam-1",
        examTitle: "Đề thi thử tốt nghiệp",
        subjectName: "Toán học",
        studentId: "student-1",
        studentName: "Nguyễn Văn A",
        studentEmail: "a@example.com",
        isGuest: false,
        status: "submitted",
        submitReason: "student_submit",
        score: 9.0,
        maxScore: 10.0,
        startedAt: "2026-08-01T08:00:00.000Z",
        submittedAt: "2026-08-01T08:45:00.000Z",
      },
    ],
    recentEvents: [
      {
        eventId: "ev-1",
        attemptId: "att-1",
        eventType: "fullscreen_exit",
        clientOccurredAt: null,
        serverOccurredAt: "2026-08-01T08:15:00.000Z",
        metadata: {},
        resolvedAt: null,
        examId: "exam-1",
        examTitle: "Đề thi thử tốt nghiệp",
        subjectName: "Toán học",
        studentId: "student-1",
        studentName: "Nguyễn Văn A",
        studentEmail: "a@example.com",
        isGuest: false,
      },
    ],
  })),
}));

import DocumentsPage from "@/app/(public)/documents/page";

vi.mock("@/lib/documents/queries", () => ({
  listPublicDocuments: vi.fn(async () => [
    {
      id: "doc-1",
      title: "Đề cương ôn tập Toán tư duy",
      slug: "de-cuong-on-tap-toan-tu-duy",
      description: "Mô tả đề cương",
      file_path: null,
      external_url: "https://example.test/doc.pdf",
      updated_at: "2026-08-02T00:00:00.000Z",
    },
  ]),
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

  it("renders public documents catalog page", async () => {
    render(await DocumentsPage({}));
    expect(screen.getByRole("heading", { name: "Tài liệu học tập" })).toBeInTheDocument();
    expect(screen.getByText("Đề cương ôn tập Toán tư duy")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Mở tài liệu" })).toHaveAttribute("href", "https://example.test/doc.pdf");
  });

  it("renders student dashboard content", async () => {
    render(await StudentDashboard());
    expect(screen.getByRole("heading", { name: "Tổng quan học sinh" })).toBeInTheDocument();
    expect(screen.getByText("Thống kê học tập")).toBeInTheDocument();
  });

  it("renders admin layout content", async () => {
    render(await AdminDashboard());
    expect(screen.getByRole("heading", { name: "Tổng quan hệ thống" })).toBeInTheDocument();
    expect(screen.getByText("Lượt thi gần đây")).toBeInTheDocument();
    expect(screen.getByText("Hoạt động & cảnh báo gần đây")).toBeInTheDocument();
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

