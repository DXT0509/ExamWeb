export type ExamAccess = "Guest" | "Student" | "Admin";

export type ExamSummary = {
  id: string;
  slug: string;
  title: string;
  subject: string;
  category: string;
  durationMinutes: number;
  questionCount: number;
  access: ExamAccess;
  status: "published" | "draft" | "closed";
  featured?: boolean;
};

export type AttemptSummary = {
  id: string;
  examTitle: string;
  status: "in_progress" | "submitted" | "auto_submitted";
  answered: number;
  total: number;
  score?: number;
};
