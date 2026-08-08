import type { Enums } from "@/types/database";

export type CatalogAccess = "guest" | "student";

export type ExamCatalogItem = {
  examId: string;
  slug: string;
  title: string;
  description: string | null;
  subjectId: string;
  subjectName: string;
  subjectSlug: string;
  categoryId: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  durationMinutes: number;
  totalScore: number;
  questionCount: number;
  allowGuestAttempt: boolean;
  fullscreenRequired: boolean;
  showScoreAfterSubmit: boolean;
  showAnswersAfterSubmit: boolean;
  showSolutionsAfterSubmit: boolean;
  accessType: Enums<"exam_access_type">;
  publishedAt: string | null;
};

export type CatalogFilterOption = {
  id: string;
  name: string;
  slug: string;
};

export type ExamCatalogParams = {
  q: string;
  subject: string;
  category: string;
  page: number;
  pageSize: number;
};

export type PaginatedExamCatalog = {
  items: ExamCatalogItem[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
