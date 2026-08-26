import type { AdminAttemptItem, ExamEventType } from "@/lib/attempts/types";

export interface AdminDashboardStudentStats {
  total: number;
  active: number;
  locked: number;
}

export interface AdminDashboardSubjectStats {
  total: number;
}

export interface AdminDashboardExamStats {
  total: number;
  published: number;
  draft: number;
  closed: number;
  archived: number;
}

export interface AdminDashboardAttemptStats {
  total: number;
  submitted: number;
  auto_submitted: number;
  completed: number;
  in_progress: number;
  expired: number;
}

export interface AdminDashboardStats {
  students: AdminDashboardStudentStats;
  subjects: AdminDashboardSubjectStats;
  exams: AdminDashboardExamStats;
  attempts: AdminDashboardAttemptStats;
}

export interface AdminDashboardEventItem {
  eventId: string;
  attemptId: string;
  eventType: ExamEventType;
  clientOccurredAt: string | null;
  serverOccurredAt: string;
  metadata: Record<string, unknown>;
  resolvedAt: string | null;
  examId: string;
  examTitle: string;
  subjectName: string;
  studentId: string | null;
  studentName: string;
  studentEmail: string | null;
  isGuest: boolean;
}

export interface AdminDashboardData {
  stats: AdminDashboardStats;
  recentAttempts: AdminAttemptItem[];
  recentEvents: AdminDashboardEventItem[];
}
