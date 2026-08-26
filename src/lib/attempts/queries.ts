import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require-user";
import type { SearchParamsRecord } from "@/lib/admin/types";
import type {
  AdminAttemptDetail,
  AdminAttemptListResult,
  AttemptStatus,
  ExamEventLog,
  QuestionAnswerDetail,
  SubmitReason,
} from "./types";

interface QuestionDbObject {
  question_id: string;
  content: string;
  image_path?: string | null;
  explanation?: string | null;
  score: number;
  position: number;
  selected_option_id?: string | null;
  selected_option_content?: string | null;
  correct_option_id?: string | null;
  correct_option_content?: string | null;
  is_correct?: boolean;
  options?: Array<{
    id: string;
    content: string;
    position: number;
    is_correct: boolean;
  }>;
}

interface EventDbObject {
  id: string;
  event_type: ExamEventLog["eventType"];
  client_occurred_at?: string | null;
  server_occurred_at: string;
  metadata?: Record<string, unknown>;
  resolved_at?: string | null;
}

export async function getAdminAttempts(
  searchParams: SearchParamsRecord
): Promise<AdminAttemptListResult> {
  await requireRole("admin", "/admin/attempts");

  const page = Math.max(1, Number(searchParams.page) || 1);
  const pageSize = Math.max(1, Math.min(100, Number(searchParams.pageSize) || 10));
  const q = typeof searchParams.q === "string" ? searchParams.q.trim() : undefined;
  const subjectId =
    typeof searchParams.subjectId === "string" && searchParams.subjectId !== "all"
      ? searchParams.subjectId
      : undefined;
  const examId =
    typeof searchParams.examId === "string" && searchParams.examId !== "all"
      ? searchParams.examId
      : undefined;
  const status =
    typeof searchParams.status === "string" && searchParams.status !== "all"
      ? searchParams.status
      : undefined;
  const submitReason =
    typeof searchParams.submitReason === "string" && searchParams.submitReason !== "all"
      ? searchParams.submitReason
      : undefined;

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_admin_attempts", {
    p_search: q,
    p_subject_id: subjectId,
    p_exam_id: examId,
    p_status: status,
    p_submit_reason: submitReason,
    p_page: page,
    p_page_size: pageSize,
  });

  if (error) {
    console.error("Error fetching admin attempts:", error);
    return { items: [], total: 0, page: 1, pageSize, totalPages: 0 };
  }

  const items = (data || []).map((row) => ({
    attemptId: row.attempt_id,
    examId: row.exam_id,
    examTitle: row.exam_title,
    subjectName: row.subject_name,
    studentId: row.student_id,
    studentName: row.student_name || "Khách",
    studentEmail: row.student_email,
    isGuest: row.is_guest,
    status: row.status,
    submitReason: row.submit_reason,
    score: row.score !== null ? Number(row.score) : null,
    maxScore: row.max_score !== null ? Number(row.max_score) : null,
    startedAt: row.started_at,
    submittedAt: row.submitted_at,
  }));

  const total = data && data.length > 0 ? Number(data[0]?.total_count ?? 0) : 0;
  const totalPages = Math.ceil(total / pageSize);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
  };
}

export async function getAdminAttemptDetail(
  attemptId: string
): Promise<AdminAttemptDetail | null> {
  await requireRole("admin", "/admin/attempts");

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_admin_attempt_detail", {
    p_attempt_id: attemptId,
  });

  if (error || !data) {
    console.error("Error fetching admin attempt detail:", error);
    return null;
  }

  const res = data as unknown as Record<string, unknown>;

  const rawQuestions = (res.questions_detail as QuestionDbObject[]) || [];
  const questionsDetail: QuestionAnswerDetail[] = rawQuestions.map((q) => ({
    questionId: String(q.question_id),
    content: String(q.content),
    imagePath: q.image_path ? String(q.image_path) : null,
    explanation: q.explanation ? String(q.explanation) : null,
    score: Number(q.score || 0),
    position: Number(q.position || 0),
    selectedOptionId: q.selected_option_id ? String(q.selected_option_id) : null,
    selectedOptionContent: q.selected_option_content ? String(q.selected_option_content) : null,
    correctOptionId: q.correct_option_id ? String(q.correct_option_id) : null,
    correctOptionContent: q.correct_option_content ? String(q.correct_option_content) : null,
    isCorrect: Boolean(q.is_correct),
    options: (q.options || []).map((o) => ({
      id: String(o.id),
      content: String(o.content),
      position: Number(o.position || 0),
      isCorrect: Boolean(o.is_correct),
    })),
  }));

  const rawEvents = (res.events_log as EventDbObject[]) || [];
  const eventsLog: ExamEventLog[] = rawEvents.map((ev) => ({
    id: String(ev.id),
    eventType: ev.event_type,
    clientOccurredAt: ev.client_occurred_at ? String(ev.client_occurred_at) : null,
    serverOccurredAt: String(ev.server_occurred_at),
    metadata: ev.metadata || {},
    resolvedAt: ev.resolved_at ? String(ev.resolved_at) : null,
  }));

  return {
    attemptId: String(res.attempt_id),
    examId: String(res.exam_id),
    examTitle: String(res.exam_title),
    subjectId: String(res.subject_id),
    subjectName: String(res.subject_name),
    categoryId: res.category_id ? String(res.category_id) : null,
    categoryName: res.category_name ? String(res.category_name) : null,
    studentId: res.student_id ? String(res.student_id) : null,
    studentName: String(res.student_name || "Khách"),
    studentEmail: res.student_email ? String(res.student_email) : null,
    isGuest: Boolean(res.is_guest),
    status: res.status as AttemptStatus,
    submitReason: (res.submit_reason as SubmitReason) || null,
    score: res.score !== null ? Number(res.score) : null,
    maxScore: res.max_score !== null ? Number(res.max_score) : null,
    correctAnswers: res.correct_answers !== null ? Number(res.correct_answers) : null,
    wrongAnswers: res.wrong_answers !== null ? Number(res.wrong_answers) : null,
    blankAnswers: res.blank_answers !== null ? Number(res.blank_answers) : null,
    startedAt: String(res.started_at),
    deadlineAt: String(res.deadline_at),
    submittedAt: res.submitted_at ? String(res.submitted_at) : null,
    finalizedAt: res.finalized_at ? String(res.finalized_at) : null,
    durationMinutes: Number(res.duration_minutes || 0),
    questionsDetail,
    eventsLog,
  };
}

export async function getAdminFilterOptions() {
  await requireRole("admin", "/admin/attempts");

  const supabase = await createClient();

  const [subjectsRes, examsRes] = await Promise.all([
    supabase
      .from("subjects")
      .select("id, name")
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("exams")
      .select("id, title")
      .is("deleted_at", null)
      .order("title"),
  ]);

  return {
    subjects: subjectsRes.data || [],
    exams: examsRes.data || [],
  };
}
