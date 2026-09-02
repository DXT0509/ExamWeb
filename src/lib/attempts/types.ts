import type { Database } from "@/types/database";

export type AttemptStatus = Database["public"]["Enums"]["attempt_status"];
export type SubmitReason = Database["public"]["Enums"]["submit_reason"];
export type ExamEventType = Database["public"]["Enums"]["exam_event_type"];

export interface AdminAttemptItem {
  attemptId: string;
  examId: string;
  examTitle: string;
  subjectName: string;
  studentId: string | null;
  studentName: string;
  studentEmail: string | null;
  isGuest: boolean;
  status: AttemptStatus;
  submitReason: SubmitReason | null;
  score: number | null;
  maxScore: number | null;
  startedAt: string;
  submittedAt: string | null;
}

export interface AdminAttemptListParams {
  q?: string;
  subjectId?: string;
  examId?: string;
  status?: string;
  submitReason?: string;
  page?: number;
  pageSize?: number;
}

export interface AdminAttemptListResult {
  items: AdminAttemptItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface QuestionOptionDetail {
  id: string;
  content: string;
  position: number;
  isCorrect: boolean;
}

export interface QuestionAnswerDetail {
  questionId: string;
  content: string;
  imagePath: string | null;
  explanation: string | null;
  score: number;
  position: number;
  questionType: string;
  correctAnswerRaw: string | null;
  tolerance?: number | null;
  selectedOptionId: string | null;
  selectedOptionContent: string | null;
  textAnswer: string | null;
  subAnswers: Record<string, boolean> | null;
  correctOptionId: string | null;
  correctOptionContent: string | null;
  isCorrect: boolean;
  options: QuestionOptionDetail[];
}

export interface ExamEventLog {
  id: string;
  eventType: ExamEventType;
  clientOccurredAt: string | null;
  serverOccurredAt: string;
  metadata: Record<string, unknown>;
  resolvedAt: string | null;
}

export interface AdminAttemptDetail {
  attemptId: string;
  examId: string;
  examTitle: string;
  subjectId: string;
  subjectName: string;
  categoryId: string | null;
  categoryName: string | null;
  studentId: string | null;
  studentName: string;
  studentEmail: string | null;
  isGuest: boolean;
  status: AttemptStatus;
  submitReason: SubmitReason | null;
  score: number | null;
  maxScore: number | null;
  correctAnswers: number | null;
  wrongAnswers: number | null;
  blankAnswers: number | null;
  startedAt: string;
  deadlineAt: string;
  submittedAt: string | null;
  finalizedAt: string | null;
  durationMinutes: number;
  questionsDetail: QuestionAnswerDetail[];
  eventsLog: ExamEventLog[];
}
