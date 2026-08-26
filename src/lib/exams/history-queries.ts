import { createClient } from "@/lib/supabase/server";

export type HistoryFilter = "all" | "submitted" | "time_expired" | "fullscreen_violation";
export type HistorySort = "newest" | "oldest" | "highest_score" | "lowest_score";

export interface StudentHistoryParams {
  page?: number;
  pageSize?: number;
  filter?: HistoryFilter;
  sort?: HistorySort;
}

export interface StudentHistoryItem {
  id: string;
  examId: string;
  examTitle: string;
  status: "in_progress" | "submitted" | "auto_submitted" | "expired";
  statusLabel: string;
  submitReason: string | null;
  submitReasonLabel: string;
  score: number | null;
  maxScore: number | null;
  correctAnswers: number | null;
  wrongAnswers: number | null;
  blankAnswers: number | null;
  totalQuestions: number;
  showScoreAfterSubmit: boolean;
  startedAt: string;
  submittedAt: string | null;
  formattedDate: string;
  durationMinutes: number;
  durationText: string;
}

export interface PaginatedStudentHistory {
  items: StudentHistoryItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface StudentStatistics {
  hasData: boolean;
  totalCompleted: number;
  avgScore: number | null;
  maxScore: number | null;
  totalQuestions: number;
  totalCorrect: number;
  correctRate: number;
}

export function formatSubmitReason(reason: string | null): string {
  switch (reason) {
    case "student_submit":
      return "Nộp bài";
    case "time_expired":
      return "Hết thời gian";
    case "fullscreen_violation":
      return "Vi phạm chế độ toàn màn hình";
    case "account_locked":
      return "Tài khoản bị khóa";
    case "system_recovery":
      return "Khôi phục hệ thống";
    default:
      return "Nộp bài";
  }
}

export function formatAttemptStatus(status: string): string {
  switch (status) {
    case "submitted":
      return "Đã nộp";
    case "auto_submitted":
      return "Tự động nộp";
    case "expired":
      return "Hết giờ";
    case "in_progress":
      return "Đang làm";
    default:
      return status;
  }
}

export function calculateDurationText(startedAt: string, submittedAt: string | null): { minutes: number; text: string } {
  if (!submittedAt) return { minutes: 0, text: "0 phút" };
  const start = new Date(startedAt).getTime();
  const end = new Date(submittedAt).getTime();
  const diffMs = Math.max(0, end - start);
  const diffSeconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(diffSeconds / 60);
  const seconds = diffSeconds % 60;

  if (minutes === 0) {
    return { minutes: 0, text: `${seconds} giây` };
  }
  if (seconds === 0) {
    return { minutes, text: `${minutes} phút` };
  }
  return { minutes, text: `${minutes} phút ${seconds} giây` };
}

export async function getStudentHistory(params: StudentHistoryParams = {}): Promise<PaginatedStudentHistory> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.max(1, Math.min(100, params.pageSize ?? 20));
  const filter = params.filter ?? "all";
  const sort = params.sort ?? "newest";

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData?.user) {
    return { items: [], total: 0, page, pageSize, totalPages: 1 };
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("exam_attempts")
    .select(
      `
      id,
      exam_id,
      status,
      submit_reason,
      score,
      max_score,
      correct_answers,
      wrong_answers,
      blank_answers,
      started_at,
      submitted_at,
      exams!inner (
        id,
        title,
        show_score_after_submit
      )
    `,
      { count: "exact" }
    )
    .eq("student_id", authData.user.id);

  // Filtering
  if (filter === "submitted") {
    query = query.eq("status", "submitted");
  } else if (filter === "time_expired") {
    query = query.eq("submit_reason", "time_expired");
  } else if (filter === "fullscreen_violation") {
    query = query.eq("submit_reason", "fullscreen_violation");
  }

  // Sorting
  switch (sort) {
    case "oldest":
      query = query.order("submitted_at", { ascending: true, nullsFirst: false });
      break;
    case "highest_score":
      query = query.order("score", { ascending: false, nullsFirst: false });
      break;
    case "lowest_score":
      query = query.order("score", { ascending: true, nullsFirst: false });
      break;
    case "newest":
    default:
      query = query.order("submitted_at", { ascending: false, nullsFirst: false });
      break;
  }

  query = query.range(from, to);

  const { data, count, error } = await query;

  if (error) {
    console.error("Không thể tải lịch sử làm bài:", error);
    throw new Error("LICH_SU_LOAD_FAILED");
  }

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const items: StudentHistoryItem[] = (data ?? []).map((row) => {
    const examData = Array.isArray(row.exams) ? row.exams[0] : row.exams;
    const examTitle = examData?.title ?? "Bài thi";
    const showScore = examData?.show_score_after_submit ?? true;
    const { minutes, text } = calculateDurationText(row.started_at, row.submitted_at);

    const correct = row.correct_answers ?? 0;
    const wrong = row.wrong_answers ?? 0;
    const blank = row.blank_answers ?? 0;
    const totalQuestions = correct + wrong + blank;

    const formattedDate = row.submitted_at
      ? new Date(row.submitted_at).toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "—";

    return {
      id: row.id,
      examId: row.exam_id,
      examTitle,
      status: row.status as StudentHistoryItem["status"],
      statusLabel: formatAttemptStatus(row.status),
      submitReason: row.submit_reason,
      submitReasonLabel: formatSubmitReason(row.submit_reason),
      score: showScore ? row.score : null,
      maxScore: showScore ? row.max_score : null,
      correctAnswers: showScore ? row.correct_answers : null,
      wrongAnswers: showScore ? row.wrong_answers : null,
      blankAnswers: showScore ? row.blank_answers : null,
      totalQuestions,
      showScoreAfterSubmit: showScore,
      startedAt: row.started_at,
      submittedAt: row.submitted_at,
      formattedDate,
      durationMinutes: minutes,
      durationText: text,
    };
  });

  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
  };
}

export function calculateNormalizedScore(
  score: number | null | undefined,
  maxScore: number | null | undefined
): number | null {
  if (
    typeof score !== "number" ||
    isNaN(score) ||
    typeof maxScore !== "number" ||
    isNaN(maxScore) ||
    maxScore <= 0
  ) {
    return null;
  }

  if (score > maxScore) {
    console.warn(`[Data Integrity Warning] Attempt score (${score}) exceeds max_score (${maxScore}).`);
  }

  return Number(((score / maxScore) * 10).toFixed(2));
}

export async function getStudentStatistics(): Promise<StudentStatistics> {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData?.user) {
    return {
      hasData: false,
      totalCompleted: 0,
      avgScore: null,
      maxScore: null,
      totalQuestions: 0,
      totalCorrect: 0,
      correctRate: 0,
    };
  }

  const { data, error } = await supabase
    .from("exam_attempts")
    .select("score, max_score, correct_answers, wrong_answers, blank_answers, status, submitted_at")
    .eq("student_id", authData.user.id)
    .in("status", ["submitted", "auto_submitted", "expired"])
    .not("submitted_at", "is", null);

  if (error || !data || data.length === 0) {
    return {
      hasData: false,
      totalCompleted: 0,
      avgScore: null,
      maxScore: null,
      totalQuestions: 0,
      totalCorrect: 0,
      correctRate: 0,
    };
  }

  const totalCompleted = data.length;
  let normalizedScoreSum = 0;
  let validScoreCount = 0;
  let maxNormalizedScoreVal: number | null = null;
  let totalQuestions = 0;
  let totalCorrect = 0;

  for (const item of data) {
    const normalizedScore = calculateNormalizedScore(item.score, item.max_score);
    if (normalizedScore !== null) {
      normalizedScoreSum += normalizedScore;
      validScoreCount++;
      if (maxNormalizedScoreVal === null || normalizedScore > maxNormalizedScoreVal) {
        maxNormalizedScoreVal = normalizedScore;
      }
    }

    const correct = item.correct_answers ?? 0;
    const wrong = item.wrong_answers ?? 0;
    const blank = item.blank_answers ?? 0;
    totalCorrect += correct;
    totalQuestions += correct + wrong + blank;
  }

  const avgScore =
    validScoreCount > 0
      ? Number((normalizedScoreSum / validScoreCount).toFixed(2))
      : null;
  const maxScore =
    maxNormalizedScoreVal !== null
      ? Number(maxNormalizedScoreVal.toFixed(2))
      : null;
  const correctRate =
    totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  return {
    hasData: totalCompleted > 0,
    totalCompleted,
    avgScore,
    maxScore,
    totalQuestions,
    totalCorrect,
    correctRate,
  };
}
