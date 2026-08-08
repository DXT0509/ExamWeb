import type { AttemptSummary, ExamSummary } from "@/types/exam";

export const exams: ExamSummary[] = [
  {
    id: "exam-1",
    slug: "toan-tu-duy-co-ban",
    title: "Toán tư duy cơ bản",
    subject: "Toán",
    category: "Ôn tập THPT",
    durationMinutes: 45,
    questionCount: 30,
    access: "Guest",
    status: "published",
    featured: true,
  },
  {
    id: "exam-2",
    slug: "tieng-anh-doc-hieu",
    title: "Tiếng Anh đọc hiểu",
    subject: "Tiếng Anh",
    category: "Luyện kỹ năng",
    durationMinutes: 60,
    questionCount: 40,
    access: "Student",
    status: "published",
    featured: true,
  },
  {
    id: "exam-3",
    slug: "vat-ly-dien-hoc",
    title: "Vật lý điện học",
    subject: "Vật lý",
    category: "Chuyên đề",
    durationMinutes: 50,
    questionCount: 35,
    access: "Guest",
    status: "published",
  },
];

export const studentAttempts: AttemptSummary[] = [
  { id: "attempt-1", examTitle: "Toán tư duy cơ bản", status: "in_progress", answered: 12, total: 30 },
  { id: "attempt-2", examTitle: "Tiếng Anh đọc hiểu", status: "submitted", answered: 40, total: 40, score: 8.25 },
];

export const adminAttempts: AttemptSummary[] = [
  { id: "A-104", examTitle: "Vật lý điện học", status: "submitted", answered: 35, total: 35, score: 7.5 },
  { id: "A-105", examTitle: "Toán tư duy cơ bản", status: "in_progress", answered: 18, total: 30 },
];
